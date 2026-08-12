/**
 * 목 서버 — docs/spec/api.md 3절 계약을 그대로 흉내낸다.
 *
 * 왜 필요한가: 백엔드↔AI 계약이 아직 미결이라(open-questions B-4) 서버를 기다리면
 * 프론트가 가장 위험한 부분인 /play 상태머신을 검증할 수 없다.
 * 작업 분장 5장도 "AI 서버를 목 스텁으로 먼저 연결"할 것을 권장한다.
 *
 * ⚠️ 여기 있는 진행 판단 로직은 **서버가 할 일**이다. (screens.md §0-2)
 *    실제 클라이언트로 갈아탈 때 이 파일만 버리면 되고, 화면 코드는 손대지 않는다.
 *    프론트에 판단 로직이 새어 들어가지 않게 경계를 여기서 끊는다.
 */

import { ApiError } from "@/lib/api/errors";
import { withChildName } from "@/lib/korean";
import type {
  ActivityApi,
  Message,
  OrderResult,
  PlayApi,
  SceneCompleteResponse,
  SceneInfo,
  SessionSnapshot,
  UtteranceResponse,
} from "@/lib/api/types";
import type { ResponseMode, SessionStatus } from "@/lib/play-state";
import {
  MOCK_MISSIONS,
  MOCK_POST_ACTIVITY,
  MOCK_SCENES,
  STORY_ID,
  TOTAL_SCREEN_SCENES,
  findScene,
  nextSceneOf,
  toScreenIndex,
  type MockScene,
} from "@/mocks/story-banggui";

const CHILD_NAME = "민준";

/**
 * 카드 순서 재시도 제한 — 백엔드 D-10 (Q-15 해소)
 *
 * 이 값은 **서버 규칙이라 여기(목 서버)에만 있다.** 화면 코드는 시도 횟수를 세지
 * 않고, 응답의 `correctOrder`가 실려 왔는지만 본다. 프론트가 세면 서버가 규칙을
 * 바꿀 때 두 곳이 어긋난다. (§0-2)
 */
const ORDER_ATTEMPT_LIMIT = 3;

/**
 * 밑줄 단어 사전. 실제로는 콘텐츠에 정의된다. (screens.md 7-1 #5)
 *
 * ⚠️ **장면 ID로 묶지 않는다.** 처음에는 그렇게 했다가 "구박"을 sc_banggui_05에
 *    달아 놨는데 그 장면 대사에는 그 단어가 없어서 밑줄이 한 번도 그려지지 않았다.
 *    지금은 실제로 내려보내는 텍스트에서 찾아 붙인다. 밑줄이 없는 단어를 가리키는
 *    일이 구조적으로 불가능해진다.
 */
const WORD_GLOSSARY: { word: string; meaning: string }[] = [
  { word: "창피한", meaning: "남이 볼까 봐 부끄럽고 얼굴이 뜨거워지는 마음" },
  { word: "뾰족한", meaning: "딱 들어맞는, 좋은 생각이라는 뜻" },
  { word: "구박", meaning: "누군가를 못마땅해하며 자꾸 나무라는 것" },
  { word: "친정", meaning: "결혼한 여자가 태어나서 자란 집" },
];

/** 이 텍스트에 실제로 들어 있는 단어만 밑줄 대상으로 내려준다. */
function highlightWordsIn(text: string) {
  if (!text) return [];
  return WORD_GLOSSARY.filter((entry) => text.includes(entry.word)).map(
    (entry) => ({ ...entry })
  );
}

/**
 * 캐릭터별 반응 문구. 실제로는 캐릭터 LLM이 생성한다.
 *
 * ⚠️ **밑줄 단어(WORD_GLOSSARY)를 일부 대사에 심어 뒀다.** 실서버도 같은 구조다 —
 *    `highlightWords`는 장면 첫 대사가 아니라 **생성된 턴 응답에 후보 단어가 실제로
 *    등장할 때만** 채워진다 (백엔드 D-22 · `MessageServiceImpl.detectHighlightWords`).
 *    여기 한 단어도 안 넣으면 목에서 C-9(단어 뜻 팝업)로 갈 통로가 아예 없어져
 *    단어장까지 검증할 수 없다.
 */
