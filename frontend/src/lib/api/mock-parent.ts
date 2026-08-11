/**
 * 목 서버 — 보호자 영역 (A-6, G, H)
 *
 * 리포트는 [보호자 리포트 가이드](../../../docs/reference/guardian-report-guide.md)를 따른다.
 * 가이드 1절이 "현재는 「방귀 뀌는 며느리」 예시 데이터를 구성하여 구현"이라고
 * 못 박았으므로, 세션에서 뽑을 수 있는 값(발화 원문·사고 요소 집계)은 실제로 계산하고
 * 서술형 문구는 가이드가 제시한 예시 문장을 쓴다.
 *
 * ── 절대 만들지 않는 것 (가이드 8절) ────────────────────────────────
 *   점수(100점 만점) · 등급(A/B/C) · 또래 대비 백분위 · "논리력이 부족합니다"류 단정
 *
 * ── 4점 dot 인디케이터를 넣지 않은 이유 ──────────────────────────────
 * 화면 명세 G-2는 역량별 4점 dot을 그리라고 하지만 **산출 기준이 어디에도 없다.**
 * 기준 없이 점을 칠하면 없는 측정을 만들어내는 것이고, 그건 가이드 8절이 금지한
 * 단정적 표현과 다르지 않다. 대신 가이드 4절이 정한 5단(역량명 → 특징 → 근거 발화 →
 * 잘한 점 → 보완할 부분)을 그대로 구현했다.
 */

import { ApiError } from "@/lib/api/errors";
import { mockSessionsOf, type MockSessionView } from "@/lib/api/mock";
import type {
  Child,
  CompetencyCard,
  NoticeItem,
  ParentAccount,
  ParentApi,
  ParentSummary,
  ReportDetail,
  ReportListResult,
} from "@/lib/api/types";
import { STORY_META } from "@/mocks/story-banggui";
import { KID_GROUPS, toKidGroup, type ThinkingElement, THINKING_ELEMENTS } from "@/lib/thinking-elements";

const ACCOUNT_KEY = "gq.mock.account";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertOnline() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new ApiError("NETWORK", "오프라인 상태입니다");
  }
}

type StoredChild = {
  id: string;
  name: string;
  birthYear: number;
  avatarId: string;
  consents: {
    termsOfService: boolean;
    privacyPolicy: boolean;
    childDataProcessing: boolean;
    marketing: boolean;
  };
  registeredAt: string;
};

type AccountStore = { seq: number; children: StoredChild[] };

function loadAccount(): AccountStore {
  if (typeof window === "undefined") return { seq: 0, children: [] };
  try {
    const raw = window.localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return { seq: 0, children: [] };
    const parsed = JSON.parse(raw) as AccountStore;
    return Array.isArray(parsed.children) ? parsed : { seq: 0, children: [] };
  } catch {
    return { seq: 0, children: [] };
  }
}

function saveAccount(store: AccountStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(store));
  } catch {
    // 무시
  }
}

function toChild(stored: StoredChild): Child {
  return {
    id: stored.id,
    name: stored.name,
    birthYear: stored.birthYear,
    age: new Date().getFullYear() - stored.birthYear,
    avatarId: stored.avatarId,
    consentGranted: stored.consents.childDataProcessing,
    lastActivityAt: null,
    registeredAt: stored.registeredAt,
  };
}

