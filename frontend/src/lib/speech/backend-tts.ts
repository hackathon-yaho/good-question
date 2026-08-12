/**
 * TTS ③ — `GET /api/tts`로 받은 오디오를 재생한다
 * (docs/request/frontend/stt-tts-integration.md · 백엔드 D-05)
 *
 * ⚠️ 가장 위험한 지점은 브라우저 TTS와 같다. **재생 종료 감지가 실패하면 아이가
 *    영원히 기다린다.** (screens.md C-3 체크리스트) 그래서
 *      - 재생 실패·로딩 실패도 "종료"로 취급해 onDone을 부른다
 *      - 그래도 안 오는 경우를 대비해 예산 타이머를 함께 돌린다
 *
 * ⚠️ iOS Safari는 사용자 조작 없이 오디오 자동 재생을 막는다. 첫 탭에서
 *    `unlockAudio()`를 한 번 불러 <audio> 엘리먼트를 열어 둔다. 같은 엘리먼트를
 *    계속 재사용하는 이유가 이것이다 — 매번 새로 만들면 잠금이 다시 걸린다.
 *    **실기 확인이 필요하다.** (요청 문서 "TTS 재생" 절)
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ttsUrl } from "@/lib/api/speech";
import { useBrowserCapability } from "@/lib/speech/supported";
import type {
  CharacterVoice,
  SpeakOptions,
  TtsRate,
  VoiceCue,
} from "@/lib/speech/types";

const RATE_VALUE: Record<TtsRate, number> = {
  slow: 0.8,
  normal: 1,
  fast: 1.2,
};

/**
 * 오디오가 이 시간 안에 시작조차 못 하면 포기하고 다음으로 넘긴다.
 *
 * 고정 대사는 프리워밍되어 즉시 오지만(백엔드 B-18) LLM 생성 대사는 만들어야 한다.
 * 응답 예산 10초와 별개로 ③은 말풍선이 이미 떠 있는 상태라 조금 더 기다려도 된다.
 */
const LOAD_BUDGET_MS = 12_000;

const hasAudio = () => typeof window !== "undefined" && "Audio" in window;

/** 받아 둘 오디오 개수. 한 장면의 대사가 다 들어갈 만큼이면 충분하다. */
const MAX_CACHED = 8;