const REACTIONS: Record<string, Record<ResponseMode, string[]>> = {
  ch_banggui_daughter_in_law: {
    normal: [
      "정말? 내 마음을 알아주는 사람이 있었네…",
      "그렇게 말해 주니 창피한 마음이 조금 가벼워지는 것 같아.",
    ],
    guided: [
      "그런데 왜 꼭 말해야 하는지 나는 아직 잘 모르겠어.",
      "말을 꺼내고 싶어도 어떻게 시작해야 할지 모르겠어.",
    ],
    closing: [],
  },
  ch_banggui_father_in_law: {
    normal: [
      "흠… 네 말도 아주 틀린 것은 아니구나.",
      "그렇게 말하니 내가 구박만 한 것이 미안해지는구나.",
    ],
    guided: [
      "일부러 그런 것이 아니라는 걸 내가 어찌 믿겠느냐.",
      "그래서 나더러 어찌하란 말이냐.",
    ],
    closing: [],
  },
  ch_banggui_village_chief: {
    normal: [
      "허허, 그런 뾰족한 방법이 있었구려!",
      "듣고 보니 해볼 만한 이야기구려.",
    ],
    guided: [
      "그 방법이 정말 통할지 나는 알 수가 없구려.",
      "사람들이 다치지나 않을까 그것이 걱정이구려.",
    ],
    closing: [],
  },
};

type MockSession = {
  sessionId: string;
  childId: string | null;
  /** B-1 이어하기 카드가 최신 1건을 고르는 기준 */
  lastActivityAt: number;
  currentSceneId: string;
  turnCount: number;
  accumulatedElements: string[];
  turnsWithoutNewElement: number;
  lowInformationTurns: number;
  previousMode: ResponseMode | null;
  missionRevealedScenes: Set<string>;
  messages: Message[];
  turnOrder: number;
  status: SessionStatus;
  /** 말하기 후 활동 */
  cardOrder: string[] | null;
  attemptCount: number;
  /** D-6에서 아이가 다시 말한 이야기. 텍스트만 남긴다. 음성은 저장하지 않는다. */
  retellingText: string | null;
  completedAt: string | null;
  /**
   * 세션 전체에서 확인된 사고 요소. `accumulatedElements`는 장면마다 초기화되지만
   * 보호자 리포트(G)는 세션 전체를 봐야 하므로 따로 쌓는다.
   * 실제로는 `utterance_analyses.detected_elements`에서 집계할 값이다.
   */
  detectedElements: string[];
};

const sessions = new Map<string, MockSession>();

/**
 * 세션을 브라우저에 남긴다.
 *
 * 왜: 이어하기(B-1 히어로 카드, C 이어하기 복원)가 이 서비스의 표시 기능이다.
 * 메모리에만 두면 새로고침하거나 주소로 다시 들어올 때마다 진행이 사라져
 * "이어하기"라는 화면이 거짓이 된다.
 *
 * `Set`은 JSON으로 안 나가므로 배열로 바꿔 담는다.
 */
const SESSION_STORE_KEY = "gq.mock.sessions";

type PersistedSession = Omit<MockSession, "missionRevealedScenes"> & {
  missionRevealedScenes: string[];
};

let hydrated = false;

function hydrate() {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(SESSION_STORE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      seq?: number;
      sessions?: PersistedSession[];
    };
    for (const item of parsed.sessions ?? []) {
      sessions.set(item.sessionId, {
        ...item,
        missionRevealedScenes: new Set(item.missionRevealedScenes ?? []),
      });
    }
    sessionSeq = Math.max(sessionSeq, parsed.seq ?? 0);
  } catch {
    // 형식이 깨졌으면 없는 것으로 취급한다. 처음부터 시작하는 편이 안전하다.
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SESSION_STORE_KEY,
      JSON.stringify({
        seq: sessionSeq,
        sessions: [...sessions.values()].map((session) => ({
          ...session,
          missionRevealedScenes: [...session.missionRevealedScenes],
        })),
      })
    );
  } catch {
    // 저장 실패해도 이번 세션 동안은 동작해야 한다.
  }
}

