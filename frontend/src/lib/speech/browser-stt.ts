/**
 * STT (mock 구현) — 브라우저 `SpeechRecognition`
 *
 * ⚠️ **이 파일은 임시다.** 2안(백엔드 Whisper)이 확정됐고 iOS Safari에서 이 API가
 *    불안정하다. 백엔드 `POST /api/stt`가 올라오면 `SPEECH_MODE=backend`로 바꾸고
 *    이 파일을 지운다. (`speech/mode.ts`의 설명 참조)
 *
 * 그때까지 이게 필요한 이유: 08-20 발표 시연이 노트북 Chrome이고, 지금 이걸 지우면
 * 백엔드가 올라올 때까지 음성이 아예 없다.
 *
 * **인터페이스는 백엔드 쪽 계약(`ChildSpeech`)에 맞췄다.** 이 API에는 없는 "변환 중"
 * 구간도 `onTranscribeStart`로 알린다. 화면이 두 모드에서 같은 길을 타야 한다.
 *
 * 원본 음성은 저장하지 않는다. 이 API는 애초에 오디오 버퍼를 노출하지 않으므로
 * 요건(PRD 10.3)을 구조적으로 지킨다.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useBrowserCapability } from "@/lib/speech/supported";

import {
  getSpeechRecognitionCtor,
  type ChildSpeech,
  type ChildSpeechOptions,
  type SpeechRecognitionLike,
  type SttStatus,
} from "@/lib/speech/types";

/** 무음이 이만큼 이어지면 자동 종료 — screens.md C-4 */
const SILENCE_STOP_MS = 2000;
/** 발화 최대 길이. C-4는 30초, D-5는 60초 */
const DEFAULT_MAX_MS = 30_000;

const hasRecognition = () => getSpeechRecognitionCtor() !== null;

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

export function useBrowserStt(options: ChildSpeechOptions = {}): ChildSpeech {
  const {
    maxDurationMs = DEFAULT_MAX_MS,
    onTranscribeStart,
    onInterim,
    onFinal,
    onError,
    enabled = true,
  } = options;

  const [status, setStatus] = useState<SttStatus>("idle");
  const [interimText, setInterimText] = useState("");
  const supported = useBrowserCapability(hasRecognition);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const takeRef = useRef<SttTake | null>(null);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 최신 콜백을 재구독 없이 쓰기 위한 ref. 렌더 중이 아니라 커밋 후에 갱신한다.
  const cb = useRef({ onTranscribeStart, onInterim, onFinal, onError });
  useEffect(() => {
    cb.current = { onTranscribeStart, onInterim, onFinal, onError };
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
    const take = takeRef.current;
    // 이미 결과를 보낸 회차에 다시 stop이 들어오면 "변환 중"으로 되돌리면 안 된다.
    if (take && !take.delivered && !take.abandoned) {
      setStatus("transcribing");
      cb.current.onTranscribeStart?.();
    }
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

    setInterimText("");

    const recognition = new Ctor();
    recognition.lang = "ko-KR";
    recognition.continuous = false;
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

      setInterimText(interim);
      cb.current.onInterim?.(`${take.final} ${interim}`.trim());

      // 말이 이어지는 동안 무음 타이머를 계속 미룬다.
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
      silenceTimer.current = setTimeout(stop, SILENCE_STOP_MS);
    };

    recognition.onerror = (event) => {
      if (take.abandoned) return;
      clearTimers();
      // aborted는 사용자가 그냥 말을 안 한 경우다. 에러로 취급하지 않는다.
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

  const noop = useCallback(() => {}, []);

  if (!enabled) {
    return {
      status: "idle",
      interimText: "",
      supported: false,
      start: noop,
      stop: noop,
    };
  }

  return {
    status,
    interimText,
    supported,
    start,
    stop,
  };
}
