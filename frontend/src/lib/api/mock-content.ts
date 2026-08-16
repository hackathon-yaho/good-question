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
import { AVATAR_IDS } from "@/components/ui/ChildAvatar";
import { SHOP_AVATARS } from "@/lib/shop-catalog";
import {
  MOCK_SCENES,
  STORY_META,
  TOTAL_SCREEN_SCENES,
  findScene,
  toScreenIndex,
} from "@/mocks/story-banggui";
import { CATALOG_STORIES, findCatalogStory } from "@/mocks/story-catalog";

const WORDBOOK_KEY = "gq.mock.wordbook";
/** 담은 뒤 이 시간 안이면 E-1에서 "새 단어" 칩을 붙인다. */
const NEW_WORD_WINDOW_MS = 24 * 60 * 60 * 1000;
const ACCOUNT_KEY = "gq.mock.account";
/** 이야기 1편 완료당 별가루. mock-account.ts의 같은 상수와 값을 맞춘다 (B-20). */
const STAR_DUST_PER_STORY = 100;

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

/**
 * 재생 가능한 이야기는 1편이다. 목록에는 **카탈로그 전용 2편**을 함께 올린다.
 * 이야기가 여러 편일 때의 화면(추천 3개 · 태블릿 3열 · 주제 필터)을 볼 수 있어야 한다.
 * (`mocks/story-catalog.ts`)
 */
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
    // `as string[]`로 넓힌다. STORY_META.topics는 as const라 리터럴 유니온이 되고,
    // 카탈로그 편과 합치면 `includes(topic)`에서 타입이 충돌한다.
    topics: [...STORY_META.topics] as string[],
    sessionStatus: latest?.status ?? null,
  };
}

/** 카탈로그 전용 편. 세션이 있을 수 없으므로 `sessionStatus`는 늘 null이다. */
function catalogListItems() {
  return CATALOG_STORIES.map((story) => ({
    id: story.id,
    title: story.title,
    summary: story.summary,
    coverImageUrl: story.coverImageUrl,
    estimatedMinutes: story.estimatedMinutes,
    difficulty: story.difficulty,
    topics: [...story.topics],
    sessionStatus: null,
  }));
}