function ensureSession(sessionId: string): MockSession {
  hydrate();
  const existing = sessions.get(sessionId);
  if (existing) return existing;

  const created: MockSession = {
    sessionId,
    childId: null,
    lastActivityAt: Date.now(),
    currentSceneId: MOCK_SCENES[0].id,
    turnCount: 0,
    accumulatedElements: [],
    turnsWithoutNewElement: 0,
    lowInformationTurns: 0,
    previousMode: null,
    missionRevealedScenes: new Set(),
    messages: [],
    turnOrder: 0,
    status: "in_progress",
    cardOrder: null,
    attemptCount: 0,
    retellingText: null,
    completedAt: null,
    detectedElements: [],
  };
  sessions.set(sessionId, created);
  persist();
  return created;
}

/**
 * 카드 셔플. 시드를 세션 ID로 고정해 같은 세션에서 항상 같은 순서가 나오게 한다.
 * 매 시도마다 다시 섞으면 아이가 혼란스럽다. (screens.md D-2 체크리스트)
 * Math.random()을 쓰지 않는 이유는 새로고침 때마다 순서가 바뀌기 때문이다.
 */
function shuffleCards(sessionId: string): string[] {
  const ids = MOCK_POST_ACTIVITY.cards.map((c) => c.id);
  let seed = 0;
  for (const ch of sessionId) seed = (seed * 31 + ch.charCodeAt(0)) % 100003;

  for (let i = ids.length - 1; i > 0; i -= 1) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const j = seed % (i + 1);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  // 우연히 정답 순서로 섞이면 활동이 성립하지 않는다.
  const correct = [...MOCK_POST_ACTIVITY.cards]
    .sort((a, b) => a.correctOrder - b.correctOrder)
    .map((c) => c.id);
  if (ids.join() === correct.join()) [ids[0], ids[1]] = [ids[1], ids[0]];
  return ids;
}

/** 장면 전환 시 초기화 — PRD 8.8. 안 하면 다음 장면이 첫 턴에 즉시 종료된다. */
function resetSceneState(session: MockSession, sceneId: string) {
  session.currentSceneId = sceneId;
  session.turnCount = 0;
  session.accumulatedElements = [];
  session.turnsWithoutNewElement = 0;
  session.lowInformationTurns = 0;
  session.previousMode = null;
}

function pushMessage(
  session: MockSession,
  sceneId: string,
  speakerType: Message["speakerType"],
  text: string
): Message {
  session.lastActivityAt = Date.now();
  session.turnOrder += 1;
  const message: Message = {
    id: `m_${session.turnOrder}`,
    sceneId,
    speakerType,
    turnOrder: session.turnOrder,
    text,
    createdAt: new Date().toISOString(),
  };
  session.messages.push(message);
  return message;
}

function toSceneInfo(scene: MockScene, session: MockSession): SceneInfo {
  return {
    sceneId: scene.id,
    sceneOrder: scene.sceneOrder,
    sceneType: scene.sceneType,
    sceneDescription: scene.sceneDescription,
    characterName: scene.characterName,
    characterDisplayName: scene.characterDisplayName,
    // 이미지 미수령. 규격에 맞춘 플레이스홀더를 화면에서 그린다. (assets.md §3-1)
    characterImageUrl: null,
    backgroundImageUrl: null,
    maxTurns: scene.maxTurns,
    sceneClosed: false,
    missionRevealed: session.missionRevealedScenes.has(scene.id),
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 오프라인이면 요청이 실패해야 한다.
 *
 * 목이 언제나 성공하면 I-3(네트워크 오류) 경로를 한 번도 지나가 보지 못한다.
 * 실제 HTTP 클라이언트로 바꿔도 같은 자리에서 같은 에러가 나므로, 화면 쪽 코드는
 * 그대로 쓸 수 있다. 검증 스크립트도 test 전용 뒷문 없이 이 경로를 밟는다.
 */
function assertOnline() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new ApiError("NETWORK", "오프라인 상태입니다");
  }
}

