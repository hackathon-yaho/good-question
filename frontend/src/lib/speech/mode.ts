/**
 * 음성 방식 전환 — docs/request/frontend/stt-tts-integration.md
 *
 * ── 2안(OpenAI)으로 확정됐다 ─────────────────────────────────────────
 * STT·TTS를 브라우저가 아니라 **백엔드**가 처리한다. MVP 1순위 기기가 iPad인데
 * iOS Safari에서 Web Speech API가 불안정하다. (PRD 9.3)
 *
 * ── 그런데 두 방식을 다 둔다 ────────────────────────────────────────
 * 백엔드의 `POST /api/stt`·`GET /api/tts`가 **아직 없다**
 * (backend/docs/work-items.md B-13~B-18 미완). 브라우저 경로를 지금 지워 버리면
 * 08-20 발표 시연에 **음성이 아예 없다.** 시연 기기는 노트북 Chrome이라
 * Web Speech가 동작하고, iPad가 필요한 시점은 주최측 10월 테스트다.
 *
 *   mock    (기본) 브라우저 Web Speech. 노트북 Chrome에서 지금 들린다
 *   backend        MediaRecorder + /api/stt + /api/tts. iPad 안전
 *
 * **인터페이스는 backend 쪽 계약으로 맞췄다.** 녹음→업로드→확인→제출의 3단 요청과
 * "변환 중 / 응답 대기" 구간 분리는 mock 모드에서도 그대로 흐른다. 그래야 백엔드가
 * 붙을 때 처음 실행되는 코드가 생기지 않는다.
 *
 * 백엔드가 두 엔드포인트를 올리면 `.env.local`에 `NEXT_PUBLIC_SPEECH_MODE=backend`를
 * 넣고, 시연이 끝나면 `browser-stt.ts`·`browser-tts.ts`와 이 파일의 분기를 지운다.
 * 그 시점에 요청 문서의 "SpeechRecognition·SpeechSynthesis 호출이 남아 있지 않다"가
 * 충족된다.
 */

"use client";

import { useSyncExternalStore } from "react";

export type SpeechMode = "mock" | "backend";

/** 빌드 시점에 박히는 값. 서버 렌더와 클라이언트 첫 렌더가 같아야 한다. */
export const BUILD_SPEECH_MODE: SpeechMode =
  process.env.NEXT_PUBLIC_SPEECH_MODE === "backend" ? "backend" : "mock";

/**
 * 개발 중에만 동작하는 런타임 전환 — `/play/demo?speech=backend`
 *
 * `NEXT_PUBLIC_*`은 번들에 박히므로 모드를 바꾸려면 dev 서버를 재시작해야 한다.
 * 백엔드 경로를 손으로 확인할 때마다 재시작하는 것은 비싸고, 검증 스위트가
 * 두 경로를 한 서버에서 확인할 방법도 필요하다.
 *
 * 프로덕션 빌드에서는 `process.env.NODE_ENV` 비교가 상수로 접혀 이 분기가 사라진다.
 */
function overrideFromUrl(): SpeechMode | null {
  if (process.env.NODE_ENV !== "development") return null;
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("speech");
  if (value === "backend" || value === "mock") return value;
  return null;
}

/** 한 번 정해지면 바뀌지 않는다. 구독할 것이 없다. */
const noopSubscribe = () => () => {};

/**
 * 지금 쓸 음성 방식.
 *
 * ⚠️ 이 값으로 **훅을 골라 부르면 안 된다.** 서버 렌더에서는 언제나 빌드 값이고
 *    클라이언트에서 쿼리로 달라질 수 있어 훅 순서가 어긋난다. 두 구현을 모두
 *    호출하고 `enabled`로 하나만 살리는 방식을 쓴다. (`speech/index.ts`)
 */
export function useSpeechMode(): SpeechMode {
  return useSyncExternalStore(
    noopSubscribe,
    () => overrideFromUrl() ?? BUILD_SPEECH_MODE,
    () => BUILD_SPEECH_MODE
  );
}
