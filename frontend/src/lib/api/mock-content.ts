/**
 * 목 서버 — 이야기 탐색·단어장·마이페이지 (B-2, B-3, C-9, E, F)
 *
 * 단어장(E)과 마이페이지(F)는 api.md에 계약이 없다. 선택 요건(A-02)이라
 * 백엔드 설계가 아직 없기 때문이다. 여기서 쓰는 형태는 **화면 명세에서 역산한
 * 제안**이고, `types.ts`에 같은 이름으로 올려 뒀다. 백엔드가 정해지면 그쪽에 맞춘다.
 */

import { ApiError } from "@/lib/api/errors";
import { mockSessionsOf } from "@/lib/api/mock";
import type {
  ContentApi,
  MypageSnapshot,
  StoryDetail,
  StoryListResult,
  WordEntry,
  WordbookResult,
} from "@/lib/api/types";
import {
  MOCK_SCENES,
  STORY_META,
  TOTAL_SCREEN_SCENES,
  findScene,
  toScreenIndex,
} from "@/mocks/story-banggui";

const WORDBOOK_KEY = "gq.mock.wordbook";
/** 담은 뒤 이 시간 안이면 E-1에서 "새 단어" 칩을 붙인다. */
const NEW_WORD_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * B-3 정보 블록 3개 — PRD F-03에 확정된 이야기 단위 고정 문구다.
 * `conflict`에서 뽑는 값이 아니다. (screens.md B-3 주석, Q-03)
 */
const STORY_BLOCKS = {
  situation: "큰 방귀 때문에 며느리가 집에서 쫓겨날 위기에 놓였어요.",
  childRole: "며느리의 방귀가 특별한 장점이 될 수 있도록 도와주세요.",
} as const;

type StoredWord = {
  id: string;
  childId: string;
  word: string;
  meaning: string;
  storyId: string;
  sourceSceneId: string;
  contextSentence: string | null;
  liked: boolean;
  savedAt: string;
};

type WordStore = { seq: number; words: StoredWord[] };

const EMPTY: WordStore = { seq: 0, words: [] };

function loadWords(): WordStore {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(WORDBOOK_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as WordStore;
    return Array.isArray(parsed.words) ? parsed : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

function saveWords(store: WordStore) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WORDBOOK_KEY, JSON.stringify(store));
  } catch {
    // 무시
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 오프라인이면 실패한다. 이유는 mock.ts의 같은 함수 주석 참조. */
function assertOnline() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new ApiError("NETWORK", "오프라인 상태입니다");
  }
}

/** DB 장면 ID → 화면 단위 인덱스(1~4). 없는 장면이면 1로 둔다. */
function sceneIndexOf(sceneId: string): number {
  const scene = findScene(sceneId);
  if (!scene) return 1;
  return Math.min(toScreenIndex(scene.sceneOrder), TOTAL_SCREEN_SCENES);
}

function toWordEntry(stored: StoredWord, now: number): WordEntry {
  return {
    id: stored.id,
    word: stored.word,
    meaning: stored.meaning,
    storyId: stored.storyId,
    storyTitle: STORY_META.title,
    // DB scene_order → 화면 단위 인덱스는 **서버가** 계산한다. (Q-10)
    sceneIndex: sceneIndexOf(stored.sourceSceneId),
    contextSentence: stored.contextSentence,
    liked: stored.liked,
    savedAt: stored.savedAt,
    isNew: now - new Date(stored.savedAt).getTime() < NEW_WORD_WINDOW_MS,
  };
}

/** MVP는 이야기 1편이다. 목록도 그 1편만 내려준다. (PRD 7.1) */
function storyListItem(childId: string) {
  const sessions = mockSessionsOf(childId);
  // 여러 세션이 있으면 최신 것의 상태를 보여준다.
  const latest = sessions[0] ?? null;
  return {
    id: STORY_META.id,
    title: STORY_META.title,
    summary: STORY_META.summary,
    coverImageUrl: STORY_META.coverImageUrl,
    estimatedMinutes: STORY_META.estimatedMinutes,
    difficulty: STORY_META.difficulty,
    topics: [...STORY_META.topics],
    sessionStatus: latest?.status ?? null,
  };
}