function pick(list: string[], seed: number): string {
  return list.length ? list[seed % list.length] : "";
}

/** 목 세션 ID 카운터. 실제로는 서버가 UUID를 만든다. */
let sessionSeq = 0;

export const mockPlayApi: PlayApi = {
  async createSession({ childId, storyId, restart = false }) {
    await delay(200);
    assertOnline();
    hydrate();

    // 같은 아이의 진행 중 세션이 있으면 그대로 이어준다.
    // B-4 "처음부터 하기"(restart)는 기존 세션을 stopped로 바꾸고 새로 만든다.
    const existing = [...sessions.values()]
      .filter(
        (s) =>
          s.childId === childId &&
          (s.status === "in_progress" || s.status === "stopped")
      )
      .sort((a, b) => b.lastActivityAt - a.lastActivityAt)[0];

    if (existing && !restart) return mockPlayApi.getSession(existing.sessionId);
    if (existing && restart) existing.status = "stopped";

    sessionSeq += 1;
    const sessionId = `ss_${storyId.slice(0, 6)}_${sessionSeq}`;
    const session = ensureSession(sessionId);
    session.childId = childId;
    persist();
    return mockPlayApi.getSession(sessionId);
  },

  async getSession(sessionId) {
    await delay(150);
    assertOnline();
    const session = ensureSession(sessionId);
    const scene = findScene(session.currentSceneId) ?? MOCK_SCENES[0];

    const snapshot: SessionSnapshot = {
      sessionId,
      storyId: STORY_ID,
      status: session.status,
      currentSceneId: scene.id,
      currentSceneOrder: scene.sceneOrder,
      // 실서버는 화면 단위 현재 위치를 주지 않는다. 분모만 준다.
      // (backend/docs/api-spec.md 5.2 — sceneProgress는 /home에만 있다)
      totalScenes: TOTAL_SCREEN_SCENES,
      turnCount: session.turnCount,
      maxTurns: scene.maxTurns ?? null,
      accumulatedElements: [...session.accumulatedElements],
      messages: [...session.messages],
      currentScene: toSceneInfo(scene, session),
    };
    return snapshot;
  },

  /**
   * intro·narrative 전용. **dialogue에 부르면 실서버가 400을 준다** — 목도 같이 막는다.
   * 막지 않으면 목에서만 통하는 경로가 생겨서 실연동에서 처음 터진다.
   * (backend/docs/api-spec.md 5.3)
   */
  async completeScene(sessionId, sceneId) {
    await delay(120);
    assertOnline();
    const session = ensureSession(sessionId);
    const current = findScene(sceneId);

    if (current?.sceneType === "dialogue") {
      throw new ApiError(
        "INVALID_REQUEST",
        "대화 장면은 이 엔드포인트로 넘길 수 없습니다"
      );
    }
    // 이미 지나간 장면을 다시 넘기려는 경우.
    if (session.currentSceneId !== sceneId) {
      throw new ApiError("SCENE_ALREADY_CLOSED");
    }

    const next = nextSceneOf(sceneId);
    if (!next) {
      // 서술 장면이 마지막인 이야기는 없다. 실서버는 이 경우 404다.
      throw new ApiError("NOT_FOUND", "다음 장면이 없습니다");
    }

    resetSceneState(session, next.id);

    let openingMessage: Message | null = null;
    if (next.sceneType === "dialogue" && next.characterOpening) {
      // 아이 이름 치환은 백엔드가 한다. 화면·TTS·AI 텍스트를 일치시키기 위함이다.
      openingMessage = pushMessage(
        session,
        next.id,
        "character",
        withChildName(next.characterOpening, CHILD_NAME)
      );
    }

    const response: SceneCompleteResponse = {
      nextScene: {
        sceneId: next.id,
        sceneOrder: next.sceneOrder,
        sceneType: next.sceneType,
        characterName: next.characterName ?? null,
        characterDisplayName: next.characterDisplayName ?? null,
        characterImageUrl: null,
        maxTurns: next.maxTurns ?? null,
        openingMessage,
      },
    };
    persist();
    return response;
  },

  async submitUtterance(sessionId, body) {
    // LLM 왕복을 흉내낸다. C-6이 3초 이내면 기본 로더를 보여준다.
    await delay(900);
    assertOnline();

    const session = ensureSession(sessionId);
    const scene = findScene(session.currentSceneId);
    if (!scene || scene.sceneType !== "dialogue" || !scene.maxTurns) {
      throw new Error(
        `대화 장면이 아닙니다. currentSceneId=${session.currentSceneId} type=${scene?.sceneType} maxTurns=${scene?.maxTurns}`
      );
    }

    pushMessage(session, scene.id, "child", body.text);
    session.turnCount += 1;

    // --- 발화 분석 흉내 -------------------------------------------------
    // 실제로는 AI 서버가 사고 요소와 원문 근거를 뽑고, 백엔드가 원문 대조로 검증한다.
    // 목에서는 "짧으면 저정보, 아니면 부족한 요소 하나를 채운다"로 단순화한다.
    // 짧게 답하면 GUIDED, 길게 답하면 CLOSING까지 가는 흐름을 둘 다 볼 수 있다.
    const isLowInformation = body.text.replace(/\s/g, "").length < 5;
    const missingBefore = scene.requiredElements.filter(
      (el) => !session.accumulatedElements.includes(el)
    );
    const detected = isLowInformation ? [] : missingBefore.slice(0, 1);

    session.accumulatedElements.push(...detected);
    session.detectedElements.push(...detected);
    session.turnsWithoutNewElement = detected.length
      ? 0
      : session.turnsWithoutNewElement + 1;
    session.lowInformationTurns = isLowInformation
      ? session.lowInformationTurns + 1
      : 0;

    const missing = scene.requiredElements.filter(
      (el) => !session.accumulatedElements.includes(el)
    );

    // --- 진행 판단 — PRD 6.9. 판단 순서를 바꾸면 결과가 달라진다 ---------
    const turnsLeft = scene.maxTurns - session.turnCount;
    let mode: ResponseMode;

    // 1. 종료 조건
    if (
      (session.turnCount >= (scene.preferredTurns ?? 1) && missing.length === 0) ||
      session.turnCount >= scene.maxTurns
    ) {
      mode = "closing";
    }
    // 2. 강한 유도 제한 조건
    else if (
      session.turnCount === 1 ||
      detected.length > 0 ||
      session.previousMode === "guided"
    ) {
      mode = "normal";
    }
    // 3. 유도 필요성
    else if (
      missing.length > 0 &&
      (session.lowInformationTurns >= 2 ||
        session.turnsWithoutNewElement >= 2 ||
        turnsLeft <= 2)
    ) {
      mode = "guided";
    }
    // 4. 그 외
    else {
      mode = "normal";
    }

    session.previousMode = mode;

    // --- 캐릭터 응답 ----------------------------------------------------
    // CLOSING이면 AI를 호출하지 않고 고정 마지막 대사를 그대로 쓴다. (PRD I-01)
    const characterText =
      mode === "closing"
        ? (scene.characterClosing ?? "")
        : pick(
            REACTIONS[scene.characterName ?? ""]?.[mode] ?? [],
            session.turnCount
          );

    // 방금 만든 메시지의 id가 ③ GET /api/tts?messageId= 의 열쇠다.
    const characterMessage = pushMessage(session, scene.id, "character", characterText);

    // --- 미션 노출 판정 — 백엔드가 결정한다. AI가 정하지 않는다 ----------
    let missionTriggered: UtteranceResponse["missionTriggered"] = null;
    if (
      scene.missionId &&
      !session.missionRevealedScenes.has(scene.id) &&
      mode !== "closing" &&
      session.turnCount >= 1
    ) {
      session.missionRevealedScenes.add(scene.id);
      // 중복 노출 방지용 system 메시지. (PRD 7.6)
      pushMessage(session, scene.id, "system", `mission:${scene.missionId}`);
      const mission = MOCK_MISSIONS[scene.missionId];
      missionTriggered = {
        id: mission.id,
        title: mission.title,
        checklist: mission.checklist.map((item) => ({ ...item })),
      };
    }

    const next = mode === "closing" ? nextSceneOf(scene.id) : undefined;

    const response: UtteranceResponse = {
      responseMode: mode,
      characterMessage: characterText,
      messageId: characterMessage.id,
      characterName: scene.characterDisplayName ?? "",
      accumulatedElements: [...session.accumulatedElements],
      turnCount: session.turnCount,
      maxTurns: scene.maxTurns ?? null,
      sceneEnded: mode === "closing",
      nextSceneId: next?.id ?? null,
      missionTriggered,
      highlightWords: highlightWordsIn(characterText),
    };

    /**
     * 장면이 닫혔으면 **여기서 세션을 옮긴다.** 응답을 만든 뒤에 옮기는 이유는
     * 위 응답이 이번 턴의 turnCount·누적 요소를 담아야 하기 때문이다.
     *
     * 실서버가 이 자리에서 `session.advanceToScene()`을 부른다
     * (`MessageServiceImpl`). 그래서 프론트는 `.../complete`를 부르지 않고
     * `GET /sessions/{id}`만 다시 읽는다. 목이 이걸 흉내내지 않으면
     * **장면 전환 코드가 목에서만 다른 길을 타게 된다.**
     */
    if (mode === "closing") {
      if (next) resetSceneState(session, next.id);
      // 마지막 대화 장면이 닫혔다. 후속 활동 진입 신호는 이 상태값이다.
      else session.status = "post_activity";
    }

    persist();
    return response;
  },
};

