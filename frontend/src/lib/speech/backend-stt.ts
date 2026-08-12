/**
 * STT ① — MediaRecorder로 녹음해서 `POST /api/stt`에 올린다
 * (docs/request/frontend/stt-tts-integration.md · 백엔드 D-01)
 *
 * 흐름은 브라우저 인식과 다르다. **녹음 종료와 텍스트 도착 사이에 구간이 생긴다.**
 *
 *   start() ─ 녹음 ─ stop() ─ 업로드(최대 8초) ─ onFinal(text)
 *                              └ 이 구간이 화면의 "변환 중"이다
 *
 * ⚠️ **원본 오디오를 저장하지 않는다.** Blob을 만들어 바로 올리고 참조를 버린다.
 *    chunk 배열도 업로드 직후 비운다. (PRD 10.3)
 *
 * ⚠️ 결과는 한 회차에 **딱 한 번만** 올려보낸다. 브라우저 인식에서 같은 발화가
 *    두 번 제출돼 아이가 갇히는 사고가 났다. 원인은 종료 이벤트가 여러 번 온 것이고,
 *    여기서는 `stop()`을 두 번 부르거나 언마운트 뒤 업로드가 끝나는 경우가 같은
 *    모양이다. 그래서 회차 객체(`SttTake`)로 막는 구조를 그대로 가져왔다.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { errorCodeOf } from "@/lib/api/errors";
import { STT_TIMEOUT_MS, transcribeAudio } from "@/lib/api/speech";
import { useBrowserCapability } from "@/lib/speech/supported";
import type {
  ChildSpeech,
  ChildSpeechOptions,
  SttStatus,
} from "@/lib/speech/types";

/** 무음이 이만큼 이어지면 자동 종료 — screens.md C-4 */
const SILENCE_STOP_MS = 2000;
const DEFAULT_MAX_MS = 30_000;
/** 이 아래면 말한 게 없다고 본다. 헤더만 있는 빈 녹음을 올려 8초를 태울 이유가 없다. */
const MIN_AUDIO_BYTES = 1024;

const hasRecorder = () =>
  typeof window !== "undefined" &&
  typeof window.MediaRecorder !== "undefined" &&
  navigator.mediaDevices !== undefined;

/** 녹음 1회분. 인스턴스가 아니라 이 객체를 기준으로 판단한다. */
type SttTake = {
  delivered: boolean;
  abandoned: boolean;
};

