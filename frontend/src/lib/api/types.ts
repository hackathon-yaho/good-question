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

/** GET /api/sessions/{sessionId} — backend/docs/api-spec.md 5.2 */
export type SessionSnapshot = {
  sessionId: string;
  storyId: string;
  /** `post_activity`면 /activity로 보낸다. 이게 후속 활동 진입 신호다. */
  status: SessionStatus;
  currentSceneId: string;
  /** DB 단위 1~9. 화면 단위(1~4)는 `toScreenIndex()`로 직접 계산한다. (Q-10) */
  currentSceneOrder: number;
  /**
   * 화면 단위 전체 구간 수(고정 4).
   *
   * ⚠️ `/home`은 `sceneProgress: {current, total}`을 주는데 **이 엔드포인트는 안 준다.**
   *    현재 위치는 `currentSceneOrder`로 계산해야 한다.
   */
  totalScenes: number;
  turnCount: number;
  /** dialogue 장면이 아니면 null */
  maxTurns: number | null;
  accumulatedElements: string[];
  /** `speakerType: "system"`(미션 노출 기록)은 이 목록에 오지 않는다. */
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

/** POST /api/sessions/{sessionId}/messages 응답 — backend/docs/api-spec.md 6.1 */
export type UtteranceResponse = {
  responseMode: ResponseMode;
  characterMessage: string;
  /**
   * 방금 저장된 캐릭터 메시지의 id. `GET /api/tts?messageId=`로 음성을 받는다.
   *
   * 백엔드가 처음 `characterMessageId`로 만들었다가 프론트가 이미 검증한 이름에
   * 맞춰 `messageId`로 고쳤다. (백엔드 D-26)
   */
  messageId: string;
  characterName: string;
  accumulatedElements: string[];
  turnCount: number;
  maxTurns: number | null;
  /** true면 이 대사를 재생한 뒤 다음 장면 또는 후속 활동으로 넘어간다. */
  sceneEnded: boolean;
  /**
   * `sceneEnded`일 때 다음 장면 id. 없으면 null → 후속 활동으로 간다.
   *
   * ⚠️ 값이 있어도 **`.../complete`를 부르면 안 된다.** 서버가 이 응답을 만들면서
   *    이미 세션을 그 장면으로 옮겼다(`session.advanceToScene`). 프론트는
   *    `GET /sessions/{id}`로 다시 읽기만 한다.
   */
  nextSceneId: string | null;
  missionTriggered: MissionTrigger | null;
  missionProgress?: {
    missionId: string;
    satisfiedIndexes: number[];
  };
  characterState?: string | null;
  highlightWords: HighlightWord[];
};

/**
 * POST /api/sessions/{sessionId}/scenes/{sceneId}/complete
 * — backend/docs/api-spec.md 5.3
 *
 * ⚠️ **intro·narrative 전용이다.** dialogue 장면에 부르면 400이 온다.
 *    대화 장면의 종료는 `POST .../messages`가 알아서 판단하고 세션도 알아서 옮긴다.
 *
 * 응답의 `nextScene`은 `sceneDescription`·배경 이미지를 담지 않는다. 그래서 프론트는
 * 이 응답을 쓰지 않고 **곧바로 `GET /sessions/{id}`를 다시 읽는다** — 자막을 그리려면
 * `sceneDescription`이 필요하고, 후속 활동 진입 판단도 세션의 `status`로 해야 한다.
 * 요청이 한 번 더 늘지만 두 경로(대화 종료 / 서술 종료)가 같은 코드로 합쳐진다.
 */
export type SceneCompleteResponse = {
  nextScene: {
    sceneId: string;
    sceneOrder: number;
    sceneType: SceneType;
    characterName: string | null;
    characterDisplayName: string | null;
    characterImageUrl: string | null;
    maxTurns: number | null;
    /** 다음 장면이 dialogue일 때만. 서버가 첫 대사를 미리 저장해 준다. */
    openingMessage: Message | null;
  };
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
  /**
   * C-13 "이야기 나가기" — `PATCH /api/sessions/{id}`로 세션을 `stopped`로 바꾼다.
   * (backend/docs/api-spec.md 5.4)
   *
   * 이걸 부르지 않으면 세션이 `in_progress`로 남아 **홈의 이어하기 카드가 계속
   * 떠 있고** 아이가 나갔다는 사실이 서버에 남지 않는다. 멱등이라 여러 번 불러도 된다.
   */
  stopSession(sessionId: string): Promise<void>;
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

/**
 * POST /api/sessions/{sessionId}/activity/order
 * — backend/docs/api-spec.md 8.2
 *
 * ⚠️ 아래 두 필드는 **키 자체가 없을 수 있다.** 값이 null이 아니라 생략이다
 *    (백엔드가 `@JsonInclude(NON_NULL)`을 걸었다). `?? []`·truthy 검사로 다뤄야 하고
 *    `=== null` 비교는 통하지 않는다.
 *
 * `hintCardId`는 **없다.** D-3의 "힌트 보기"가 강조할 카드를 서버가 알려주지 않고,
 * 프론트는 정답을 모르므로 만들 수 없다. 버튼을 빼는 쪽으로 정했다. (Q-15)
 */
export type OrderResult = {
  isCorrect: boolean;
  attemptCount: number;
  /** 정답이거나 3회째일 때만 온다. */
  retellingKeywords?: string[];
  /**
   * 정답 순서. **3회째 오답에만 온다.** (백엔드 D-10 · Q-15)
   *
   * `attempt_count`는 재시도를 전제하지만 제한 규칙이 없어 무한 재시도가 된다.
   * 아이가 활동에 갇혀 세션이 완료되지 않고, D-3의 "실패를 지적하지 않는다"
   * 원칙과도 어긋난다. 그래서 3회째에 정답을 보여주고 다음 단계로 넘긴다.
   *
   * ⚠️ **프론트가 시도 횟수를 세서 판단하지 않는다.** 이 필드가 있으면 넘기고,
   *    없으면 D-3으로 돌린다. 제한 규칙은 서버 소관이다. (§0-2)
   */
  correctOrder?: string[];
  /**
   * 제출한 순서대로 **각 칸이 정답 위치인지.** `[true, false, false, true]`
   *
   * **선택 필드다.** 없으면 프론트는 배치 전체를 오답으로 표시한다 —
   * 지금 백엔드가 주지 않으므로 실서버에서는 그쪽으로 동작한다.
   *
   * ⚠️ 정답 순서 자체가 아니다. "이 칸이 맞는지"만 알려주므로 프론트가 정답을
   *    역산할 수 없다. 정답을 모른다는 원칙(§0-2)을 지키면서 틀린 칸만 표시할 수
   *    있는 최소 필드다. (docs/request/backend/order-slot-results.md)
   */
  slotResults?: boolean[];
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
  /** 이번 이야기로 얻은 별가루. 서버가 줄 때만 표시한다 (계획 D4·D16) */
  earnedStarDust?: number;
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

/**
 * 별가루 — 팀이 추가한 보상 (백엔드 B-20 · [Q-12](../../../docs/open-questions.md))
 *
 * ⚠️ **선택 필드다.** 백엔드가 이야기 완료 시 `children.star_dust`를 올리지만
 *    어떤 응답 DTO에도 노출하지 않는다(2026-08-13 확인). 값이 없으면 화면이
 *    칩을 숨긴다 — "별가루 0"을 보여주는 것보다 낫다.
 *    백엔드가 추가하면 코드 변경 없이 나타난다. (계획 D4)
 */
type WithStarDust = { starDust?: number };

/** GET /api/home?childId={id} */
export type HomeSnapshot = {
  child: { id: string; name: string; avatarId: string } & WithStarDust;
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

/**
 * B-3 진행 중 세션. 있으면 프론트가 B-4 모달을 띄운다.
 *
 * ⚠️ `sceneProgress`가 없다. `/home`만 그걸 주고 여기는 `currentSceneOrder`(1~9)뿐이라
 *    화면 단위 번호는 `toScreenIndex()`로 계산한다. (backend/docs/api-spec.md 4.2)
 */
export type ExistingSession = {
  sessionId: string;
  currentSceneOrder: number | null;
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
  /**
   * 아직 재생할 수 없는 이야기. **선택 필드**이므로 없으면 재생 가능이다.
   *
   * 목 카탈로그의 "준비 중" 편을 위해 있다(`mocks/story-catalog.ts`). 서버가
   * 장면이 없는 이야기를 목록에 올린다면 같은 필드로 표현하면 된다 — 그러면
   * B-3이 시작 버튼을 비활성으로 두고 안내를 띄운다.
   */
  comingSoon?: boolean;
};

/**
 * ⚠️ `StoryDetail`에 `consentGranted`가 **없다.**
 *
 * 동의 여부는 `GET /children`의 `consentGranted`로 확인하라는 것이 백엔드 안내다
 * (backend/docs/api-spec.md 5.1). 다만 B-3은 아이 목록을 부르지 않으므로,
 * 프론트는 **`POST /sessions`의 403 `CONSENT_REQUIRED`를 받아 처리**한다.
 * 서버가 어차피 다시 검증하므로 판단 주체를 서버로 두는 것이 어긋날 여지가 없다.
 */

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
  child: { id: string; name: string; avatarId: string; age: number } & WithStarDust;
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
  /**
   * E-1 좋아요. **바꿀 목표 값을 넘긴다.**
   * `PATCH /wordbook/{id}`가 `{ liked }`를 요구하므로 서버가 뒤집어 주지 않는다.
   * 현재 값은 목록을 들고 있는 화면이 안다. (api-spec 9.3)
   */
  toggleWordLiked(
    childId: string,
    wordId: string,
    liked: boolean
  ): Promise<WordEntry>;
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

/**
 * H-1 계정 정보.
 *
 * ⚠️ **전용 엔드포인트가 없다.** `GET /auth/me`로 id·name·email까지만 채운다.
 *    `provider`는 카카오 단독이라 상수로 두고(PRD M-01), `createdAt`은 어디서도
 *    오지 않아 옵셔널이다 — 없는 값을 만들어 넣지 않는다.
 */
export type ParentAccount = Parent & {
  provider: AuthProvider;
  createdAt?: string;
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