export const mockActivityApi: ActivityApi = {
  async getActivity(sessionId) {
    await delay(150);
    assertOnline();
    const session = ensureSession(sessionId);
    session.status = "post_activity";

    if (!session.cardOrder) session.cardOrder = shuffleCards(sessionId);
    persist();

    const byId = new Map<string, { text: string }>(
      MOCK_POST_ACTIVITY.cards.map((c) => [c.id, { text: c.text }])
    );
    return {
      // correctOrder를 빼고 내려준다. 프론트는 정답 순서를 알지 못한다.
      cards: session.cardOrder.map((id) => ({
        id,
        text: byId.get(id)?.text ?? "",
        // 카드 이미지는 전개 이미지에서 크롭한다. 미수령이라 null. (assets.md §2-5)
        imageUrl: null,
      })),
      attemptCount: session.attemptCount,
    };
  },

  async submitOrder(sessionId, submittedOrder) {
    await delay(400);
    assertOnline();
    const session = ensureSession(sessionId);
    session.attemptCount += 1;
    persist();

    // 정답 판정은 서버가 한다. 프론트 판정을 허용하지 않는다. (PRD 8.11)
    const correct = [...MOCK_POST_ACTIVITY.cards]
      .sort((a, b) => a.correctOrder - b.correctOrder)
      .map((c) => c.id);
    const isCorrect = submittedOrder.join() === correct.join();

    /**
     * 3회째 오답이면 정답 순서를 함께 내려보내 다음 단계로 넘긴다. (D-10)
     *
     * 기록은 사실대로 `is_order_correct = false`로 남는다 — 통과시킨 것은
     * 화면 흐름이고, 맞혔다고 기록하는 게 아니다. 이 목에는 리포트가 읽는
     * 필드가 없어 저장까지는 재현하지 않는다.
     */
    const revealAnswer = !isCorrect && session.attemptCount >= ORDER_ATTEMPT_LIMIT;

    /**
     * ⚠️ 없는 값은 **키 자체를 빼고** 보낸다. 실서버가 `@JsonInclude(NON_NULL)`이라
     *    `null`이 아니라 키가 없다. 목이 null로 채워 보내면 `"correctOrder" in result`
     *    같은 검사가 목에서만 통하고 실연동에서 어긋난다.
     *    (backend/docs/api-spec.md 8.2)
     */
    const result: OrderResult = {
      isCorrect,
      attemptCount: session.attemptCount,
    };
    if (isCorrect || revealAnswer) {
      result.retellingKeywords = [...MOCK_POST_ACTIVITY.retellingKeywords];
    }
    if (revealAnswer) result.correctOrder = correct;
    return result;
  },

  async submitRetelling(sessionId, body) {
    await delay(400);
    assertOnline();
    const session = ensureSession(sessionId);
    session.status = "completed";
    session.retellingText = body.retellingText;
    session.completedAt = new Date().toISOString();
    pushMessage(session, session.currentSceneId, "child", body.retellingText);
    persist();

    const childCount = session.messages.filter(
      (m) => m.speakerType === "child"
    ).length;
    const characters = new Set(
      MOCK_SCENES.map((s) => s.characterName).filter(Boolean)
    );

    return {
      sessionStatus: "completed",
      completedAt: new Date().toISOString(),
      stats: {
        childUtteranceCount: childCount,
        characterCount: characters.size,
        // 단어장은 선택 요건이라 아직 없다. (Q-06)
        newWordCount: 0,
      },
      // 보호자 리포트는 선택 요건(O-01). 미구현이므로 false.
      reportAvailable: false,
    };
  },
};

