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
  /** POST /api/sessions — api.md 3.4. B-1 "오늘의 이야기", B-3·B-4에서 부른다. */
  createSession(body: {
    childId: string;
    storyId: string;
    restart?: boolean;
  }): Promise<SessionSnapshot>;
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

/* ── 인증·계정 — api.md 3.1 ──────────────────────────────────────── */

/** MVP 소셜 로그인은 카카오만이다. (PRD M-01, open-questions Q-02) */
export type AuthProvider = "kakao";

export type Parent = { id: string; name: string; email: string };

/** POST /api/auth/{provider} */
export type AuthResult = {
  accessToken: string;
  /** false → /onboarding/consent, true → /profiles. A-2 분기 판단용 확정 필드 */
  hasCompletedOnboarding: boolean;
  parent: Parent;
};

/* ── 아이 프로필 — api.md 3.2 ────────────────────────────────────── */

/**
 * A-3에서 받은 동의 값. A-4 제출 때 아이 정보와 **함께** 보낸다.
 * `child_consents`가 `child_id`를 요구하므로 A-3 시점에는 레코드를 만들 수 없다.
 */
export type ConsentValues = {
  termsOfService: boolean;
  privacyPolicy: boolean;
  childDataProcessing: boolean;
  marketing: boolean;
};

export type Child = {
  id: string;
  name: string;
  birthYear: number;
  /** 서버가 `현재 연도 - birthYear`로 계산한다. 만 나이가 아니다. (PRD I-11) */
  age: number;
  avatarId: string;
  /** false면 세션 시작 불가. 프론트는 동의 화면으로 유도한다. */
  consentGranted: boolean;
  /** A-5 "최근 활동" 상대 표기용. 활동이 없으면 null */
  lastActivityAt: string | null;
  registeredAt: string;
};

export type ChildListResult = {
  children: Child[];
  /** 최대 등록 인원. 프론트가 3을 하드코딩하지 않는다. (PRD I-09) */
  limit: number;
};

/* ── 홈 — api.md 3.3 ─────────────────────────────────────────────── */

export type HomeStory = {
  id: string;
  title: string;
  coverImageUrl: string | null;
  estimatedMinutes: number | null;
  topics: string[];
};

export type HomeInProgress = {
  sessionId: string;
  storyId: string;
  storyTitle: string;
  coverImageUrl: string | null;
  currentSceneOrder: number;
  /** 화면 단위(4구간) 진행바용. currentSceneOrder(1~9)와 분모가 다르다. (Q-10) */
  sceneProgress: { current: number; total: number };
  lastActivityAt: string;
};

/** GET /api/home?childId={id} */
export type HomeSnapshot = {
  child: { id: string; name: string; avatarId: string };
  /** 진행 중 세션이 없으면 null. 프론트는 그 자리를 빈 채로 두지 않는다. */
  inProgress: HomeInProgress | null;
  recommended: HomeStory[];
};

export type AccountApi = {
  signIn(
    provider: AuthProvider,
    body: { authorizationCode: string }
  ): Promise<AuthResult>;
  listChildren(): Promise<ChildListResult>;
  createChild(body: {
    name: string;
    birthYear: number;
    avatarId: string;
    consents: ConsentValues;
  }): Promise<Child>;
  getHome(childId: string): Promise<HomeSnapshot>;
};
