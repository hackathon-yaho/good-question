/**
 * 목 서버 — 계정·아이 프로필·홈 (docs/spec/api.md 3.1 ~ 3.3)
 *
 * `mock.ts`와 같은 원칙이다. 판단은 전부 여기서 하고, 화면은 결과만 받는다.
 * 실제 클라이언트로 갈아탈 때 이 파일만 버린다.
 *
 * ── 왜 localStorage인가 ─────────────────────────────────────────────
 * 대화 세션(mock.ts)은 메모리에 둬도 되지만, 계정과 아이 목록은 새로고침 후에도
 * 남아야 한다. 안 그러면 새로고침마다 로그인 화면으로 튕겨 데모가 끊긴다.
 * 서버가 붙으면 이 저장소는 사라지고 HTTP 호출만 남는다.
 */

import { ApiError } from "@/lib/api/errors";
import type {
  AccountApi,
  AuthResult,
  Child,
  ChildListResult,
  ConsentValues,
  HomeSnapshot,
} from "@/lib/api/types";
import { activeMockSession } from "@/lib/api/mock";
import { STORY_META } from "@/mocks/story-banggui";

/** 아이 최대 등록 인원 — PRD I-09 */
const CHILD_LIMIT = 3;

const STORE_KEY = "gq.mock.account";

const MOCK_PARENT = {
  id: "p_mock_0001",
  name: "보호자",
  email: "parent@example.com",
};

type StoredChild = {
  id: string;
  name: string;
  birthYear: number;
  avatarId: string;
  consents: ConsentValues;
  registeredAt: string;
};

type Store = { seq: number; children: StoredChild[] };

const EMPTY: Store = { seq: 0, children: [] };

function load(): Store {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Store;
    return Array.isArray(parsed.children) ? parsed : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

function save(store: Store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    // 저장 실패해도 이번 세션 동안은 동작해야 한다.
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 나이는 저장하지 않고 계산한다. 만 나이가 아니다. (PRD I-11) */
function ageOf(birthYear: number): number {
  return new Date().getFullYear() - birthYear;
}

function toChild(stored: StoredChild): Child {
  return {
    id: stored.id,
    name: stored.name,
    birthYear: stored.birthYear,
    age: ageOf(stored.birthYear),
    avatarId: stored.avatarId,
    // 아이 등록 시 동의를 함께 받으므로 이 목에서는 항상 true다.
    consentGranted: stored.consents.childDataProcessing,
    lastActivityAt: activeMockSession(stored.id)?.lastActivityAt ?? null,
    registeredAt: stored.registeredAt,
  };
}

export const mockAccountApi: AccountApi = {
  async signIn(provider, body) {
    // OAuth 왕복을 흉내낸다. A-2에서 스피너가 보일 만큼은 걸려야 한다.
    await delay(700);
    if (!body.authorizationCode) {
      throw new ApiError("UNAUTHORIZED", "인가 코드가 없습니다");
    }

    const store = load();
    const result: AuthResult = {
      accessToken: `mock.${provider}.${store.children.length}`,
      // 아이가 한 명이라도 있으면 온보딩을 끝낸 계정으로 본다.
      hasCompletedOnboarding: store.children.length > 0,
      parent: MOCK_PARENT,
    };
    return result;
  },

  async listChildren() {
    await delay(150);
    const store = load();
    const result: ChildListResult = {
      children: store.children.map(toChild),
      limit: CHILD_LIMIT,
    };
    return result;
  },

  async createChild(body) {
    await delay(400);
    const store = load();

    // 3명 제한은 서버가 막는다. 프론트만 막으면 안 된다. (A-4 체크리스트)
    if (store.children.length >= CHILD_LIMIT) {
      throw new ApiError("CHILD_LIMIT_EXCEEDED");
    }
    // 동의 없이 아이를 만들 수 없다. child_consents를 함께 생성하는 계약이다.
    if (
      !body.consents.termsOfService ||
      !body.consents.privacyPolicy ||
      !body.consents.childDataProcessing
    ) {
      throw new ApiError("CONSENT_REQUIRED");
    }

    store.seq += 1;
    const stored: StoredChild = {
      id: `c_mock_${store.seq}`,
      name: body.name.trim(),
      birthYear: body.birthYear,
      avatarId: body.avatarId,
      consents: { ...body.consents },
      registeredAt: new Date().toISOString(),
    };
    store.children.push(stored);
    save(store);

    return toChild(stored);
  },

  async getHome(childId) {
    await delay(200);
    const store = load();
    const child = store.children.find((c) => c.id === childId);
    if (!child) throw new ApiError("UNAUTHORIZED", "선택한 아이를 찾을 수 없습니다");

    const active = activeMockSession(childId);

    const snapshot: HomeSnapshot = {
      child: { id: child.id, name: child.name, avatarId: child.avatarId },
      inProgress: active
        ? {
            sessionId: active.sessionId,
            storyId: STORY_META.id,
            storyTitle: STORY_META.title,
            coverImageUrl: STORY_META.coverImageUrl,
            currentSceneOrder: active.currentSceneOrder,
            sceneProgress: active.sceneProgress,
            lastActivityAt: active.lastActivityAt,
          }
        : null,
      // 추천 로직은 구현 대상이 아니다. published 목록을 그대로 내려준다. (PRD F-02)
      recommended: [
        {
          id: STORY_META.id,
          title: STORY_META.title,
          coverImageUrl: STORY_META.coverImageUrl,
          estimatedMinutes: STORY_META.estimatedMinutes,
          topics: [...STORY_META.topics],
        },
      ],
    };
    return snapshot;
  },
};

/** 데모 초기화 — 계정과 아이 목록을 지운다. */
export function resetMockAccount() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORE_KEY);
  } catch {
    // 무시
  }
}
