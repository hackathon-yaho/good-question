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
  nextScene:
    | (SceneInfo & {
        openingMessage: Message | null;
        /**
         * 첫 대사의 밑줄 단어. C-3에서 탭하면 C-9가 열린다.
         *
         * 🟡 api.md 3.4의 이 엔드포인트는 아직 초안(⚪)이다. 첫 대사에 밑줄이 없으면
         *    단어장으로 갈 통로가 닫히므로 프론트에서 필요한 필드로 제안한다.
         */
        highlightWords: HighlightWord[];
      })
    | null;
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

export type Parent = { id: string; name: string; email: string | null };

/**
 * ⚠️ `POST /api/auth/{provider}`(프론트가 인가 코드를 전달하는 원안)는 **폐기됐다.**
 * 백엔드 리다이렉트 방식으로 바뀌어 프론트는 토큰을 다루지 않는다.
 * 인증 타입은 `lib/api/auth.ts`에 있다. (백엔드 D-18)
 */

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

/* ── 이야기 탐색 — api.md 3.3 ─────────────────────────────────────── */

export type StoryListItem = {
  id: string;
  title: string;
  summary: string;
  coverImageUrl: string | null;
  estimatedMinutes: number | null;
  difficulty: string | null;
  topics: string[];
  /** 이 아이의 세션 상태. B-2 배지에 쓴다. childId가 필요한 이유다. */
  sessionStatus: SessionStatus | null;
};

export type StoryListResult = {
  stories: StoryListItem[];
  /** 필터 칩. `stories.topics` distinct */
  availableTopics: string[];
};

export type StoryCharacter = {
  name: string;
  displayName: string;
  imageUrl: string | null;
};

/** B-3 진행 중 세션. 있으면 프론트가 B-4 모달을 띄운다. */
export type ExistingSession = {
  sessionId: string;
  currentSceneOrder: number;
  sceneProgress: { current: number; total: number };
  status: SessionStatus;
};

export type StoryDetail = {
  id: string;
  title: string;
  summary: string;
  coverImageUrl: string | null;
  estimatedMinutes: number | null;
  difficulty: string | null;
  topics: string[];
  /** 도입 장면의 scene_description */
  intro: string;
  /** 이야기 단위 고정 문구. conflict에서 뽑는 게 아니다. (PRD F-03, Q-03) */
  situation: string;
  childRole: string;
  characters: StoryCharacter[];
  existingSession: ExistingSession | null;
  /** false면 세션을 시작할 수 없다. 동의 화면으로 유도한다. */
  consentGranted: boolean;
};

/* ── 단어장 — 선택 요건 A-02 (Q-06) ──────────────────────────────── */

export type WordEntry = {
  id: string;
  word: string;
  /** 아이가 읽을 쉬운 뜻 */
  meaning: string;
  storyId: string;
  storyTitle: string;
  /** "장면 N에서 만났어요" 표기용 — 화면 단위 인덱스 */
  sceneIndex: number;
  /** "이야기 속에서는" 카드에 넣을 원문. 없으면 null */
  contextSentence: string | null;
  liked: boolean;
  savedAt: string;
  /** E-1 "새 단어" 칩 — 최근에 담은 것 */
  isNew: boolean;
};

/** E-1 필터 — api.md §3.7: `all` / `liked` / `story:{storyId}` */
export type WordbookFilter = "all" | "liked" | `story:${string}`;

export type WordbookResult = {
  words: WordEntry[];
  total: number;
  /** 이야기별 필터 칩 */
  storyFilters: { storyId: string; title: string }[];
};

/* ── 마이페이지 (F-1) ────────────────────────────────────────────── */

export type MypageSnapshot = {
  child: { id: string; name: string; avatarId: string; age: number };
  /** 점수·등급이 아니라 활동량이다. (PRD 10.1) */
  stats: {
    completedStories: number;
    savedWords: number;
    activeDays: number;
  };
  completedStories: {
    sessionId: string;
    storyId: string;
    title: string;
    coverImageUrl: string | null;
    completedAt: string;
  }[];
  /**
   * D-6에서 아이가 다시 말한 이야기. **텍스트다.**
   * 원본 음성을 저장하지 않으므로 "들어보기"는 TTS로 읽어 준다. (Q-07)
   */
  retellings: {
    sessionId: string;
    storyTitle: string;
    text: string;
    createdAt: string;
  }[];
};