export function useBackendTts(
  { enabled = true }: { enabled?: boolean } = {}
): CharacterVoice {
  const [speaking, setSpeaking] = useState(false);
  const supported = useBrowserCapability(hasAudio);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const doneRef = useRef<(() => void) | null>(null);
  const settledRef = useRef(true);
  const budgetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * 재생 회차. 새 재생을 시작하면 직전 오디오의 `ended`·`error`가 뒤늦게 올 수 있다.
   * 그걸 그대로 처리하면 새 대사가 시작하자마자 끝난 것으로 취급된다.
   */
  const genRef = useRef(0);

  /**
   * 받아 둔 오디오. 키는 messageId(없으면 텍스트), 값은 blob URL이다.
   *
   * 같은 대사를 다시 들려줄 때 재요청하지 않기 위한 것이다. (요청 문서 "다시 듣기")
   * 오래된 것은 버린다 — 한 세션에 대사가 계속 늘어나므로 무한히 들고 있을 이유가 없다.
   */
  const cacheRef = useRef(new Map<string, string>());

  const element = useCallback((): HTMLAudioElement | null => {
    if (typeof window === "undefined") return null;
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "auto";
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  const settle = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    if (budgetTimer.current) clearTimeout(budgetTimer.current);
    budgetTimer.current = null;
    setSpeaking(false);
    const done = doneRef.current;
    doneRef.current = null;
    done?.();
  }, []);

  const cancel = useCallback(() => {
    genRef.current += 1;
    if (budgetTimer.current) clearTimeout(budgetTimer.current);
    budgetTimer.current = null;
    settledRef.current = true;
    doneRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      // src를 비우지 않으면 일시정지 후에도 버퍼링이 계속된다.
      audio.removeAttribute("src");
      audio.load();
    }
    setSpeaking(false);
  }, []);

  /**
   * 오디오를 받아 blob URL로 만든다.
   *
   * ⚠️ **`<audio src="{백엔드}/api/tts">`로는 안 된다.** 프론트(3000)와 백엔드(8080)가
   *    다른 오리진이고 `GET /api/tts`는 JWT 쿠키 인증이다. 엘리먼트가 직접 받는
   *    요청에는 쿠키가 실리지 않아 401이 나고 음성이 아예 없다.
   *    fetch로 `credentials: "include"`를 실어 받아야 한다.
   *
   * 부수 효과로 "다시 듣기"가 재요청 없이 동작한다 — blob이 이미 손에 있다.
   */
  const loadAudio = useCallback(async (cue: VoiceCue): Promise<string> => {
    const key = cue.messageId ?? cue.text;
    const cache = cacheRef.current;
    const hit = cache.get(key);
    if (hit) return hit;

    const response = await fetch(ttsUrl(cue), { credentials: "include" });
    if (!response.ok) throw new Error(`tts ${response.status}`);
    const url = URL.createObjectURL(await response.blob());

    // 가장 오래된 것부터 버린다. Map은 삽입 순서를 지킨다.
    cache.set(key, url);
    while (cache.size > MAX_CACHED) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      const stale = cache.get(oldest);
      cache.delete(oldest);
      if (stale) URL.revokeObjectURL(stale);
    }
    return url;
  }, []);

  const speak = useCallback(
    (cue: VoiceCue, options: SpeakOptions = {}) => {
      const { rate = "normal", volume = 1, onDone } = options;
      const audio = element();

      if (!audio || !cue.text.trim()) {
        // 재생할 수 없어도 흐름은 멈추지 않는다. 텍스트는 이미 화면에 있다.
        onDone?.();
        return;
      }

      genRef.current += 1;
      const gen = genRef.current;
      const settleThis = () => {
        if (genRef.current !== gen) return;
        settle();
      };

      if (budgetTimer.current) clearTimeout(budgetTimer.current);
      doneRef.current = onDone ?? null;
      settledRef.current = false;

      audio.pause();
      audio.playbackRate = RATE_VALUE[rate];
      audio.volume = Math.min(Math.max(volume, 0), 1);
      audio.onended = settleThis;
      // 재생 실패도 종료로 본다. 아이를 기다리게 하지 않는 것이 우선이다.
      audio.onerror = settleThis;

      setSpeaking(true);

      // 예산 타이머를 요청보다 먼저 걸어 둔다. 어디서 실패해도 흐름이 멈추지 않는다.
      budgetTimer.current = setTimeout(settleThis, LOAD_BUDGET_MS);

      void loadAudio(cue)
        .then((url) => {
          // 받는 동안 다른 대사가 시작됐으면 이건 버린다.
          if (genRef.current !== gen) return;
          audio.src = url;
          return audio.play();
        })
        .catch(() => {
          // 받지 못했거나 자동 재생이 막혔다. 텍스트는 보이므로 넘어간다.
          settleThis();
        });
    },
    [element, loadAudio, settle]
  );

  /**
   * iOS 자동 재생 잠금 해제. **사용자 조작 핸들러 안에서 동기적으로** 불려야 한다.
   *
   * 아주 짧은 무음을 재생해 엘리먼트를 "사용자가 재생시킨 것"으로 만든다.
   * 그 뒤부터는 같은 엘리먼트에 src를 갈아끼우는 재생이 허용된다.
   * 매번 `new Audio()`를 만들면 이 잠금이 다시 걸리므로 엘리먼트를 재사용한다.
   */
  const unlock = useCallback(() => {
    const audio = element();
    if (!audio || audio.dataset.unlocked === "1") return;
    audio.dataset.unlocked = "1";
    // 44바이트 무음 WAV. 네트워크를 타지 않아 조작 컨텍스트 안에서 끝난다.
    audio.src =
      "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=";
    audio.muted = true;
    void audio
      .play()
      .then(() => {
        audio.pause();
        audio.muted = false;
      })
      .catch(() => {
        // 열지 못했다. 그래도 흐름은 막지 않는다 — 첫 대사가 무음일 수 있고,
        // "다시 듣기"가 아이 조작이라 그때는 반드시 들린다.
        audio.muted = false;
      });
  }, [element]);

  useEffect(() => cancel, [cancel]);

  // 화면을 떠날 때 blob을 풀어 준다. 안 풀면 탭이 살아 있는 동안 메모리에 남는다.
  useEffect(() => {
    const cache = cacheRef.current;
    return () => {
      cache.forEach((url) => URL.revokeObjectURL(url));
      cache.clear();
    };
  }, []);

  const noop = useCallback(() => {}, []);

  if (!enabled) {
    return {
      speak: noop,
      cancel: noop,
      speaking: false,
      supported: false,
      unlock: noop,
    };
  }

  return {
    speak,
    cancel,
    speaking,
    // <audio>는 어디서나 있다. 못 쓰는 경우는 재생 차단이고, 그건 speak가 처리한다.
    supported,
    unlock,
  };
}
