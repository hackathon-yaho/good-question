/**
 * 음성 계층 입구 — 화면은 여기만 쓴다
 *
 * 두 구현을 **모두 호출하고 하나만 살린다.** 모드로 훅을 골라 부르면 서버 렌더와
 * 클라이언트 렌더에서 훅 순서가 어긋난다(`speech/mode.ts`의 경고 참조).
 * 꺼진 구현은 아무것도 하지 않는다 — 타이머도, 이벤트 리스너도 걸지 않는다.
 *
 * 화면 코드는 모드를 모른다. `useChildSpeech`와 `useCharacterVoice`만 보인다.
 */

"use client";

import { useBackendStt } from "@/lib/speech/backend-stt";
import { useBackendTts } from "@/lib/speech/backend-tts";
import { useBrowserStt } from "@/lib/speech/browser-stt";
import { useBrowserTts } from "@/lib/speech/browser-tts";
import { useSpeechMode } from "@/lib/speech/mode";
import type {
  CharacterVoice,
  ChildSpeech,
  ChildSpeechOptions,
} from "@/lib/speech/types";

export function useChildSpeech(options: ChildSpeechOptions = {}): ChildSpeech {
  const mode = useSpeechMode();
  const backend = useBackendStt({ ...options, enabled: mode === "backend" });
  const browser = useBrowserStt({ ...options, enabled: mode === "mock" });
  return mode === "backend" ? backend : browser;
}

export function useCharacterVoice(): CharacterVoice {
  const mode = useSpeechMode();
  const backend = useBackendTts({ enabled: mode === "backend" });
  const browser = useBrowserTts({ enabled: mode === "mock" });
  return mode === "backend" ? backend : browser;
}

export { useSpeechMode } from "@/lib/speech/mode";
export type {
  CharacterVoice,
  ChildSpeech,
  SpeakOptions,
  SttStatus,
  TtsRate,
  VoiceCue,
} from "@/lib/speech/types";