export const mockContentApi: ContentApi = {
  async listStories(childId, topic) {
    await delay(180);
    assertOnline();

    const all = [storyListItem(childId), ...catalogListItems()];
    // 필터는 목록만 갱신한다. 페이지 이동이 없다. (B-2 동작)
    const result: StoryListResult = {
      stories:
        !topic || topic === "all"
          ? all
          : all.filter((item) => item.topics.includes(topic)),
      // 모든 이야기의 주제를 합집합으로 낸다. 1편 것만 내면 나머지 편이 걸러지지 않는다.
      availableTopics: [
        ...new Set(all.flatMap((item) => item.topics)),
      ],
    };
    return result;
  },

  async getStory(storyId, childId) {
    await delay(200);
    assertOnline();

    // 카탈로그 전용 편 — 상세까지는 보여주고 재생만 막는다. (story-catalog.ts)
    const catalog = findCatalogStory(storyId);
    if (catalog) {
      const detail: StoryDetail = {
        id: catalog.id,
        title: catalog.title,
        summary: catalog.summary,
        coverImageUrl: catalog.coverImageUrl,
        estimatedMinutes: catalog.estimatedMinutes,
        difficulty: catalog.difficulty,
        topics: [...catalog.topics],
        intro: catalog.intro,
        situation: catalog.situation,
        childRole: catalog.childRole,
        characters: catalog.characters.map((c) => ({ ...c, imageUrl: null })),
        // 재생이 안 되므로 세션이 있을 수 없다.
        existingSession: null,
        comingSoon: true,
      };
      return detail;
    }

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
            status: resumable.status,
          }
        : null,
      // 이 목에서는 등록 시 동의를 함께 받으므로 항상 true다.
      // 서버는 child_consents를 실제로 조회해야 한다.
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

  async toggleWordLiked(childId, wordId, liked) {
    await delay(150);
    assertOnline();

    const store = loadWords();
    const found = store.words.find(
      (w) => w.id === wordId && w.childId === childId
    );
    if (!found) throw new ApiError("NOT_FOUND", "없는 단어입니다");

    // 넘어온 값을 그대로 쓴다. 서버가 뒤집어 주지 않으므로 목도 뒤집지 않는다.
    // 목만 뒤집으면 두 번 누를 때 실서버와 결과가 갈린다. (api-spec 9.3)
    found.liked = liked;
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

    const child = readChild(childId);
    const snapshot: MypageSnapshot = {
      // 아이 정보는 계정 목이 가지고 있다. 화면이 두 번 부르지 않게 여기서 채운다.
      child: {
        ...child,
        // 백엔드 B-20: 이야기 완료 1편당 +100. 실서버는 이 필드를 아직 안 준다.
        starDust: starDustBalance(completed.length, child.ownedAvatarIds ?? []),
      },
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

  async purchaseAvatar(childId, avatarId) {
    await delay(250);
    assertOnline();

    const child = readChild(childId);
    const owned = child.ownedAvatarIds ?? [];
    const isFree = (AVATAR_IDS as readonly string[]).includes(avatarId);
    if (isFree || owned.includes(avatarId)) {
      throw new ApiError("INVALID_REQUEST", "이미 갖고 있는 아바타입니다");
    }

    const item = SHOP_AVATARS.find((a) => a.id === avatarId);
    if (!item) throw new ApiError("NOT_FOUND", "존재하지 않는 아바타입니다");

    const completedCount = mockSessionsOf(childId).filter(
      (s) => s.status === "completed"
    ).length;
    const balance = starDustBalance(completedCount, owned);
    if (balance < item.price) {
      throw new ApiError("INSUFFICIENT_STAR_DUST", "별가루가 부족해요");
    }

    const nextOwned = [...owned, avatarId];
    writeChildAvatarState(childId, child.avatarId, nextOwned);

    return {
      starDust: starDustBalance(completedCount, nextOwned),
      ownedAvatarIds: nextOwned,
    };
  },

  async equipAvatar(childId, avatarId) {
    await delay(200);
    assertOnline();

    const child = readChild(childId);
    writeChildAvatarState(childId, avatarId, child.ownedAvatarIds ?? []);
    return { avatarId };
  },
};

/**
 * 아이 기본 정보. 계정 목의 저장소를 그대로 읽는다.
 *
 * mock-account를 import하면 순환이 되므로(그쪽이 mock.ts를 쓰고 있다) 키만 공유한다.
 * 실제 서버에서는 `GET /api/mypage`가 조인해서 한 번에 내려줄 값이다.
 */
function readChild(childId: string): MypageSnapshot["child"] {
  const fallback = { id: childId, name: "아이", avatarId: "color1", age: 0, ownedAvatarIds: [] };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as {
      children?: {
        id: string;
        name: string;
        avatarId: string;
        birthYear: number;
        ownedAvatarIds?: string[];
      }[];
    };
    const found = parsed.children?.find((c) => c.id === childId);
    if (!found) return fallback;
    return {
      id: found.id,
      name: found.name,
      avatarId: found.avatarId,
      age: new Date().getFullYear() - found.birthYear,
      ownedAvatarIds: found.ownedAvatarIds ?? [],
    };
  } catch {
    return fallback;
  }
}

/** 완료한 이야기 수와 상점에서 산 아바타 목록으로 별가루 잔액을 계산한다. */
function starDustBalance(completedCount: number, ownedAvatarIds: string[]): number {
  const earned = completedCount * STAR_DUST_PER_STORY;
  const spent = ownedAvatarIds.reduce((sum, id) => {
    const item = SHOP_AVATARS.find((a) => a.id === id);
    return sum + (item?.price ?? 0);
  }, 0);
  return earned - spent;
}

/**
 * 계정 목 저장소에 아바타 장착·구매 결과를 반영한다. `readChild`와 같은 이유로
 * mock-account를 직접 import하지 않고 localStorage를 그대로 다룬다.
 */
function writeChildAvatarState(
  childId: string,
  avatarId: string,
  ownedAvatarIds: string[]
) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      children?: Record<string, unknown>[];
    };
    const found = parsed.children?.find((c) => c.id === childId);
    if (!found) return;
    found.avatarId = avatarId;
    found.ownedAvatarIds = ownedAvatarIds;
    window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(parsed));
  } catch {
    // 저장 실패해도 이번 세션 동안은 동작해야 한다.
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