export type ContentApi = {
  listStories(childId: string, topic?: string): Promise<StoryListResult>;
  getStory(storyId: string, childId: string): Promise<StoryDetail>;
  listWords(childId: string, filter?: WordbookFilter): Promise<WordbookResult>;
  saveWord(
    childId: string,
    body: {
      word: string;
      meaning: string;
      storyId: string;
      /** DB 장면 ID. 화면 단위 인덱스는 서버가 계산해 내려준다. */
      sourceSceneId: string;
      contextSentence?: string | null;
    }
  ): Promise<WordEntry>;
  toggleWordLiked(childId: string, wordId: string): Promise<WordEntry>;
  getMypage(childId: string): Promise<MypageSnapshot>;
};

/* ── 보호자 (선택) — api.md 3.8 ──────────────────────────────────── */

/** A-6 보호자 홈 요약 */
export type ParentSummary = {
  child: { id: string; name: string; avatarId: string; age: number };
  /** 최근 7일 완료 세션 수 */
  thisWeekCount: number;
  completedStories: number;
  /** 아이 발화 평균 문장 수 */
  avgChildSentences: number;
  /** false면 0 대신 "아직 기록이 없어요"를 보여준다. (A-6 체크리스트) */
  hasRecords: boolean;
};

export type ReportListItem = {
  sessionId: string;
  storyTitle: string;
  coverImageUrl: string | null;
  date: string;
  status: SessionStatus;
};

export type ReportListResult = {
  /** 아이 전환 칩 */
  children: { id: string; name: string }[];
  /** 최근 4주 라인차트 — 주별 아이 발화 수 */
  weeklyTrend: { weekLabel: string; utteranceCount: number }[];
  /** 추이 문구. 근거가 없으면 null. 없는 추세를 말하지 않는다. */
  trendMessage: string | null;
  reports: ReportListItem[];
};

/**
 * G-2 역량 카드. 표시 순서는 리포트 가이드 4절이 못 박아 두었다.
 * 역량명 → 특징 → 근거 발화 → 잘한 점 → 보완할 부분.
 *
 * ⚠️ `DECISION`·`REASON` 같은 내부 태그를 여기 담지 않는다. (가이드 4절)
 */
export type CompetencyCard = {
  name: string;
  feature: string;
  evidence: string | null;
  strength: string;
  next: string;
};

export type ReportDetail = {
  sessionId: string;
  storyTitle: string;
  date: string;
  summary: string;
  vocabulary: {
    mainWords: string[];
    repeated: string[];
    feedback: string;
  };
  competencies: CompetencyCard[];
  /** 사고 요소 집계 → 마음/이유/생각/방법 (아이 화면과 같은 4그룹) */
  elementCounts: { label: string; count: number }[];
  /** 대표 발화는 **1개**다. 선정 이유를 한 문장으로 함께 준다. (가이드 5절, Q-08) */
  representative: {
    text: string;
    sceneLabel: string;
    reason: string;
  } | null;
  /** 가정 연계 대화 가이드 — 가이드 6·7절 */
  guide: {
    intro: string;
    storyQuestions: string[];
    dailyQuestions: string[];
  };
};

export type NoticeItem = {
  id: string;
  category: "안내" | "업데이트";
  title: string;
  body: string;
  date: string;
  unread: boolean;
};

export type ParentAccount = Parent & {
  provider: AuthProvider;
  createdAt: string;
};

export type ParentApi = {
  getSummary(childId: string): Promise<ParentSummary>;
  listReports(childId: string): Promise<ReportListResult>;
  getReport(sessionId: string): Promise<ReportDetail>;
  getParent(): Promise<ParentAccount>;
  updateChild(
    childId: string,
    body: { name?: string; avatarId?: string }
  ): Promise<Child>;
  deleteChild(childId: string): Promise<void>;
  listNotices(): Promise<NoticeItem[]>;
  withdraw(): Promise<void>;
};

export type AccountApi = {
  listChildren(): Promise<ChildListResult>;
  createChild(body: {
    name: string;
    birthYear: number;
    avatarId: string;
    consents: ConsentValues;
  }): Promise<Child>;
  getHome(childId: string): Promise<HomeSnapshot>;
};
