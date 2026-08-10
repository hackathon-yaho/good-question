/**
 * STT — Web Speech API
 *
 * 2026-08-10에 1안(Web Speech API)으로 확정했다. 시연 기기가 노트북 Chrome이다.
 * (PRD 9.3)
 *
 * ⚠️ 주최측 10월 테스트는 태블릿 대상이고 iOS Safari에서 이 API가 불안정하다.
 *    그래서 **이 훅 하나만 갈아끼우면 Whisper로 옮길 수 있게** 인터페이스를 좁게 뒀다.
 *    화면 코드는 { start, stop, finalText, interimText } 만 쓴다.
 *
 * 원본 음성은 저장하지 않는다. 이 API는 애초에 오디오 버퍼를 노출하지 않으므로
 * 요건(PRD 10.3)을 구조적으로 지킨다.
 */

"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  getSpeechRecognitionCtor,
  type SpeechRecognitionLike,
} from "@/lib/speech/types";

/** 지원 여부는 바뀌지 않으므로 구독할 것이 없다. */
const noopSubscribe = () => () => {};

/** 무음이 이만큼 이어지면 자동 종료 — screens.md C-4 */
const SILENCE_STOP_MS = 2000;
/** 발화 최대 길이. C-4는 30초, D-5는 60초 */
const DEFAULT_MAX_MS = 30_000;

export type SttStatus = "idle" | "recording" | "stopping" | "error";

/**
 * 인식 1회분. 인스턴스가 아니라 이 객체를 기준으로 판단한다.
 *
 * 왜 필요한가: `end` 이벤트가 한 번만 온다는 보장이 없다. 이미 끝난 인스턴스에
 * stop()을 다시 부르거나 abort()로 끊으면 end가 또 온다. 그때마다 onFinal을 부르면
 * **같은 발화가 두 번 제출된다.** 실제로 그렇게 터졌다: 제출 직후 C-5가 되살아나고,
 * 뒤늦은 두 번째 응답이 이미 넘어간 장면을 덮어 아이가 영원히 갇혔다.
 */
type SttTake = {
  final: string;
  /** 결과를 이미 올려보낸 회차 */
  delivered: boolean;
  /** 새 인식이 시작되거나 언마운트되어 버려진 회차 */
  abandoned: boolean;
};

type Options = {
  /** 최대 녹음 시간(ms). C-4 30000, D-5 60000 */
  maxDurationMs?: number;
  /** 부분 전사가 갱신될 때마다 호출. D-5 키워드 실시간 점등에 쓴다. */
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  /** 인식 실패 — I-2로 보낸다 */
  onError?: (code: string) => void;
};

export function useSpeechRecognition(options: Options = {}) {
  const { maxDurationMs = DEFAULT_MAX_MS, onInterim, onFinal, onError } = options;

  const [status, setStatus] = useState<SttStatus>("idle");
  const [finalText, setFinalText] = useState("");
  const [interimText, setInterimText] = useState("");

  // SSR에서는 false, 클라이언트에서는 실제 지원 여부. 하이드레이션 불일치가 없다.
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => getSpeechRecognitionCtor() !== null,
    () => false
  );

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const takeRef = useRef<SttTake | null>(null);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 최신 콜백을 재구독 없이 쓰기 위한 ref. 렌더 중이 아니라 커밋 후에 갱신한다.
  const cb = useRef({ onInterim, onFinal, onError });
  useEffect(() => {
    cb.current = { onInterim, onFinal, onError };
  });

  const clearTimers = useCallback(() => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    if (maxTimer.current) clearTimeout(maxTimer.current);
    silenceTimer.current = null;
    maxTimer.current = null;
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    const recognition = recognitionRef.current;
    if (!recognition) return;
    setStatus("stopping");
    try {
      recognition.stop();
    } catch {
      // 이미 멈춘 상태면 무시한다.
    }
  }, [clearTimers]);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      cb.current.onError?.("not-supported");
      setStatus("error");
      return;
    }

    // 직전 인스턴스를 확실히 끊는다. 두 개가 동시에 돌면 결과가 섞인다.
    // 버린 회차의 end/error가 뒤늦게 와도 무시되도록 먼저 표시한다.
    if (takeRef.current) takeRef.current.abandoned = true;
    recognitionRef.current?.abort();
    clearTimers();

    const take: SttTake = { final: "", delivered: false, abandoned: false };
    takeRef.current = take;

    setFinalText("");
    setInterimText("");

    const recognition = new Ctor();
    recognition.lang = "ko-KR";
    recognition.continuous = false;
    // D-5 키워드 실시간 점등이 이 옵션에 달려 있다.
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setStatus("recording");

    recognition.onresult = (event) => {
      if (take.abandoned) return;
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          take.final = `${take.final}${transcript}`.trim();
        } else {
          interim += transcript;
        }
      }

      setFinalText(take.final);
      setInterimText(interim);
      cb.current.onInterim?.(`${take.final} ${interim}`.trim());

      // 말이 이어지는 동안 무음 타이머를 계속 미룬다.
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      silenceTimer.current = setTimeout(stop, SILENCE_STOP_MS);
    };

    recognition.onerror = (event) => {
      if (take.abandoned) return;
      clearTimers();
      // no-speech / aborted는 사용자가 그냥 말을 안 한 경우다. 에러로 취급하지 않는다.
      if (event.error === "aborted") return;
      setStatus("error");
      // 에러로 끝난 회차는 end에서 다시 전달하지 않는다.
      take.delivered = true;
      cb.current.onError?.(event.error);
    };

    recognition.onend = () => {
      if (take.abandoned) return;
      clearTimers();
      setInterimText("");
      setStatus("idle");
      // 한 회차의 결과는 딱 한 번만 올려보낸다. end가 두 번 와도 중복 제출되지 않는다.
      if (take.delivered) return;
      take.delivered = true;
      cb.current.onFinal?.(take.final);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      maxTimer.current = setTimeout(stop, maxDurationMs);
    } catch (error) {
      setStatus("error");
      cb.current.onError?.(
        error instanceof Error ? error.message : "start-failed"
      );
    }
  }, [clearTimers, maxDurationMs, stop]);

  useEffect(() => {
    return () => {
      clearTimers();
      // 언마운트 후 콜백이 불리면 이미 사라진 화면에 dispatch가 날아간다.
      if (takeRef.current) takeRef.current.abandoned = true;
      recognitionRef.current?.abort();
    };
  }, [clearTimers]);

  return { status, finalText, interimText, supported, start, stop };
}
