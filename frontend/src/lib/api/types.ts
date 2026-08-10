/**
 * 서버 계약 타입 — docs/spec/api.md 3절
 *
 * 화면 명세 5장이 확정한 스키마를 그대로 옮긴다. 필드를 임의로 늘리지 않는다.
 * 스키마가 바뀌면 api.md를 먼저 고치고 여기를 맞춘다.
 */

import type { ResponseMode, SceneType, SessionStatus } from "@/lib/play-state";

export type SpeakerType = "child" | "character" | "system";

export type Message = {
  id: string;
  sceneId: string;
  speakerType: SpeakerType;
  turnOrder: number;
  text: string;
  createdAt: string;
};

/** 미션 노출 신호. 판단 주체는 백엔드다. 프론트는 표시만 한다. (작업 분장 3.7) */
export type MissionTrigger = {
  id: string;
  title: string;
  checklist: { label: string; element: string }[];
};

/** C-3 자막 밑줄 + C-9 단어 팝업 */
export type HighlightWord = { word: string; meaning: string };

/** GET /api/sessions/{sessionId} — api.md 3.4 */
export type SessionSnapshot = {
  sessionId: string;
  storyId: string;
  status: SessionStatus;
  currentSceneId: string;
  currentSceneOrder: number;
  /** 화면 단위 진행바 분모. DB의 scene_order(1~9)와 다르다. (Q-10) */
  sceneProgress: { current: number; total: number };
  turnCount: number;
  maxTurns: number;
  accumulatedElements: string[];
  messages: Message[];
  currentScene: SceneInfo;
};

export type SceneInfo = {
  sceneId: string;
  sceneOrder: number;
  sceneType: SceneType;
  /** intro / narrative 에서만 값이 있다. */
  sceneDescription: string | null;
  characterName: string | null;
  characterDisplayName: string | null;
  characterImageUrl: string | null;
  backgroundImageUrl: string | null;
  maxTurns: number | null;
  sceneClosed: boolean;
  missionRevealed: boolean;
};

/** POST /api/sessions/{sessionId}/messages 응답 — api.md 3.5 (화면 명세 5-1 확정) */
export type UtteranceResponse = {
  responseMode: ResponseMode;
  characterMessage: string;
  characterName: string;
  accumulatedElements: string[];
  turnCount: number;
  maxTurns: number;
  sceneEnded: boolean;
  nextSceneId: string | null;
  missionTriggered: MissionTrigger | null;
  highlightWords: HighlightWord[];
};

/** POST /api/sessions/{sessionId}/scenes/{sceneId}/complete — api.md 3.4 */
export type SceneCompleteResponse = {
  nextScene: (SceneInfo & { openingMessage: Message | null }) | null;
  /** 마지막 장면이 끝나 후속 활동으로 넘어가야 하면 true */
  postActivityReady: boolean;
};

/**
 * 프론트가 쓰는 서버 인터페이스.
 * 목(mock)과 실제 HTTP 클라이언트가 이 형태를 공유한다. (작업 분장 5장 권장)
 */
export type PlayApi = {
  getSession(sessionId: string): Promise<SessionSnapshot>;
  submitUtterance(
    sessionId: string,
    body: { text: string; sttRawText?: string }
  ): Promise<UtteranceResponse>;
  completeScene(
    sessionId: string,
    sceneId: string
  ): Promise<SceneCompleteResponse>;
};

/* ── 말하기 후 활동 — api.md 3.6 ─────────────────────────────────── */

/**
 * D-2 카드. `correctOrder`는 **내려오지 않는다.**
 * 정답 판정은 서버가 한다. 프론트는 정답 순서를 알지 못한다. (screens.md §0-2, PRD 8.11)
 */
export type ActivityCard = {
  id: string;
  text: string;
  imageUrl: string | null;
};

/** GET /api/sessions/{sessionId}/activity */
export type ActivitySnapshot = {
  /** 서버가 고정한 셔플 순서. 매 시도마다 다시 섞으면 아이가 혼란스럽다. */
  cards: ActivityCard[];
  attemptCount: number;
};

/** POST /api/sessions/{sessionId}/activity/order */
export type OrderResult = {
  isCorrect: boolean;
  attemptCount: number;
  /** 정답일 때만 채워진다. */
  retellingKeywords: string[] | null;
  /** 오답일 때 D-3 "힌트 보기"가 강조할 카드 1장 */
  hintCardId: string | null;
};

/** POST /api/sessions/{sessionId}/activity/retelling */
export type RetellingResult = {
  sessionStatus: SessionStatus;
  completedAt: string;
  /** D-7 통계 카드 3개. 점수·등급이 아니다. (PRD 10.1, screens.md D-7) */
  stats: {
    childUtteranceCount: number;
    characterCount: number;
    newWordCount: number;
  };
  /** 보호자 리포트(O-01) 구현 여부 */
  reportAvailable: boolean;
};

export type ActivityApi = {
  getActivity(sessionId: string): Promise<ActivitySnapshot>;
  submitOrder(
    sessionId: string,
    submittedOrder: string[]
  ): Promise<OrderResult>;
  submitRetelling(
    sessionId: string,
    body: { retellingText: string }
  ): Promise<RetellingResult>;
};