/** 개발 편의용 — 세션을 처음 상태로 되돌린다. */
export function resetMockSession(sessionId: string) {
  sessions.delete(sessionId);
  persist();
}

/** 데모 초기화 — 모든 세션을 지운다. */
export function resetAllMockSessions() {
  sessions.clear();
  sessionSeq = 0;
  persist();
}

/**
 * B-1 이어하기 카드용. 해당 아이의 진행 중 세션 중 최신 1건.
 *
 * 이어하기 세션이 여러 개일 때 `last_activity_at` 최신 1건만 노출한다.
 * (screens.md B-1 체크리스트)
 *
 */
export function activeMockSession(childId: string): MockSessionView | null {
  return (
    mockSessionsOf(childId).find(
      (s) => s.status === "in_progress" || s.status === "stopped"
    ) ?? null
  );
}

/**
 * 세션을 읽기 전용으로 넘겨준다. B-2 배지·B-3 이어하기·F-1 통계가 모두 세션에서
 * 나오는데, 그 화면들의 목이 이 Map을 직접 만지면 경계가 무너진다.
 * 최신 활동 순으로 정렬해 준다.
 */
export type MockSessionView = {
  sessionId: string;
  storyId: string;
  status: SessionStatus;
  currentSceneOrder: number;
  sceneProgress: { current: number; total: number };
  lastActivityAt: string;
  retellingText: string | null;
  completedAt: string | null;
  childUtteranceCount: number;
  /** 활동한 날짜(YYYY-MM-DD) 목록 — F-1 "함께한 날" */
  activityDates: string[];
  /** 아이 발화 원문 + 장면 — G-2 근거 발화, G-3 대표 발화 */
  childMessages: { text: string; sceneIndex: number; createdAt: string }[];
  /** 세션 전체 사고 요소 — G-2 집계 */
  detectedElements: string[];
};