export const mockContentApi: ContentApi = {
  async listStories(childId, topic) {
    await delay(180);
    assertOnline();

    const item = storyListItem(childId);
    // 필터는 목록만 갱신한다. 페이지 이동이 없다. (B-2 동작)
    const matches =
      !topic || topic === "all" || (item.topics as string[]).includes(topic);

    const result: StoryListResult = {
      stories: matches ? [item] : [],
      availableTopics: [...STORY_META.topics],
    };
    return result;
  },

  async getStory(storyId, childId) {
    await delay(200);
    assertOnline();
    if (storyId !== STORY_META.id) {
      throw new ApiError("UNKNOWN", "없는 이야기입니다");
    }

    // 이어하기 대상은 진행 중이거나 중단된 세션이다. 완료된 세션은 B-4를 띄우지 않는다.
    const resumable =
      mockSessionsOf(childId).find(
        (s) => s.status === "in_progress" || s.status === "stopped"
      ) ?? null;

    const intro = MOCK_SCENES[0].sceneDescription ?? "";
    const characters = MOCK_SCENES.filter((scene) => scene.characterName).map(
      (scene) => ({
        name: scene.characterName as string,
        displayName: scene.characterDisplayName as string,
        imageUrl: null,
      })
    );
    // 같은 캐릭터가 여러 장면에 나온다. distinct로 줄인다. (PRD I-13)
    const distinct = [
      ...new Map(characters.map((c) => [c.name, c])).values(),
    ];

    const detail: StoryDetail = {
      id: STORY_META.id,
      title: STORY_META.title,
      summary: STORY_META.summary,
      coverImageUrl: STORY_META.coverImageUrl,
      estimatedMinutes: STORY_META.estimatedMinutes,
      difficulty: STORY_META.difficulty,
      topics: [...STORY_META.topics],
      intro,
      situation: STORY_BLOCKS.situation,
      childRole: STORY_BLOCKS.childRole,
      characters: distinct,
      existingSession: resumable
        ? {
            sessionId: resumable.sessionId,
            currentSceneOrder: resumable.currentSceneOrder,
            sceneProgress: resumable.sceneProgress,
            status: resumable.status,
          }
        : null,
      // 이 목에서는 등록 시 동의를 함께 받으므로 항상 true다.
      // 서버는 child_consents를 실제로 조회해야 한다.
      consentGranted: true,
    };
    return detail;
  },

  async listWords(childId, filter = "all") {
    await delay(160);
    assertOnline();

    const now = Date.now();
    const store = loadWords();
    const mine = store.words.filter((w) => w.childId === childId);

    const filtered = mine.filter((w) => {
      if (filter === "all") return true;
      if (filter === "liked") return w.liked;
      if (filter.startsWith("story:")) return w.storyId === filter.slice(6);
      return true;
    });

    const result: WordbookResult = {
      words: filtered
        .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
        .map((w) => toWordEntry(w, now)),
      total: mine.length,
      storyFilters: [
        ...new Map(
          mine.map((w) => [w.storyId, { storyId: w.storyId, title: STORY_META.title }])
        ).values(),
      ],
    };
    return result;
  },

  async saveWord(childId, body) {
    await delay(250);
    assertOnline();

    const store = loadWords();
    // 같은 단어를 두 번 담지 않는다. C-9는 "담김 ✓"으로 표시한다.
    const existing = store.words.find(
      (w) => w.childId === childId && w.word === body.word
    );
    if (existing) return toWordEntry(existing, Date.now());

    store.seq += 1;
    const stored: StoredWord = {
      id: `w_mock_${store.seq}`,
      childId,
      word: body.word,
      meaning: body.meaning,
      storyId: body.storyId,
      sourceSceneId: body.sourceSceneId,
      contextSentence: body.contextSentence ?? null,
      liked: false,
      savedAt: new Date().toISOString(),
    };
    store.words.push(stored);
    saveWords(store);
    return toWordEntry(stored, Date.now());
  },

  async toggleWordLiked(childId, wordId) {
    await delay(150);
    assertOnline();

    const store = loadWords();
    const found = store.words.find(
      (w) => w.id === wordId && w.childId === childId
    );
    if (!found) throw new ApiError("UNKNOWN", "없는 단어입니다");

    found.liked = !found.liked;
    saveWords(store);
    return toWordEntry(found, Date.now());
  },

  async getMypage(childId) {
    await delay(220);
    assertOnline();

    const sessions = mockSessionsOf(childId);
    const completed = sessions.filter((s) => s.status === "completed");
    const words = loadWords().words.filter((w) => w.childId === childId);

    const days = new Set<string>();
    for (const session of sessions) {
      for (const date of session.activityDates) days.add(date);
    }

    const snapshot: MypageSnapshot = {
      // 아이 정보는 계정 목이 가지고 있다. 화면이 두 번 부르지 않게 여기서 채운다.
      child: readChild(childId),
      stats: {
        completedStories: completed.length,
        savedWords: words.length,
        activeDays: days.size,
      },
      completedStories: completed.map((s) => ({
        sessionId: s.sessionId,
        storyId: s.storyId,
        title: STORY_META.title,
        coverImageUrl: STORY_META.coverImageUrl,
        completedAt: s.completedAt ?? s.lastActivityAt,
      })),
      retellings: sessions
        .filter((s) => s.retellingText)
        .map((s) => ({
          sessionId: s.sessionId,
          storyTitle: STORY_META.title,
          text: s.retellingText as string,
          createdAt: s.completedAt ?? s.lastActivityAt,
        })),
    };
    return snapshot;
  },
};

/**
 * 아이 기본 정보. 계정 목의 저장소를 그대로 읽는다.
 *
 * mock-account를 import하면 순환이 되므로(그쪽이 mock.ts를 쓰고 있다) 키만 공유한다.
 * 실제 서버에서는 `GET /api/mypage`가 조인해서 한 번에 내려줄 값이다.
 */
function readChild(childId: string): MypageSnapshot["child"] {
  const fallback = { id: childId, name: "아이", avatarId: "color1", age: 0 };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem("gq.mock.account");
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as {
      children?: { id: string; name: string; avatarId: string; birthYear: number }[];
    };
    const found = parsed.children?.find((c) => c.id === childId);
    if (!found) return fallback;
    return {
      id: found.id,
      name: found.name,
      avatarId: found.avatarId,
      age: new Date().getFullYear() - found.birthYear,
    };
  } catch {
    return fallback;
  }
}

/** 데모 초기화 — 단어장을 지운다. */
export function resetMockWordbook() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(WORDBOOK_KEY);
  } catch {
    // 무시
  }
}