export function useBackendStt(options: ChildSpeechOptions = {}): ChildSpeech {
  const {
    maxDurationMs = DEFAULT_MAX_MS,
    onTranscribeStart,
    onFinal,
    onError,
    enabled = true,
  } = options;

  const [status, setStatus] = useState<SttStatus>("idle");
  const supported = useBrowserCapability(hasRecorder);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const takeRef = useRef<SttTake | null>(null);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** 무음 감지용. 오디오 레벨을 보려면 분석 노드가 필요하다. */
  const audioCtxRef = useRef<AudioContext | null>(null);
  const levelTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const cb = useRef({ onTranscribeStart, onFinal, onError });
  useEffect(() => {
    cb.current = { onTranscribeStart, onFinal, onError };
  });

  const clearTimers = useCallback(() => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    if (maxTimer.current) clearTimeout(maxTimer.current);
    if (levelTimer.current) clearInterval(levelTimer.current);
    silenceTimer.current = null;
    maxTimer.current = null;
    levelTimer.current = null;
  }, []);

  /**
   * 마이크를 확실히 끈다.
   *
   * track을 살려 두면 브라우저 탭에 녹음 표시가 계속 뜬다. 아이 화면에서
   * "아직 듣고 있다"로 읽히므로 남겨 두면 안 된다.
   */
  const releaseMic = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    try {
      // onstop에서 업로드가 시작된다. 상태 전환도 거기서 한다.
      recorder.stop();
    } catch {
      // 이미 멈춘 상태면 무시한다.
    }
  }, [clearTimers]);

  const start = useCallback(() => {
    // 직전 회차를 확실히 버린다. 두 개가 겹치면 결과가 섞인다.
    if (takeRef.current) takeRef.current.abandoned = true;
    abortRef.current?.abort();
    clearTimers();
    releaseMic();

    const take: SttTake = { delivered: false, abandoned: false };
    takeRef.current = take;
    chunksRef.current = [];

    /** 결과 전달은 회차당 한 번이다. */
    const deliver = (text: string) => {
      if (take.abandoned || take.delivered) return;
      take.delivered = true;
      setStatus("idle");
      cb.current.onFinal?.(text);
    };

    const fail = (code: string) => {
      if (take.abandoned || take.delivered) return;
      take.delivered = true;
      setStatus("error");
      cb.current.onError?.(code);
    };

    void (async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (error) {
        // I-4 권한 거부와 I-2 인식 실패를 코드로 구분해 올린다.
        const name = error instanceof DOMException ? error.name : "unknown";
        fail(name === "NotAllowedError" ? "not-allowed" : "no-microphone");
        return;
      }
      // 기다리는 동안 다른 회차가 시작됐다면 이 마이크는 버린다.
      if (take.abandoned) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;

      let recorder: MediaRecorder;
      try {
        // 포맷을 지정하지 않는다. 브라우저 기본값을 백엔드가 그대로 받는다.
        recorder = new MediaRecorder(stream);
      } catch {
        releaseMic();
        fail("recorder-unavailable");
        return;
      }
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        clearTimers();
        const chunks = chunksRef.current;
        // 참조를 먼저 끊는다. 업로드가 실패해도 오디오가 남지 않는다.
        chunksRef.current = [];
        releaseMic();
        if (take.abandoned) return;

        const audio = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm",
        });

        // 말한 게 없으면 올리지 않는다. 빈 결과와 같은 처리(I-2)로 간다.
        if (audio.size < MIN_AUDIO_BYTES) {
          deliver("");
          return;
        }

        setStatus("transcribing");
        cb.current.onTranscribeStart?.();

        const controller = new AbortController();
        abortRef.current = controller;
        const budget = setTimeout(() => controller.abort(), STT_TIMEOUT_MS);

        transcribeAudio(audio, controller.signal)
          .then((text) => deliver(text))
          .catch((error) => {
            // 타임아웃·네트워크 모두 I-3 대상이다. 코드로 올려 화면이 판단한다.
            fail(errorCodeOf(error) === "TIMEOUT" ? "stt-timeout" : "stt-failed");
          })
          .finally(() => {
            clearTimeout(budget);
            if (abortRef.current === controller) abortRef.current = null;
          });
      };

      recorder.onerror = () => {
        releaseMic();
        fail("recorder-error");
      };

      try {
        recorder.start();
      } catch {
        releaseMic();
        fail("recorder-start-failed");
        return;
      }
      setStatus("recording");

      maxTimer.current = setTimeout(stop, maxDurationMs);
      watchSilence(stream, take, stop);
    })();

    /**
     * 무음 자동 종료. Web Speech는 이걸 알아서 해 줬지만 MediaRecorder는 안 한다.
     * 없으면 아이가 말을 끝내도 30초 동안 녹음이 계속돼 [보내기]를 눌러야 한다.
     *
     * 소리를 **분석만** 하고 어디에도 남기지 않는다.
     */
    function watchSilence(
      stream: MediaStream,
      take: SttTake,
      onSilent: () => void
    ) {
      let ctx: AudioContext;
      try {
        ctx = new AudioContext();
      } catch {
        // 분석을 못 하면 최대 시간까지 녹음한다. [보내기]로 끝낼 수 있다.
        return;
      }
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buffer = new Uint8Array(analyser.frequencyBinCount);

      let spoke = false;
      let quietSince = 0;

      levelTimer.current = setInterval(() => {
        if (take.abandoned || take.delivered) return;
        analyser.getByteFrequencyData(buffer);
        let sum = 0;
        for (const value of buffer) sum += value;
        const level = sum / buffer.length;

        // 말을 시작하기 전의 침묵으로 끊으면 안 된다. 한 번이라도 소리가 난 뒤부터 센다.
        if (level > 12) {
          spoke = true;
          quietSince = 0;
          return;
        }
        if (!spoke) return;
        if (quietSince === 0) quietSince = performance.now();
        else if (performance.now() - quietSince >= SILENCE_STOP_MS) onSilent();
      }, 120);
    }
  }, [clearTimers, maxDurationMs, releaseMic, stop]);

  useEffect(() => {
    return () => {
      clearTimers();
      // 언마운트 후 콜백이 불리면 사라진 화면에 dispatch가 날아간다.
      if (takeRef.current) takeRef.current.abandoned = true;
      abortRef.current?.abort();
      try {
        if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
      } catch {
        // 무시
      }
      chunksRef.current = [];
      releaseMic();
    };
  }, [clearTimers, releaseMic]);

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
    // 2안에는 interim result가 없다. 이 값이 항상 빈 문자열인 것이 계약이다.
    interimText: "",
    supported,
    start,
    stop,
  };
}