export function mockSessionsOf(childId: string): MockSessionView[] {
  hydrate();
  return [...sessions.values()]
    .filter((s) => s.childId === childId)
    .sort((a, b) => b.lastActivityAt - a.lastActivityAt)
    .map((session) => {
      const scene = findScene(session.currentSceneId) ?? MOCK_SCENES[0];
      const dates = new Set(
        session.messages.map((m) => m.createdAt.slice(0, 10))
      );
      return {
        sessionId: session.sessionId,
        storyId: STORY_ID,
        status: session.status,
        currentSceneOrder: scene.sceneOrder,
        sceneProgress: {
          current: toScreenIndex(scene.sceneOrder),
          total: TOTAL_SCREEN_SCENES,
        },
        lastActivityAt: new Date(session.lastActivityAt).toISOString(),
        retellingText: session.retellingText,
        completedAt: session.completedAt,
        childUtteranceCount: session.messages.filter(
          (m) => m.speakerType === "child"
        ).length,
        activityDates: [...dates],
        childMessages: session.messages
          .filter((m) => m.speakerType === "child")
          .map((m) => ({
            text: m.text,
            sceneIndex: toScreenIndex(
              findScene(m.sceneId)?.sceneOrder ?? 1
            ),
            createdAt: m.createdAt,
          })),
        detectedElements: [...session.detectedElements],
      };
    });
}
