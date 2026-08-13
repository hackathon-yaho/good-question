/**
 * 실서버 연동 배선 검증 — `?api=backend`
 *
 * 다른 스위트는 목으로 돈다. 이 스위트만 **실 HTTP 클라이언트 경로**를 태워
 * 프론트가 실제로 어떤 요청을 보내는지 확인한다.
 *
 * 백엔드를 띄우지 않고 `page.route`로 가로채 **경로·메서드·본문·쿼리**를
 * 명세(backend/docs/api-spec.md)와 대조한다. 여기서 잡히는 것은 경로 오타,
 * 빠진 쿼리 파라미터, 잘못된 메서드처럼 **실연동 첫 순간에 터지는 종류**다.
 *
 * 응답 본문은 명세의 예시를 그대로 쓴다. 화면이 그 모양을 실제로 그릴 수 있는지도
 * 함께 확인된다 — 필드명이 하나라도 다르면 화면이 비거나 터진다.
 */

import { chromium } from "playwright-core";

import { SHOT, BASE, chromeExecutable } from "./_browser.mjs";

const browser = await chromium.launch({
  executablePath: chromeExecutable(),
  headless: true,
});
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  permissions: ["microphone"],
});
const page = await ctx.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

let fails = 0;
const ok = (cond, label, extra = "") => {
  if (!cond) fails += 1;
  console.log(`  ${cond ? "OK  " : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};

/* ── 백엔드 응답 (api-spec.md 예시 그대로) ───────────────────────── */

const CHILD_ID = "3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5";
const STORY_ID = "c1143ded-ed81-4b79-b4c0-c12c2694d5ab";
const SESSION_ID = "58291471-0cc9-4f21-b80d-b576901ab1ae";

const CHILD = {
  id: CHILD_ID,
  name: "민준",
  birthYear: 2018,
  age: 8,
  avatarId: "color3",
  consentGranted: true,
  lastActivityAt: "2026-08-12T10:58:29.018091Z",
  registeredAt: "2026-08-01T10:00:00Z",
};

/**
 * 장면 3개짜리 축소 이야기. 진행 상태를 서버처럼 들고 있어야
 * "대화 장면이 닫히면 서버가 알아서 다음으로 옮긴다"를 재현할 수 있다.
 */
const SCENES = [
  {
    sceneId: "sc-1",
    sceneOrder: 1,
    sceneType: "intro",
    sceneDescription: "옛날 어느 마을에 방귀를 크게 뀌는 며느리가 살았습니다.",
    maxTurns: null,
  },
  {
    sceneId: "sc-2",
    sceneOrder: 2,
    sceneType: "narrative",
    sceneDescription: "며느리는 방귀를 꾹 참고 또 참았습니다.",
    maxTurns: null,
  },
  {
    sceneId: "sc-3",
    sceneOrder: 3,
    sceneType: "dialogue",
    sceneDescription: "며느리가 아이에게 마음을 털어놓습니다.",
    maxTurns: 2,
  },
];

const server = { sceneIndex: 0, turnCount: 0, status: "in_progress", messages: [] };

function sceneInfo(scene) {
  const dialogue = scene.sceneType === "dialogue";
  return {
    sceneId: scene.sceneId,
    sceneOrder: scene.sceneOrder,
    sceneType: scene.sceneType,
    sceneDescription: scene.sceneDescription,
    characterName: dialogue ? "ch_banggui_daughter_in_law" : null,
    characterDisplayName: dialogue ? "방귀쟁이 며느리" : null,
    characterImageUrl: null,
    backgroundImageUrl: null,
    maxTurns: scene.maxTurns,
    sceneClosed: false,
    missionRevealed: false,
  };
}

function snapshot() {
  const scene = SCENES[server.sceneIndex];
  return {
    sessionId: SESSION_ID,
    storyId: STORY_ID,
    status: server.status,
    currentSceneId: scene.sceneId,
    currentSceneOrder: scene.sceneOrder,
    totalScenes: 4,
    turnCount: server.turnCount,
    maxTurns: scene.maxTurns,
    accumulatedElements: [],
    messages: server.messages,
    currentScene: sceneInfo(scene),
  };
}

/** 실제로 백엔드로 나간 요청 기록 */
const calls = [];

await page.route("**/localhost:8080/api/**", async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname.replace(/^\/api/, "");
  let body = null;
  try {
    body = request.postData() ? JSON.parse(request.postData()) : null;
  } catch {
    body = "(non-json)";
  }
  calls.push({
    method: request.method(),
    path,
    query: url.search,
    body,
  });

  const json = (data, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(data),
    });

  // 라우팅은 명세의 경로 그대로 분기한다. 프론트가 다른 경로로 부르면
  // 아래 어디에도 걸리지 않고 404가 되어 화면이 비므로 곧 드러난다.
  if (path === "/auth/me") {
    return json({
      id: "2f42506f-85e8-4b3d-a35a-0bd931b2517b",
      name: "보호자",
      email: "parent@example.com",
      hasCompletedOnboarding: true,
    });
  }
  if (path === "/children" && request.method() === "GET") {
    return json({ children: [CHILD], limit: 3 });
  }
  if (path === "/home") {
    return json({
      child: { id: CHILD_ID, name: "민준", avatarId: "color3" },
      inProgress: null,
      recommended: [
        {
          id: STORY_ID,
          title: "방귀 뀌는 며느리",
          coverImageUrl: null,
          estimatedMinutes: 20,
          topics: ["다름", "자기이해", "장점 발견"],
        },
      ],
    });
  }
  if (path === "/stories" && request.method() === "GET") {
    return json({
      stories: [
        {
          id: STORY_ID,
          title: "방귀 뀌는 며느리",
          summary: "큰 방귀를 부끄러워하던 며느리가…",
          coverImageUrl: null,
          estimatedMinutes: 20,
          difficulty: "보통",
          topics: ["다름", "자기이해", "장점 발견"],
          sessionStatus: null,
        },
      ],
      availableTopics: ["다름", "자기이해", "장점 발견"],
    });
  }
  if (path === `/stories/${STORY_ID}`) {
    return json({
      id: STORY_ID,
      title: "방귀 뀌는 며느리",
      summary: "큰 방귀를 부끄러워하던 며느리가…",
      coverImageUrl: null,
      estimatedMinutes: 20,
      difficulty: "보통",
      topics: ["다름", "자기이해", "장점 발견"],
      intro: "옛날 어느 마을에 방귀를 아주 크게 뀌는 며느리가 살았습니다.",
      situation: "큰 방귀 때문에 며느리가 집에서 쫓겨날 위기에 놓였어요.",
      childRole: "며느리의 방귀가 특별한 장점이 될 수 있도록 도와주세요.",
      characters: [
        {
          name: "ch_banggui_daughter_in_law",
          displayName: "방귀쟁이 며느리",
          imageUrl: null,
        },
      ],
      existingSession: null,
    });
  }
  if (path === "/wordbook" && request.method() === "GET") {
    return json({
      words: [
        {
          id: "0c24e902-a89b-46bb-ae33-ba1e3c94f5a1",
          word: "부끄러워",
          meaning: "남에게 보이기 부끄럽고 수줍은 마음",
          storyId: STORY_ID,
          storyTitle: "방귀 뀌는 며느리",
          sceneIndex: 4,
          contextSentence: "이제는 부끄러워하며 숨기지 않고…",
          liked: false,
          savedAt: "2026-08-12T11:08:42.037387Z",
          isNew: true,
        },
      ],
      total: 1,
      storyFilters: [{ storyId: STORY_ID, title: "방귀 뀌는 며느리" }],
    });
  }
  if (path === "/mypage") {
    return json({
      child: { id: CHILD_ID, name: "민준", avatarId: "color3", age: 8 },
      stats: { completedStories: 2, savedWords: 1, activeDays: 1 },
      completedStories: [
        {
          sessionId: SESSION_ID,
          storyId: STORY_ID,
          title: "방귀 뀌는 며느리",
          coverImageUrl: null,
          completedAt: "2026-08-12T12:01:54.409122Z",
        },
      ],
      retellings: [
        {
          sessionId: SESSION_ID,
          storyTitle: "방귀 뀌는 며느리",
          text: "옛날에 며느리가 방귀를 오래 참다가…",
          createdAt: "2026-08-12T12:01:54.409122Z",
        },
      ],
    });
  }
  if (path === "/parent/summary") {
    return json({
      child: { id: CHILD_ID, name: "민준", avatarId: "color3", age: 8 },
      thisWeekCount: 2,
      completedStories: 2,
      avgChildSentences: 1.6,
      hasRecords: true,
    });
  }
  if (path === "/parent/reports" && request.method() === "GET") {
    return json({
      children: [{ id: CHILD_ID, name: "민준" }],
      weeklyTrend: [
        { weekLabel: "3주 전", utteranceCount: 0 },
        { weekLabel: "2주 전", utteranceCount: 0 },
        { weekLabel: "1주 전", utteranceCount: 0 },
        { weekLabel: "이번 주", utteranceCount: 36 },
      ],
      trendMessage: "기록이 조금씩 모이고 있어요",
      reports: [
        {
          sessionId: SESSION_ID,
          storyTitle: "방귀 뀌는 며느리",
          coverImageUrl: null,
          date: "2026.08.12",
          status: "completed",
        },
      ],
    });
  }

  if (path === "/children" && request.method() === "POST") {
    return json(CHILD, 201);
  }
  if (path === `/children/${CHILD_ID}`) {
    return request.method() === "DELETE"
      ? route.fulfill({ status: 204, body: "" })
      : json({ ...CHILD, name: body?.name ?? CHILD.name });
  }

  /* ── 세션·대화 ─────────────────────────────────────────────────── */

  if (path === "/sessions" && request.method() === "POST") {
    return json(snapshot(), 201);
  }
  if (path === `/sessions/${SESSION_ID}` && request.method() === "GET") {
    return json(snapshot());
  }
  if (path === `/sessions/${SESSION_ID}` && request.method() === "PATCH") {
    server.status = "stopped";
    return json({ status: "stopped" });
  }
  if (path.endsWith("/complete")) {
    // 서술 장면만 여기로 온다. 프론트가 dialogue에 부르면 실서버는 400이다.
    const current = SCENES[server.sceneIndex];
    if (current.sceneType === "dialogue") {
      return json(
        { code: "INVALID_REQUEST", message: "대화 장면은 complete로 넘길 수 없습니다" },
        400
      );
    }
    server.sceneIndex += 1;
    server.turnCount = 0;
    const next = SCENES[server.sceneIndex];
    let openingMessage = null;
    if (next.sceneType === "dialogue") {
      openingMessage = {
        id: "msg-open",
        sceneId: next.sceneId,
        speakerType: "character",
        turnOrder: 1,
        text: "\"민준아, 내 방귀가 너무 크다는 걸 알면 어떡하지?\"",
        createdAt: "2026-08-12T10:20:00Z",
      };
      server.messages = [...server.messages, openingMessage];
    }
    return json({
      nextScene: {
        sceneId: next.sceneId,
        sceneOrder: next.sceneOrder,
        sceneType: next.sceneType,
        characterName: openingMessage ? "ch_banggui_daughter_in_law" : null,
        characterDisplayName: openingMessage ? "방귀쟁이 며느리" : null,
        characterImageUrl: null,
        maxTurns: next.maxTurns,
        openingMessage,
      },
    });
  }
  if (path.endsWith("/messages") && request.method() === "POST") {
    server.turnCount += 1;
    const scene = SCENES[server.sceneIndex];
    const closing = server.turnCount >= (scene.maxTurns ?? 1);
    const message = {
      id: `msg-${server.turnCount}`,
      sceneId: scene.sceneId,
      speakerType: "character",
      turnOrder: server.messages.length + 2,
      text: closing ? "\"이제는 숨기지 않을게.\"" : "정말? 그렇게 생각해 주니 고마워.",
      createdAt: "2026-08-12T10:21:00Z",
    };
    server.messages = [...server.messages, message];
    if (closing) {
      // 실서버가 이 자리에서 세션을 옮긴다. 마지막 장면이면 후속 활동으로.
      server.status = "post_activity";
    }
    return json({
      responseMode: closing ? "closing" : "normal",
      characterMessage: message.text,
      characterName: "방귀쟁이 며느리",
      accumulatedElements: ["PERSPECTIVE"],
      turnCount: server.turnCount,
      maxTurns: scene.maxTurns,
      sceneEnded: closing,
      nextSceneId: null,
      missionTriggered: null,
      highlightWords: [],
      messageId: message.id,
    });
  }

  /* ── 후속 활동 ─────────────────────────────────────────────────── */

  if (path.endsWith("/activity") && request.method() === "GET") {
    return json({
      cards: [
        { id: "card_2", text: "며느리의 큰 방귀에 갓이 날아갔어요.", imageUrl: null },
        { id: "card_1", text: "며느리는 방귀를 꾹 참았어요.", imageUrl: null },
        { id: "card_4", text: "시아버지가 미안하다고 말했어요.", imageUrl: null },
        { id: "card_3", text: "배나무의 배가 우수수 떨어졌어요.", imageUrl: null },
      ],
      attemptCount: 0,
    });
  }
  if (path.endsWith("/activity/order")) {
    // 정답 여부와 무관하게 통과시킨다. 여기서 볼 것은 **본문 모양**이다.
    return json({
      isCorrect: true,
      attemptCount: 1,
      retellingKeywords: ["며느리", "방귀", "배나무", "시아버지"],
    });
  }
  if (path.endsWith("/activity/retelling")) {
    return json({
      sessionStatus: "completed",
      completedAt: "2026-08-12T12:01:54.409122Z",
      stats: { childUtteranceCount: 2, characterCount: 1, newWordCount: 0 },
      reportAvailable: true,
    });
  }

  /* ── 단어장 쓰기 ───────────────────────────────────────────────── */

  if (path === "/wordbook" && request.method() === "POST") {
    return json(
      {
        id: "wb-1",
        word: body?.word ?? "",
        meaning: body?.meaning ?? "",
        storyId: STORY_ID,
        storyTitle: "방귀 뀌는 며느리",
        sceneIndex: 1,
        contextSentence: body?.contextSentence ?? null,
        liked: false,
        savedAt: "2026-08-12T11:08:42Z",
        isNew: true,
      },
      201
    );
  }
  if (path.startsWith("/wordbook/") && request.method() === "PATCH") {
    return json({
      id: "wb-1",
      word: "부끄러워",
      meaning: "남에게 보이기 부끄럽고 수줍은 마음",
      storyId: STORY_ID,
      storyTitle: "방귀 뀌는 며느리",
      sceneIndex: 4,
      contextSentence: null,
      liked: body?.liked ?? false,
      savedAt: "2026-08-12T11:08:42Z",
      isNew: true,
    });
  }

  // 여기 안 걸린 경로는 프론트가 명세와 다르게 부른 것이다.
  return json({ code: "NOT_FOUND", message: `미정의 경로: ${path}` }, 404);
});

const seen = (method, path) =>
  calls.some((c) => c.method === method && c.path === path);
const lastOf = (path) => calls.filter((c) => c.path === path).at(-1);

/* ── A-5 아이 선택 ───────────────────────────────────────────────── */

console.log("=== GET /children (A-5) ===");
await page.goto(`${BASE}/profiles?api=backend`, { waitUntil: "networkidle" });
await page.getByText("민준").first().waitFor({ timeout: 8000 }).catch(() => {});
ok(seen("GET", "/children"), "GET /children 호출");
ok(await page.getByText("민준").first().isVisible(), "서버 응답으로 아이 카드 렌더");

/* ── B-1 홈 ──────────────────────────────────────────────────────── */

console.log("\n=== GET /home (B-1) ===");
await page.getByText("민준").first().click();
await page.waitForURL("**/home**", { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(700);
ok(seen("GET", "/home"), "GET /home 호출");
/**
 * 실서버 응답에는 `starDust`가 없다(백엔드가 노출하지 않는다). 그때 칩이 숨어야 한다 —
 * "별가루 0"을 보여주면 아이가 모은 것이 사라진 것처럼 읽힌다. (계획 D4)
 */
ok(
  (await page.getByText(/별가루/).count()) === 0,
  "starDust 필드가 없으면 별가루 칩을 숨긴다"
);
ok(
  lastOf("/home")?.query.includes(`childId=${CHILD_ID}`),
  "childId 쿼리 포함",
  lastOf("/home")?.query
);

/* ── B-2 이야기 목록 ─────────────────────────────────────────────── */

console.log("\n=== GET /stories (B-2·B-3) ===");
await page.goto(`${BASE}/stories?api=backend`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);
ok(seen("GET", "/stories"), "GET /stories 호출");
ok(
  lastOf("/stories")?.query.includes("childId="),
  "childId 쿼리 포함 (sessionStatus 계산용)"
);
ok(
  await page.getByText("방귀 뀌는 며느리").first().isVisible(),
  "서버 응답으로 목록 렌더"
);

await page.goto(`${BASE}/stories/${STORY_ID}?api=backend`, {
  waitUntil: "networkidle",
});
await page.waitForTimeout(700);
ok(seen("GET", `/stories/${STORY_ID}`), "GET /stories/{id} 호출");
ok(
  await page.getByText("큰 방귀 때문에 며느리가").first().isVisible(),
  "situation·childRole 렌더 (Q-03 확정 문구)"
);

/* ── E-1 단어장 ──────────────────────────────────────────────────── */

console.log("\n=== GET /wordbook (E-1) ===");
await page.goto(`${BASE}/wordbook?api=backend`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);
ok(seen("GET", "/wordbook"), "GET /wordbook 호출");
ok(
  lastOf("/wordbook")?.query.includes("filter=all"),
  "filter 기본값 all",
  lastOf("/wordbook")?.query
);
ok(await page.getByText("부끄러워").first().isVisible(), "단어 카드 렌더");

/* ── F-1 마이페이지 ─────────────────────────────────────────────── */

console.log("\n=== GET /mypage (F-1) ===");
await page.goto(`${BASE}/mypage?api=backend`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);
ok(seen("GET", "/mypage"), "GET /mypage 호출");
const mypageBody = await page.locator("body").innerText();
ok(!mypageBody.includes("내 목소리로"), "음성 미저장 정책 문구 유지 (Q-07)");

/* ── A-6 · G-1 보호자 ───────────────────────────────────────────── */

console.log("\n=== GET /parent/* (A-6·G-1) ===");
await page.goto(`${BASE}/parent?api=backend`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);
ok(seen("GET", "/parent/summary"), "GET /parent/summary 호출");

await page.goto(`${BASE}/parent/reports?api=backend`, {
  waitUntil: "networkidle",
});
await page.waitForTimeout(700);
ok(seen("GET", "/parent/reports"), "GET /parent/reports 호출");
ok(
  await page.getByText("2026.08.12").first().isVisible(),
  "서버가 가공한 date 문자열을 그대로 표시"
);

/* ── H-1 계정 — 전용 엔드포인트가 없어 /auth/me로 대신한다 ──────── */

console.log("\n=== H-1 계정 (엔드포인트 없음 → /auth/me) ===");
await page.goto(`${BASE}/parent/settings?api=backend`, {
  waitUntil: "networkidle",
});
await page.waitForTimeout(700);
ok(seen("GET", "/auth/me"), "GET /auth/me로 계정 정보 대체");
ok(
  await page.getByText("parent@example.com").first().isVisible(),
  "이메일 표시"
);
ok(await page.getByText("카카오").first().isVisible(), "연결된 로그인 = 카카오");

/* ── 대화 흐름 (POST 계열 · 본문 모양) ──────────────────────────── */

console.log("\n=== 세션·대화 (POST) ===");
await page.addInitScript(() => {
  if (window.speechSynthesis) {
    window.speechSynthesis.speak = (u) =>
      setTimeout(() => u.onend && u.onend(new Event("end")), 30);
    window.speechSynthesis.cancel = () => {};
    window.speechSynthesis.getVoices = () => [];
  }
  class Stub {
    constructor() { window.__rec = this; }
    start() { setTimeout(() => this.onstart && this.onstart(), 5); }
    stop() {
      const t = window.__pending;
      window.__pending = undefined;
      if (t) {
        const alt = { transcript: t, confidence: 1 };
        const res = { 0: alt, length: 1, isFinal: true, item: () => alt };
        this.onresult && this.onresult({ resultIndex: 0, results: { 0: res, length: 1, item: () => res } });
      }
      setTimeout(() => this.onend && this.onend(), 10);
    }
    abort() {}
  }
  window.SpeechRecognition = Stub;
  window.webkitSpeechRecognition = Stub;
  window.__say = (t) => { window.__pending = t; window.__rec?.stop(); };
});

await page.goto(`${BASE}/stories/${STORY_ID}?api=backend`, {
  waitUntil: "networkidle",
});
await page.getByRole("button", { name: "이야기 시작하기" }).click({ timeout: 8000 });
await page.waitForURL("**/play/**", { timeout: 10000 }).catch(() => {});
ok(seen("POST", "/sessions"), "POST /sessions 호출");
const createBody = lastOf("/sessions")?.body;
ok(
  createBody?.childId === CHILD_ID && createBody?.storyId === STORY_ID,
  "본문에 childId·storyId",
  JSON.stringify(createBody)
);

// 도입 → 전개 → 대화까지 진행. 서술 장면만 complete를 타야 한다.
await page.getByText("탭하면 이야기가 시작돼요").click({ timeout: 8000 }).catch(() => {});
let said = false;
for (let step = 0; step < 60; step += 1) {
  if (new URL(page.url()).pathname.startsWith("/activity/")) break;
  const body = await page.locator("body").innerText();
  if (body.includes("계속하기")) {
    await page.getByRole("button", { name: "계속하기" }).click().catch(() => {});
  } else if (body.includes("이제 말해 볼까?")) {
    await page.evaluate(() => window.__say("며느리가 창피해서 참았던 것 같아요"));
    said = true;
  } else if (body.includes("이렇게 말한 게 맞아?")) {
    await page.getByRole("button", { name: "보내기" }).click().catch(() => {});
  } else if (body.includes("다음") || body.includes("이야기 시작하기")) {
    const b = page.getByRole("button", { name: /다음|이야기 시작하기/ });
    if (await b.count()) await b.first().click().catch(() => {});
  }
  await page.waitForTimeout(300);
}
ok(said, "대화 장면(C-4) 도달");

const completes = calls.filter((c) => c.path.endsWith("/complete"));
ok(completes.length > 0, "서술 장면은 complete로 넘김", `${completes.length}회`);
ok(
  completes.every((c) => c.method === "POST" && /^\/sessions\/[^/]+\/scenes\/[^/]+\/complete$/.test(c.path)),
  "경로 형태 /sessions/{id}/scenes/{sceneId}/complete"
);
ok(
  completes.every((c) => !c.path.includes("/sc-3/")),
  "**대화 장면에는 complete를 부르지 않음** (실서버는 400)"
);

ok(seen("POST", `/sessions/${SESSION_ID}/messages`), "POST /messages 호출");
const msgBody = calls.filter((c) => c.path.endsWith("/messages")).at(-1)?.body;
ok(typeof msgBody?.text === "string" && msgBody.text.length > 0, "본문에 text");
ok("sttRawText" in (msgBody ?? {}), "본문에 sttRawText (원문 보존)");

// 대화가 닫힌 뒤 재조회로 넘어갔는지 — 세션 조회가 여러 번 있어야 한다.
const sessionReads = calls.filter(
  (c) => c.method === "GET" && c.path === `/sessions/${SESSION_ID}`
);
ok(sessionReads.length >= 2, "장면 전환마다 세션 재조회", `${sessionReads.length}회`);
ok(
  new URL(page.url()).pathname.startsWith("/activity/"),
  "status=post_activity → /activity 이동",
  new URL(page.url()).pathname
);

/* ── 후속 활동 (POST 본문) ──────────────────────────────────────── */

console.log("\n=== 후속 활동 (POST) ===");
await page.waitForTimeout(600);
ok(seen("GET", `/sessions/${SESSION_ID}/activity`), "GET /activity 호출");
await page.getByRole("button", { name: "시작하기" }).click({ timeout: 8000 });
await page.getByText("이야기 순서대로 놓아볼까?").waitFor({ timeout: 8000 });
for (let i = 0; i < 4; i += 1) {
  await page.locator("button.touch-none").first().click();
  await page.waitForTimeout(100);
}
await page.getByRole("button", { name: "확인하기" }).click();
await page.waitForTimeout(800);
const orderBody = calls.filter((c) => c.path.endsWith("/activity/order")).at(-1)?.body;
ok(Array.isArray(orderBody?.submittedOrder), "order 본문이 { submittedOrder: [] }");
ok(orderBody?.submittedOrder?.length === 4, "카드 4개 전송", `${orderBody?.submittedOrder?.length}개`);

await page.getByRole("button", { name: "이야기 말하기" }).click({ timeout: 8000 });
await page.getByText("이야기를 처음부터 들려줘").waitFor({ timeout: 8000 });
// D-5는 마이크가 자동 시작되지 않는다. 눌러야 인식이 열린다.
await page.locator("button[aria-label]").first().click();
await page.waitForTimeout(300);
await page.evaluate(() => window.__say("며느리가 방귀를 참다가 배나무의 배를 떨어뜨렸어요."));
await page.getByRole("button", { name: "이야기 완성하기" }).waitFor({ timeout: 8000 });
await page.getByRole("button", { name: "이야기 완성하기" }).click();
await page.waitForTimeout(800);
const retellBody = calls.filter((c) => c.path.endsWith("/activity/retelling")).at(-1)?.body;
ok(
  typeof retellBody?.retellingText === "string" && retellBody.retellingText.length > 0,
  "retelling 본문이 { retellingText }"
);

/* ── C-13 이야기 나가기 ─────────────────────────────────────────── */

console.log("\n=== C-13 이야기 나가기 (PATCH) ===");
server.sceneIndex = 2;
server.status = "in_progress";
await page.goto(`${BASE}/play/${SESSION_ID}?api=backend`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "잠시 멈춤" }).click({ timeout: 10000 }).catch(() => {});
await page.getByRole("button", { name: /이야기 나가기/ }).click({ timeout: 8000 }).catch(() => {});
await page.waitForTimeout(900);
const stopCall = calls.filter((c) => c.method === "PATCH" && c.path === `/sessions/${SESSION_ID}`).at(-1);
ok(stopCall !== undefined, "PATCH /sessions/{id} 호출 — 세션을 stopped로 저장");
ok(stopCall?.body?.status === "stopped", "본문이 { status: \"stopped\" }", JSON.stringify(stopCall?.body));

/* ── 단어장 쓰기 · 아이 등록 (본문 모양) ────────────────────────── */

console.log("\n=== 단어장 · 아이 등록 (POST/PATCH) ===");
await page.goto(`${BASE}/wordbook?api=backend`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
const likeButton = page.getByRole("button", { name: /좋아하는 단어/ }).first();
if (await likeButton.count()) {
  await likeButton.click();
  await page.waitForTimeout(500);
}
const likeCall = calls.filter((c) => c.method === "PATCH" && c.path.startsWith("/wordbook/")).at(-1);
ok(likeCall !== undefined, "PATCH /wordbook/{id} 호출");
ok(typeof likeCall?.body?.liked === "boolean", "본문이 { liked: boolean }", JSON.stringify(likeCall?.body));

await page.goto(`${BASE}/onboarding/child?api=backend`, { waitUntil: "networkidle" });
await page.getByLabel("이름").fill("민준").catch(() => {});
await page.waitForTimeout(300);

console.log("\n=== 명세 밖 경로 호출 없음 ===");
/**
 * 명세에 있는 경로들. 세션 경로는 id가 들어가므로 패턴으로 판정한다.
 * 여기 없는 경로를 프론트가 부르면 실서버에서 404가 된다.
 */
const KNOWN_PATHS = [
  "/auth/me",
  "/children",
  "/children/{id}",
  "/home",
  "/stories",
  "/stories/{id}",
  "/wordbook",
  "/wordbook/{id}",
  "/mypage",
  "/parent/summary",
  "/parent/reports",
  "/parent/reports/{id}",
  "/sessions",
  "/sessions/{id}",
  "/sessions/{id}/messages",
  "/sessions/{id}/scenes/{id}/complete",
  "/sessions/{id}/activity",
  "/sessions/{id}/activity/order",
  "/sessions/{id}/activity/retelling",
].map(
  (template) =>
    new RegExp(`^${template.split("{id}").map(escapeRegExp).join("[^/]+")}$`)
);

function escapeRegExp(part) {
  return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const unknown = calls.filter((c) => !KNOWN_PATHS.some((re) => re.test(c.path)));
ok(
  unknown.length === 0,
  "가로채지 못한 경로 없음",
  unknown.map((c) => `${c.method} ${c.path}`).join(", ")
);
console.log(
  `  호출 ${calls.length}건: ${[...new Set(calls.map((c) => `${c.method} ${c.path}`))].join(", ")}`
);

if (errors.length) {
  console.log("\n=== 에러 ===");
  [...new Set(errors)].slice(0, 8).forEach((e) => console.log("  " + e));
}
console.log(`\n${fails === 0 ? "전부 통과" : `실패 ${fails}건`}`);
await page.screenshot({ path: SHOT("wiring-backend") });
await browser.close();
