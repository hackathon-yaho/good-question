/**
 * TTS — Web Speech API SpeechSynthesis
 *
 * 캐릭터 음성은 제공되는 음성 파일이 아니라 TTS를 쓴다. (PRD F-04, 주최측 확정)
 * 자동 재생하고, 다시 듣기 버튼을 별도로 제공한다. (작업 분장 2.2)
 *
 * ⚠️ 가장 위험한 지점: **재생 종료 감지가 실패하면 아이가 영원히 기다린다.**
 *    (screens.md C-3 체크리스트) onend가 안 오는 브라우저 버그가 실제로 있어서
 *    글자 수 기반 폴백 타이머를 함께 돌린다.
 *
 * TTS가 아예 실패해도 텍스트는 보이고 다음 상태로 넘어가야 한다. 그래서
 * 실패도 "종료"로 취급해 onDone을 호출한다.
 */

"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

/** 지원 여부는 바뀌지 않으므로 구독할 것이 없다. */
const noopSubscribe = () => () => {};

/** 한국어 대략 분당 320자 기준 + 여유 2.5초 */
function estimateDurationMs(text: string, rate: number): number {
  const perChar = 60_000 / 320 / Math.max(rate, 0.1);
  return text.length * perChar + 2500;
}

export type TtsRate = "slow" | "normal" | "fast";

const RATE_VALUE: Record<TtsRate, number> = {
  slow: 0.8,
  normal: 1,
  fast: 1.2,
};

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);

  const supported = useSyncExternalStore(
    noopSubscribe,
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    () => false
  );

  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef<(() => void) | null>(null);
  const settledRef = useRef(true);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  /**
   * 발화 회차. cancel()은 직전 utterance의 `end`를 발생시키므로, 새 발화를
   * 시작할 때 그 end가 뒤늦게 도착해 **새 발화를 즉시 끝난 것으로 처리한다.**
   * 그러면 대사가 잘리고 아이 차례로 곧장 넘어간다. 회차로 걸러낸다.
   */
  const genRef = useRef(0);

  // Chrome은 getVoices()가 처음 호출에서 빈 배열을 준다. voiceschanged 이후에 채워진다.
  // 이걸 놓치면 한국어 음성을 못 찾고 기본 음성으로 읽는다.
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const load = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);

  /** onend와 폴백 타이머 중 먼저 온 쪽만 처리한다. */
  const settle = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    fallbackTimer.current = null;
    setSpeaking(false);
    const done = doneRef.current;
    doneRef.current = null;
    done?.();
  }, []);

  const cancel = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    genRef.current += 1;
    window.speechSynthesis.cancel();
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    fallbackTimer.current = null;
    settledRef.current = true;
    doneRef.current = null;
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    (
      text: string,
      opts: { rate?: TtsRate; volume?: number; onDone?: () => void } = {}
    ) => {
      const { rate = "normal", volume = 1, onDone } = opts;

      if (
        typeof window === "undefined" ||
        !("speechSynthesis" in window) ||
        !text.trim()
      ) {
        // TTS를 못 쓰더라도 흐름은 멈추지 않는다.
        onDone?.();
        return;
      }

      // 회차를 먼저 올린다. 이 뒤에 도착하는 직전 utterance의 end는 무효가 된다.
      genRef.current += 1;
      const gen = genRef.current;

      window.speechSynthesis.cancel();
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);

      doneRef.current = onDone ?? null;
      settledRef.current = false;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ko-KR";
      utterance.rate = RATE_VALUE[rate];
      utterance.volume = volume;

      // 음성 선택은 실패해도 무시한다. 기본 음성으로 읽으면 되고,
      // 여기서 예외가 새면 speak 전체가 죽어 아이가 영원히 기다린다.
      try {
        const voices = voicesRef.current.length
          ? voicesRef.current
          : window.speechSynthesis.getVoices();
        const koVoice = voices.find((voice) => voice.lang?.startsWith("ko"));
        if (koVoice) utterance.voice = koVoice;
      } catch {
        // 기본 음성 사용
      }

      const settleThis = () => {
        if (genRef.current !== gen) return;
        settle();
      };

      utterance.onend = settleThis;
      // 재생 실패도 "종료"로 본다. 아이를 기다리게 하지 않는 것이 우선이다.
      utterance.onerror = settleThis;

      setSpeaking(true);

      // 폴백 타이머를 speak보다 먼저 걸어둔다. speak가 던져도 흐름이 멈추지 않는다.
      fallbackTimer.current = setTimeout(
        settleThis,
        estimateDurationMs(text, RATE_VALUE[rate])
      );

      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        // 재생을 시작조차 못 했다. 텍스트는 이미 화면에 있으니 바로 다음으로 넘긴다.
        settleThis();
      }
    },
    [settle]
  );

  useEffect(() => cancel, [cancel]);

  return { speak, cancel, speaking, supported };
}
