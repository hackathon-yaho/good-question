/**
 * 이야기 진행 · 후속 활동 상태 정의 — docs/spec/screens.md §C 공통, §D 공통
 *
 * C-1~C-7은 /play/{sessionId} 단일 페이지의 "상태"다. 페이지 이동이 없다.
 * D-1~D-7은 /activity/{sessionId} 단일 페이지의 "단계"다.
 * 페이지를 새로 그리면 TTS가 끊기고 애니메이션이 튄다.
 */

export const PlayState = {
  INTRO: "INTRO", // C-1 도입 전체화면
  SCENE_NARRATION: "SCENE_NARRATION", // C-2 전개 재생 중
  CHARACTER_SPEAKING: "CHARACTER_SPEAKING", // C-3 캐릭터 발화 중
  CHILD_TURN: "CHILD_TURN", // C-4 내 차례
  TRANSCRIBING: "TRANSCRIBING", // C-4 → C-5 중간
  CONFIRM: "CONFIRM", // C-5 STT 결과 확인
  THINKING: "THINKING", // C-6 분석 중
  GUIDED: "GUIDED", // C-7 유도 질문
  SCENE_TRANSITION: "SCENE_TRANSITION", // C-12 장면 전환
  MIC_ERROR: "MIC_ERROR", // I-2 인식 실패
} as const;

export type PlayState = (typeof PlayState)[keyof typeof PlayState];

export const ActivityStep = {
  INTRO: "INTRO", // D-1
  CARD_ORDERING: "CARD_ORDERING", // D-2
  FEEDBACK: "FEEDBACK", // D-3 (D-2 위 모달)
  KEYWORDS: "KEYWORDS", // D-4
  RETELLING: "RETELLING", // D-5
  REVIEW: "REVIEW", // D-6
  COMPLETE: "COMPLETE", // D-7
} as const;

export type ActivityStep = (typeof ActivityStep)[keyof typeof ActivityStep];

/** 서버가 확정해 내려주는 진행 모드. 프론트가 판단하지 않는다. (§0-2) */
export type ResponseMode = "NORMAL" | "GUIDED" | "CLOSING";

/**
 * 서버 응답 → 화면 상태 매핑 — §C 공통
 *
 * GUIDED도 결국 캐릭터가 말하는 상태이므로 C-3과 UI 구조는 같다.
 * 차이는 캐릭터 표정 변화 + 사고 요소 별 뱃지 노출뿐이다.
 * 컴포넌트를 분리하지 말고 prop으로 구분한다.
 */
export function toPlayState(mode: ResponseMode): PlayState {
  switch (mode) {
    case "NORMAL":
      return PlayState.CHARACTER_SPEAKING;
    case "GUIDED":
      return PlayState.GUIDED;
    case "CLOSING":
      return PlayState.SCENE_TRANSITION;
  }
}

/** 캐릭터가 말하고 있는 상태인지. C-3과 C-7을 한 컴포넌트로 다루기 위한 판별. */
export function isCharacterTurn(state: PlayState): boolean {
  return (
    state === PlayState.CHARACTER_SPEAKING || state === PlayState.GUIDED
  );
}

/** 마이크를 활성화해도 되는 상태인지.
 *  캐릭터 발화 중에 켜면 캐릭터 음성이 녹음된다. (작업 분장 2.3) */
export function isMicAllowed(state: PlayState): boolean {
  return state === PlayState.CHILD_TURN || state === PlayState.TRANSCRIBING;
}

/** 장면 유형 — PRD 8.7 story_scenes.scene_type */
export type SceneType = "intro" | "narrative" | "dialogue";

/** 세션 진행 상태 — PRD 8.8 story_sessions.status */
export type SessionStatus =
  | "in_progress"
  | "post_activity"
  | "completed"
  | "stopped";