/** 한국어 문장 수 — 아이 발화 평균 문장 수 계산용 */
function sentenceCount(text: string): number {
  const parts = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  return Math.max(1, parts.length);
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

/* ── 리포트 문구 — 가이드 3·6·7절의 예시를 그대로 쓴다 ──────────────── */

/** 표현 영역 3종 · 논리 영역 2종 (가이드 3-2, 3-3) */
const COMPETENCY_DEFS = [
  {
    name: "관점과 공감",
    area: "표현",
    elements: ["PERSPECTIVE", "EMPATHY"],
    seen: "다른 인물의 처지를 헤아려 말한 부분이 있었어요.",
    unseen: "이번에는 다른 인물의 입장에서 말한 부분이 잘 보이지 않았어요.",
    strengthSeen: "상대가 왜 그렇게 느꼈을지 먼저 생각해 본 점이 좋았어요.",
    strengthUnseen: "자기 생각을 분명하게 말한 점이 좋았어요.",
    next: "\"그 사람은 어떤 마음이었을까?\"처럼 상대의 입장을 묻는 질문을 해보세요.",
  },
  {
    name: "감정 표현",
    area: "표현",
    elements: ["EMOTION"],
    seen: "감정을 가리키는 말을 직접 사용했어요.",
    unseen: "감정을 나타내는 말은 아직 자주 나오지 않았어요.",
    strengthSeen: "느낌을 자기 말로 표현한 점이 좋았어요.",
    strengthUnseen: "상황을 차분히 설명한 점이 좋았어요.",
    next: "\"그때 어떤 기분이었어?\"를 덧붙여 감정과 이유를 함께 말해보게 해주세요.",
  },
  {
    name: "상호작용",
    area: "표현",
    elements: ["REQUEST"],
    seen: "상대에게 무엇을 해달라고 구체적으로 말했어요.",
    unseen: "상대에게 부탁하거나 요청하는 말은 아직 적었어요.",
    strengthSeen: "무엇을 원하는지 분명히 전한 점이 좋았어요.",
    strengthUnseen: "끝까지 이야기에 집중한 점이 좋았어요.",
    next: "\"누구에게 어떻게 말하면 좋을까?\"로 요청을 연습해 보세요.",
  },
  {
    name: "생각과 이유",
    area: "논리",
    elements: ["DECISION", "REASON"],
    seen: "자기 판단과 그 까닭을 함께 말했어요.",
    unseen: "판단은 말했지만 까닭은 아직 짧게 지나갔어요.",
    strengthSeen: "\"왜냐하면\"에 해당하는 말을 스스로 붙인 점이 좋았어요.",
    strengthUnseen: "자기 생각을 망설이지 않고 말한 점이 좋았어요.",
    next: "\"왜 그렇게 생각했어?\"를 한 번 더 물어봐 주세요.",
  },
  {
    name: "결과와 해결",
    area: "논리",
    elements: ["RESULT", "SOLUTION"],
    seen: "무엇을 하면 좋을지, 그러면 어떻게 될지를 말했어요.",
    unseen: "해결 방법이나 그 뒤에 벌어질 일은 아직 적게 나왔어요.",
    strengthSeen: "방법을 떠올려 말한 점이 좋았어요.",
    strengthUnseen: "이야기를 끝까지 따라간 점이 좋았어요.",
    next: "\"그러면 그다음엔 어떻게 될까?\"로 결과를 상상하게 해보세요.",
  },
] as const;

/** 가이드 6-1 — 이야기 주제 이어가기 */
const STORY_QUESTIONS = {
  reason: [
    "며느리는 사람들 앞에서 방귀를 뀌었을 때 어떤 기분이었을까?",
    "며느리의 마음을 기분 날씨로 표현하면 맑음, 흐림, 비 중 무엇일까? 왜 그렇게 생각했어?",
  ],
  perspective: [
    "시아버지는 처음에 왜 며느리를 집에서 내보내려고 했을까?",
    "시아버지는 며느리에게 어떤 말을 해주면 좋을까?",
  ],
  solution: [
    "며느리가 부엌에서 방귀를 뀌어 그릇이 깨졌다면 어떻게 해야 할까?",
    "빨래를 빨리 말리기 위해 며느리의 방귀를 어떻게 활용하면 좋을까?",
  ],
} as const;

/** 가이드 6-2 — 일상생활로 연결하기 */
const DAILY_QUESTIONS = {
  reason: [
    "너도 창피해서 하고 싶은 말을 하지 못한 적이 있어?",
    "그때 어떤 일이 있었고, 왜 창피했어?",
  ],
  perspective: [
    "친구가 자신의 특징 때문에 부끄러워한다면 어떤 기분일까?",
    "그 친구에게 어떤 말을 해주고 싶어?",
  ],
  solution: [
    "친구의 단점을 놀리면 그 친구는 어떤 기분이 들까?",
    "그런 일이 계속되면 친구 사이에는 어떤 일이 생길까?",
  ],
  short: [
    "단점이라고 생각했던 것이 도움이 된 적이 있어?",
    "언제 있었던 일인지, 어떻게 도움이 됐는지 자세히 말해줄래?",
  ],
} as const;

/**
 * 어떤 질문 세트를 줄지 고른다 — 가이드 7절 맞춤형 질문 추천 기준.
 *
 * | 아이의 상태 | 질문 유형 |
 * | 표현이 강하고 논리가 부족 | 이유·결과·해결 |
 * | 논리가 강하고 표현이 부족 | 감정·관점·공감 |
 * | 답변이 짧은 경우 | 이유·사례·다음 결과 확장 |
 */
function pickQuestionKind(
  session: MockSessionView
): "reason" | "perspective" | "solution" | "short" {
  const avgLength =
    session.childMessages.length === 0
      ? 0
      : session.childMessages.reduce((sum, m) => sum + m.text.length, 0) /
        session.childMessages.length;
  if (avgLength > 0 && avgLength < 15) return "short";

  const expressive = session.detectedElements.filter((e) =>
    ["PERSPECTIVE", "EMPATHY", "EMOTION", "REQUEST"].includes(e)
  ).length;
  const logical = session.detectedElements.filter((e) =>
    ["DECISION", "REASON", "RESULT", "SOLUTION"].includes(e)
  ).length;

  if (expressive > logical) return "reason";
  if (logical > expressive) return "perspective";
  return "solution";
}

/** 조사 없이 쓸 수 있는 어휘만 뽑는다. 형태소 분석기가 없어 단순 빈도로 센다. */
function vocabularyOf(session: MockSessionView) {
  const words = session.childMessages
    .flatMap((m) => m.text.split(/[\s,.!?"']+/))
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);

  const counts = new Map<string, number>();
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const repeated = sorted.filter(([, n]) => n >= 2).map(([w]) => w);

  return {
    mainWords: sorted.slice(0, 6).map(([w]) => w),
    repeated: repeated.slice(0, 3),
    // 어휘 특징이 뚜렷하지 않아도 부정적으로 평가하지 않는다. (가이드 3-1)
    feedback:
      repeated.length > 0
        ? `자주 쓴 말이 있어요. 비슷한 뜻의 다른 낱말도 함께 알려주면 표현이 넓어져요.`
        : `이번 활동에서 쓴 낱말을 살펴봤어요. 새로운 낱말을 함께 찾아보면 표현이 더 풍부해져요.`,
  };
}

function competenciesOf(session: MockSessionView): CompetencyCard[] {
  const seen = new Set(session.detectedElements);

  return COMPETENCY_DEFS.map((def) => {
    const matched = def.elements.some((element) => seen.has(element));
    // 근거는 실제 아이 발화에서 가져온다. (가이드 8절 첫 항목)
    const evidence =
      matched && session.childMessages.length > 0
        ? [...session.childMessages].sort(
            (a, b) => b.text.length - a.text.length
          )[0].text
        : null;

    return {
      name: def.name,
      feature: matched ? def.seen : def.unseen,
      evidence,
      // 잘한 점을 먼저, 보완할 부분을 뒤에. (가이드 8절)
      strength: matched ? def.strengthSeen : def.strengthUnseen,
      next: def.next,
    };
  });
}

/** 사고 요소 → 아이 화면과 같은 4그룹으로 묶어 센다. (screens.md G-2 하단 바 차트) */
function elementCountsOf(session: MockSessionView) {
  const counts = new Map<string, number>(KID_GROUPS.map((l) => [l, 0]));
  const known = new Set<string>(THINKING_ELEMENTS);

  for (const element of session.detectedElements) {
    // 스키마에 없는 값이 와도 조용히 무시한다. 화면이 깨지는 것보다 낫다.
    if (!known.has(element)) continue;
    const group = toKidGroup(element as ThinkingElement);
    counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  return KID_GROUPS.map((label) => ({ label, count: counts.get(label) ?? 0 }));
}

/**
 * 대표 발화 **1개** — 가이드 5절. 화면 명세 G-3의 3개 카드와 다르다. (Q-08)
 *
 * 가이드는 "단순히 길거나 사고 요소가 많은 발화보다 핵심 내용과 강점이 잘 드러나는지"를
 * 보라고 한다. 자동 선별로 그 판단을 할 수 없으므로, 여기서는 **의미 단위가 둘 이상
 * 이어진 가장 완성된 발화**를 고른다. 기준을 선정 이유에 그대로 밝힌다.
 */
function representativeOf(session: MockSessionView) {
  if (session.childMessages.length === 0) return null;

  const best = [...session.childMessages].sort((a, b) => {
    const aParts = sentenceCount(a.text);
    const bParts = sentenceCount(b.text);
    if (aParts !== bParts) return bParts - aParts;
    return b.text.length - a.text.length;
  })[0];

  return {
    text: best.text,
    sceneLabel: `장면 ${best.sceneIndex}`,
    reason:
      "생각과 그 까닭이 한 번에 이어져, 아이의 말하기 강점이 가장 잘 드러난 발화예요.",
  };
}

const MOCK_NOTICES: NoticeItem[] = [
  {
    id: "n_2",
    category: "업데이트",
    title: "단어장에서 좋아하는 낱말을 모을 수 있어요",
    body: "이야기를 하다가 밑줄 그어진 낱말을 누르면 뜻을 보고 단어장에 담을 수 있어요. 담은 낱말은 단어장 탭에서 다시 볼 수 있습니다.",
    date: "2026-08-10",
    unread: true,
  },
  {
    id: "n_1",
    category: "안내",
    title: "굿퀘스천 베타 서비스를 시작합니다",
    body: "아이가 옛이야기 속 인물과 목소리로 대화하며 자기 생각을 말해보는 서비스입니다. 베타 기간에는 「방귀 뀌는 며느리」 한 편을 제공합니다.",
    date: "2026-08-04",
    unread: false,
  },
];

const MOCK_PARENT: ParentAccount = {
  id: "p_mock_0001",
  name: "보호자",
  email: "parent@example.com",
  provider: "kakao",
  createdAt: "2026-08-04T09:00:00.000Z",
};

export const mockParentApi: ParentApi = {
  async getSummary(childId) {
    await delay(200);
    assertOnline();

    const store = loadAccount();
    const stored = store.children.find((c) => c.id === childId);
    if (!stored) throw new ApiError("UNAUTHORIZED", "아이를 찾을 수 없습니다");

    const sessions = mockSessionsOf(childId);
    const completed = sessions.filter((s) => s.status === "completed");

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = completed.filter(
      (s) => new Date(s.completedAt ?? s.lastActivityAt).getTime() >= weekAgo
    );

    const allMessages = sessions.flatMap((s) => s.childMessages);
    const avg =
      allMessages.length === 0
        ? 0
        : allMessages.reduce((sum, m) => sum + sentenceCount(m.text), 0) /
          allMessages.length;

    const summary: ParentSummary = {
      child: {
        id: stored.id,
        name: stored.name,
        avatarId: stored.avatarId,
        age: new Date().getFullYear() - stored.birthYear,
      },
      thisWeekCount: thisWeek.length,
      completedStories: completed.length,
      avgChildSentences: Math.round(avg * 10) / 10,
      // 첫 사용이면 0을 늘어놓지 않고 "아직 기록이 없어요"로 바꾼다. (A-6 체크리스트)
      hasRecords: allMessages.length > 0,
    };
    return summary;
  },

  async listReports(childId) {
    await delay(220);
    assertOnline();

    const store = loadAccount();
    const sessions = mockSessionsOf(childId);

    // 최근 4주. 주 경계는 오늘부터 7일 단위로 끊는다.
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    const weeklyTrend = [3, 2, 1, 0].map((back) => {
      const from = now - (back + 1) * week;
      const to = now - back * week;
      const count = sessions
        .flatMap((s) => s.childMessages)
        .filter((m) => {
          const at = new Date(m.createdAt).getTime();
          return at >= from && at < to;
        }).length;
      return { weekLabel: back === 0 ? "이번 주" : `${back}주 전`, count };
    }).map(({ weekLabel, count }) => ({ weekLabel, utteranceCount: count }));

    // 없는 추세를 말하지 않는다. 실제로 늘어난 경우에만 문구를 준다.
    const filled = weeklyTrend.filter((w) => w.utteranceCount > 0);
    const trendMessage =
      filled.length >= 2 &&
      weeklyTrend.at(-1)!.utteranceCount > weeklyTrend.at(-2)!.utteranceCount
        ? "말하기 문장 수가 늘고 있어요"
        : filled.length === 0
          ? null
          : "기록이 조금씩 모이고 있어요";

    const result: ReportListResult = {
      children: store.children.map((c) => ({ id: c.id, name: c.name })),
      weeklyTrend,
      trendMessage,
      reports: sessions
        .filter((s) => s.childMessages.length > 0)
        .map((s) => ({
          sessionId: s.sessionId,
          storyTitle: STORY_META.title,
          coverImageUrl: STORY_META.coverImageUrl,
          date: formatDate(s.completedAt ?? s.lastActivityAt),
          status: s.status,
        })),
    };
    return result;
  },

  async getReport(sessionId) {
    await delay(260);
    assertOnline();

    const store = loadAccount();
    let found: MockSessionView | undefined;
    for (const child of store.children) {
      found = mockSessionsOf(child.id).find((s) => s.sessionId === sessionId);
      if (found) break;
    }
    if (!found) throw new ApiError("UNKNOWN", "리포트를 찾을 수 없습니다");

    const kind = pickQuestionKind(found);
    const detail: ReportDetail = {
      sessionId: found.sessionId,
      storyTitle: STORY_META.title,
      date: formatDate(found.completedAt ?? found.lastActivityAt),
      summary: `이번 이야기에서 아이가 ${found.childMessages.length}번 말했어요. 아래는 그 말들을 바탕으로 정리한 내용입니다.`,
      vocabulary: vocabularyOf(found),
      competencies: competenciesOf(found),
      elementCounts: elementCountsOf(found),
      representative: representativeOf(found),
      guide: {
        intro:
          "학습 과제가 아니라, 오늘 나눈 이야기를 자연스럽게 이어가기 위한 질문이에요.",
        storyQuestions: [
          ...(kind === "short" ? STORY_QUESTIONS.reason : STORY_QUESTIONS[kind]),
        ],
        dailyQuestions: [...DAILY_QUESTIONS[kind]],
      },
    };
    return detail;
  },

  async getParent() {
    await delay(150);
    assertOnline();
    return { ...MOCK_PARENT };
  },

  async updateChild(childId, body) {
    await delay(250);
    assertOnline();

    const store = loadAccount();
    const stored = store.children.find((c) => c.id === childId);
    if (!stored) throw new ApiError("UNKNOWN", "아이를 찾을 수 없습니다");

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name || name.length > 10) {
        throw new ApiError("UNKNOWN", "이름은 1~10자여야 합니다");
      }
      stored.name = name;
    }
    if (body.avatarId !== undefined) stored.avatarId = body.avatarId;

    saveAccount(store);
    return toChild(stored);
  },

  async deleteChild(childId) {
    await delay(300);
    assertOnline();

    const store = loadAccount();
    store.children = store.children.filter((c) => c.id !== childId);
    saveAccount(store);
    // 실제 서버는 story_sessions·messages·wordbook을 캐스케이드 삭제한다.
    // 목에서는 세션·단어 저장소가 분리돼 있어 화면 쪽에서 정리한다.
  },

  async listNotices() {
    await delay(150);
    assertOnline();
    return MOCK_NOTICES.map((notice) => ({ ...notice }));
  },

  async withdraw() {
    await delay(400);
    assertOnline();
    if (typeof window === "undefined") return;
    try {
      window.localStorage.clear();
    } catch {
      // 무시
    }
  },
};
