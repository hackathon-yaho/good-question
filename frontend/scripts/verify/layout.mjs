/**
 * 레이아웃 검증 — 태블릿 해상도에서 버튼이 2줄로 깨지거나 넘치지 않는지.
 *
 * 왜 필요한가: C-5의 "다시 말하기"가 태블릿에서 2줄로 깨졌는데, 기능 검증은
 * 전부 통과하고 있었다. 버튼을 **누를 수 있는지**만 봤고 **어떻게 보이는지**는
 * 아무도 안 봤기 때문이다. 라벨 한 글자만 길어져도 같은 일이 또 난다.
 *
 * 판정 기준
 *   - 버튼 라벨이 두 줄 이상 → 실패
 *   - 라벨이 버튼 박스를 넘침(nowrap이라 넘치면 잘린다) → 실패
 *   - 여유가 8px 미만 → 경고. 지금은 통과지만 라벨이 바뀌면 깨진다
 *   - 문서 폭이 창보다 넓음(가로 스크롤) → 실패
 *
 * 미션(C-10)은 따로 본다. 우측 패널 하나에 미션 카드와 마이크가 함께 들어가야 해서
 * 겹침이 가장 잘 나는 자리다. 실제로 마이크가 말풍선·푸터 위로 삐져나와 있었다.
 *   - 대화 패널 내용이 잘림 → 실패
 *   - 체크리스트 4개 중 안 보이는 것 있음 → 실패
 *   - 마이크가 정원이 아니거나 72px 미만(§1-4) → 실패
 *
 * 푸터도 본다. `height: min(100%, …)`를 높이가 auto인 푸터에 쓴 적이 있는데,
 * 순환 참조가 되어 푸터가 130px → 354px로 부풀고 내용이 위쪽에 몰렸다.
 * 겹치지도 잘리지도 않아 기존 검사를 전부 통과했다.
 *   - 푸터 안에 쓰이지 않은 빈 공간이 24px 넘게 남음 → 실패
 *
 * 상태 목록에 **C-3(캐릭터 발화)** 을 넣어야 한다. 미션이 열린 C-3은 compact라
 * 그 마이크가 접혀서 결함이 나타나지 않는다. 미션 없는 C-3을 봐야 잡힌다.
 */

import { chromium } from "playwright-core";

import { BASE, SHOT, chromeExecutable, passMissionBrief } from "./_browser.mjs";

const EXE = chromeExecutable();
const browser = await chromium.launch({ executablePath: EXE, headless: true });

/** 지원 범위는 1133×744 ~ 1920×1080 (screens.md §1-1b) */
const VIEWPORTS = [
  { w: 1133, h: 744 },
  { w: 1180, h: 820 },
  { w: 1280, h: 800 },
  { w: 1366, h: 1024 },
  { w: 1920, h: 1080 },
];

/** 여유가 이보다 적으면 경고. 라벨 한 글자 늘어날 여지를 남긴다. */
const SLACK_WARN_PX = 8;

let fails = 0;
let warns = 0;

const STUB = () => {
  window.localStorage.setItem("gq.accessToken", "mock.kakao.1");
  window.localStorage.setItem("gq.selectedChildId", "c_mock_1");
  window.localStorage.setItem(
    "gq.mock.account",
    JSON.stringify({
      seq: 1,
      children: [
        {
          id: "c_mock_1",
          name: "민준",
          birthYear: 2018,
          avatarId: "color3",
          consents: {
            termsOfService: true,
            privacyPolicy: true,
            childDataProcessing: true,
            marketing: false,
          },
          registeredAt: "2026-08-01T10:00:00.000Z",
        },
      ],
    })
  );
  if (window.speechSynthesis) {
    // __holdTts를 켜면 긴 대사에서 onend를 보내지 않아 C-3(캐릭터 발화 중)에 머문다.
    //
    // ⚠️ 이게 없으면 C-3을 한 번도 못 본다. 스텁이 25ms에 끝나 C-4로 넘어가 버리기
    //    때문이다. 실제 TTS는 몇 초 걸리므로 아이는 C-3을 오래 본다.
    //    미션 + C-3에서 푸터가 패널 밖 250~300px로 밀려나 있었는데, 검증이
    //    C-4만 보고 있어서 통과하고 있었다.
    window.speechSynthesis.speak = (u) => {
      if (window.__holdTts && u.text && u.text.length > 6) return;
      setTimeout(() => u.onend && u.onend(new Event("end")), 25);
    };
    window.speechSynthesis.cancel = () => {};
    window.speechSynthesis.getVoices = () => [];
  }
  class Stub {
    constructor() { window.__rec = this; }
    start() { setTimeout(() => this.onstart && this.onstart(), 5); }
    stop() {
      const t = window.__pending; window.__pending = undefined;
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
};

/**
 * 버튼·링크 안의 **글자 하나하나**를 텍스트 노드 단위로 잰다.
 *
 * 요소 전체에 Range를 걸면 안 된다. A-5 프로필 카드처럼 아바타·이름·설명이
 * 세로로 쌓인 것도 "여러 줄"로 잡혀 거짓 실패가 난다. 우리가 찾는 것은
 * **한 덩어리 라벨이 두 줄로 접히는 것**이므로 텍스트 노드가 단위여야 한다.
 */
const PROBE = () => {
  const rows = [];

  for (const el of document.querySelectorAll("button, a[href]")) {
    if (el.offsetParent === null) continue;
    const box = el.getBoundingClientRect();
    if (box.width < 8) continue;

    const style = getComputedStyle(el);
    const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);

    /**
     * 폭이 고정된 버튼인가.
     *
     * 내용에 맞춰 늘어나는 버튼은 라벨이 길어지면 버튼도 같이 커지므로 위험하지 않다.
     * `basis-2/5`처럼 폭이 정해진 것만 라벨에 눌린다. C-5가 깨진 것도 그 경우였다.
     * 이 구분을 안 하면 경고가 수십 건 쏟아지고 아무도 안 본다.
     */
    const constrained =
      style.flexBasis !== "auto" ||
      style.width === "100%" ||
      el.parentElement?.style.width === "100%";

    // 플렉스 제약을 잠시 풀어 라벨이 원하는 폭을 잰다.
    let headroom = Number.POSITIVE_INFINITY;
    if (constrained) {
      const prev = {
        flex: el.style.flex,
        width: el.style.width,
        ws: el.style.whiteSpace,
      };
      el.style.flex = "0 0 auto";
      el.style.width = "max-content";
      el.style.whiteSpace = "nowrap";
      headroom = box.width - el.getBoundingClientRect().width;
      el.style.flex = prev.flex;
      el.style.width = prev.width;
      el.style.whiteSpace = prev.ws;
    }

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = (node.textContent ?? "").trim();
      // 이모지 하나뿐인 노드나 아주 짧은 조각은 접힐 일이 없다.
      if (text.length < 2 || text.length > 30) continue;

      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0);
      if (rects.length === 0) continue;

      rows.push({
        text: text.slice(0, 20),
        lines: rects.length,
        fontPx: Math.round(parseFloat(style.fontSize) * 10) / 10,
        boxW: Math.round(box.width),
        padX: Math.round(padX),
        // 폭이 고정된 버튼에서만 의미가 있다. 그 외에는 Infinity라 경고하지 않는다.
        slackPx: Number.isFinite(headroom) ? Math.round(headroom) : Infinity,
      });
    }
  }

  /**
   * 푸터 안에 쓰이지 않은 빈 공간이 있는가.
   *
   * 푸터 박스는 바닥에 닿아 있는데 **내용만 위쪽에 몰려** 아래가 텅 비는 일이 있었다.
   * `height: min(100%, …)`를 높이가 auto인 푸터에 써서 순환 참조가 생겨 푸터가
   * 130px → 354px로 부푼 경우다. 겹치지도 잘리지도 않아 다른 검사가 전부 통과했다.
   *
   * 그래서 "푸터가 바닥에 붙었는가"가 아니라 "푸터 안이 비었는가"를 본다.
   */
  const panel = [...document.querySelectorAll("section")].find((s) =>
    s.className.includes("w-[40%]")
  );
  let footerSlackPx = null;
  let footerHeightPx = null;
  if (panel) {
    const footer = panel.querySelector("footer");
    const kids = [...(footer?.children ?? [])].filter((c) => {
      const r = c.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    if (footer && kids.length > 0) {
      const fb = footer.getBoundingClientRect();
      const st = getComputedStyle(footer);
      const contentBottom = Math.max(
        ...kids.map((c) => c.getBoundingClientRect().bottom)
      );
      const expectedBottom = fb.bottom - parseFloat(st.paddingBottom);
      footerSlackPx = Math.round(expectedBottom - contentBottom);
      footerHeightPx = Math.round(fb.height);
    }
  }

  return {
    rootFontPx:
      Math.round(parseFloat(getComputedStyle(document.documentElement).fontSize) * 100) / 100,
    docW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
    footerSlackPx,
    footerHeightPx,
    rows,
  };
};

const LONG =
  "며느리가 창피해서 계속 참았던 것 같아요. 가족들에게 솔직하게 말하면 좋겠어요.";

/**
 * 미션이 뜬 우측 패널의 기하를 잰다.
 *
 * 두 상태를 같은 프로브로 본다. `card`가 null이면 발화 상태(브리프가 닫힌 뒤)다.
 *
 * 스크롤 상자 안의 자식은 rect가 상자를 넘어가는 것이 정상이므로, "겹침"을
 * rect 교차로 판단하면 거짓 실패가 난다. **잘림 여부**와 **보이는 개수**로 본다.
 */
const MISSION_PROBE = () => {
  const card = document.querySelector("section.border-accent");

  // 패널은 카드가 있을 때는 카드에서, 없을 때는 마이크에서 거슬러 찾는다.
  const seed =
    card ??
    document.querySelector(
      "button[aria-label='말하기 시작'], button[aria-label='말하는 중']"
    );
  let panel = seed;
  while (
    panel &&
    !(panel.tagName === "SECTION" && panel.className.includes("w-[40%]"))
  ) {
    panel = panel.parentElement;
  }
  if (!panel) return { found: false };

  const panelBox = panel.getBoundingClientRect();

  const clipped = [...panel.children]
    .filter((el) => el.scrollHeight > el.clientHeight + 1)
    // 미션 카드 자신은 내용이 넘칠 때 스크롤하도록 만들어 뒀다.
    .filter((el) => !card || !el.contains(card))
    .map((el) => el.className.slice(0, 40));

  /* ── 체크리스트 ──────────────────────────────────────────────────── */
  const list = card?.querySelector("ul") ?? null;
  const listBox = list?.getBoundingClientRect();
  const items = [...(list?.children ?? [])];
  const hiddenItems = items.filter((li) => {
    if (!listBox) return true;
    const r = li.getBoundingClientRect();
    return r.top < listBox.top - 1 || r.bottom > listBox.bottom + 1;
  }).length;

  // 1열 4행인지 — 네 항목의 left가 같아야 한다. 2×2면 두 값으로 갈린다.
  const lefts = new Set(
    items.map((li) => Math.round(li.getBoundingClientRect().left))
  );
  const columns = lefts.size;

  /* ── "말해볼래요"는 카드 **밖에** 있어야 한다 (계획 D23) ─────────── */
  const dismiss = [...panel.querySelectorAll("button")].find((b) =>
    (b.textContent ?? "").includes("말해볼래요")
  );
  const dismissBox = dismiss?.getBoundingClientRect();
  const dismissInsideCard = Boolean(dismiss && card && card.contains(dismiss));
  const dismissVisible = dismissBox
    ? dismissBox.bottom <= panelBox.bottom + 1 &&
      dismissBox.top >= panelBox.top - 1
    : false;

  /* ── 카드가 "잠시 멈춤" 버튼과 겹치지 않아야 한다 (계획 D22) ─────── */
  const pause = [...document.querySelectorAll("button")].find(
    (b) => (b.textContent ?? "").trim() === "잠시 멈춤"
  );
  let pauseOverlap = null;
  if (card && pause) {
    const c = card.getBoundingClientRect();
    const q = pause.getBoundingClientRect();
    const dy = Math.min(c.bottom, q.bottom) - Math.max(c.top, q.top);
    const dx = Math.min(c.right, q.right) - Math.max(c.left, q.left);
    if (dy > 1 && dx > 1) pauseOverlap = Math.round(dy);
  }

  const mic = panel.querySelector(
    "button[aria-label='말하기 시작'], button[aria-label='말하는 중']"
  );
  const micRect = mic?.getBoundingClientRect();

  /**
   * 발화 중 남겨두는 "지금 말할 항목" 한 줄. [미션] 칩 옆의 문구다.
   * 어느 항목이 현재인지는 진행 상황에 따라 다르므로 **특정 문구를 기대하지 않는다.**
   * 칩이 있고 그 옆에 글자가 있는지만 본다.
   */
  let nowItem = null;
  for (const el of panel.querySelectorAll("span")) {
    if ((el.textContent ?? "").trim() !== "미션") continue;
    const sibling = el.nextElementSibling;
    const text = (sibling?.textContent ?? "").trim();
    if (text.length > 0) { nowItem = text; break; }
  }

  /* ── 눈에 보이는 블록끼리 실제로 겹치는지 ────────────────────────── */
  const blocks = [];
  const push = (el, name) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    blocks.push({ el, name, ...r.toJSON() });
  };

  push(card, "미션 카드");
  [...panel.querySelectorAll("div")]
    .filter((d) => d.className.includes("rounded-bubble") && d.className.includes("bg-"))
    .forEach((b, i) => push(b, `말풍선${i + 1}`));
  [
    ...panel.querySelectorAll(
      "button[aria-label='말하기 시작'], button[aria-label='말하는 중'], button[aria-label='지금은 들을 차례예요'], button[aria-label='듣고 있어요']"
    ),
  ].forEach((m, i) => push(m, `마이크${i + 1}`));
  push(panel.querySelector("header"), "헤더");
  push(panel.querySelector("footer"), "푸터");
  for (const b of panel.querySelectorAll("button")) {
    const t = (b.textContent ?? "").trim();
    if (t === "다시 듣기" || t === "보내기" || t === "말해볼래요") push(b, `"${t}"`);
  }

  const overlaps = [];
  for (let i = 0; i < blocks.length; i += 1) {
    for (let j = i + 1; j < blocks.length; j += 1) {
      const a = blocks[i];
      const b = blocks[j];
      // 부모-자식은 당연히 교차한다. 형제끼리만 본다.
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const dy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      const dx = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      if (dy > 1 && dx > 1) {
        overlaps.push(`${a.name} ↔ ${b.name} (세로 ${Math.round(dy)}px)`);
      }
    }
  }

  const outside = blocks
    .filter((b) => b.bottom > panelBox.bottom + 1 || b.top < panelBox.top - 1)
    .map(
      (b) =>
        `${b.name} ${Math.round(Math.max(b.bottom - panelBox.bottom, panelBox.top - b.top))}px`
    );

  return {
    found: true,
    hasCard: Boolean(card),
    clipped,
    itemCount: items.length,
    hiddenItems,
    columns,
    dismissFound: Boolean(dismiss),
    dismissInsideCard,
    dismissVisible,
    nowItem,
    pauseOverlap,
    overlaps,
    outside,
    mic: micRect
      ? { w: Math.round(micRect.width), h: Math.round(micRect.height) }
      : null,
  };
};

/**
 * 미션이 뜰 때까지 /play를 몰고 간다. 장면 3의 첫 턴 뒤에 나온다.
 * 장면 3에 닿으면 TTS를 붙잡아, 미션이 뜬 뒤 C-3에 머물게 한다.
 */
async function driveToMission(page, id) {
  await page.goto(`${BASE}/play/${id}`, { waitUntil: "networkidle" });
  await page.getByText("탭하면 이야기가 시작돼요").click({ timeout: 8000 }).catch(() => {});

  /* 반복 횟수가 아니라 **시간**으로 제한한다. 캐릭터 발화·응답 대기 구간에서는
     아무 분기도 타지 않고 반복만 소모하므로, 전체 검증을 병렬로 돌릴 때 횟수 상한은
     쉽게 모자란다. (handoff·parent와 같은 방식) */
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (await page.locator("section.border-accent").count()) return true;
    /**
     * ⚠️ 예전에는 여기서 `__holdTts`를 켜 C-3에 머물게 했다. **지금은 필요 없고
     *    오히려 해롭다.** 미션 브리프는 TTS가 끝나도 스스로 남아 있고(계획 D16),
     *    hold를 켜면 캐릭터 첫 대사에서 onend가 오지 않아 아이 차례로 못 가
     *    미션이 뜰 기회 자체가 사라진다. (1920px에서 그렇게 갇혔다)
     */
    const body = await page.locator("body").innerText();
    if (body.includes("계속하기")) {
      await page.getByRole("button", { name: "계속하기" }).click().catch(() => {});
    } else if (body.includes("이제 말해 볼까?")) {
      await page.evaluate((t) => window.__say(t), LONG);
    } else if (body.includes("이렇게 말한 게 맞아?")) {
      await page.getByRole("button", { name: "보내기" }).click().catch(() => {});
    } else if (body.includes("다음") || body.includes("이야기 시작하기")) {
      const b = page.getByRole("button", { name: /다음|이야기 시작하기/ });
      if (await b.count()) await b.first().click().catch(() => {});
    }
    await page.waitForTimeout(280);
  }
  return false;
}

/** /play를 원하는 상태까지 몰고 간다. */
async function drivePlay(page, id, target) {
  await page.goto(`${BASE}/play/${id}`, { waitUntil: "networkidle" });
  await page.getByText("탭하면 이야기가 시작돼요").click({ timeout: 8000 }).catch(() => {});
  for (let i = 0; i < 6; i += 1) {
    const next = page.getByRole("button", { name: /다음|이야기 시작하기/ });
    if (await next.count()) {
      await next.first().click().catch(() => {});
      await page.waitForTimeout(160);
    }
  }
  await page.getByText("이제 말해 볼까?").waitFor({ timeout: 12000 }).catch(() => {});
  if (target === "C4") return true;

  if (target === "I2") {
    await page.evaluate(() => window.__say(""));
    return page
      .getByText("잘 안 들렸어")
      .waitFor({ timeout: 6000 })
      .then(() => true)
      .catch(() => false);
  }

  // C-3은 발화를 제출한 뒤 캐릭터가 답하는 상태다. TTS를 붙잡아 머물게 한다.
  // 미션 없는 C-3을 안 보면, 푸터가 부푸는 부류의 결함이 통째로 새어나간다.
  if (target === "C3") {
    await page.evaluate(() => { window.__holdTts = true; });
    await page.evaluate((t) => window.__say(t), LONG);
    await page.getByText("이렇게 말한 게 맞아?").waitFor({ timeout: 8000 }).catch(() => {});
    await page.getByRole("button", { name: "보내기" }).click().catch(() => {});
    const ok = await page
      .getByText("말하는 중")
      .waitFor({ timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    await page.waitForTimeout(400);
    return ok;
  }

  await page.evaluate((t) => window.__say(t), LONG);
  return page
    .getByText("이렇게 말한 게 맞아?")
    .waitFor({ timeout: 8000 })
    .then(() => true)
    .catch(() => false);
}

/** 검사할 화면 목록. play는 상태별로 따로 본다. */
const SCREENS = [
  { name: "A-2 로그인", go: (p) => p.goto(`${BASE}/login`, { waitUntil: "networkidle" }) },
  { name: "A-3 동의", go: (p) => p.goto(`${BASE}/onboarding/consent`, { waitUntil: "networkidle" }) },
  { name: "A-5 프로필 선택", go: (p) => p.goto(`${BASE}/profiles`, { waitUntil: "networkidle" }) },
  { name: "B-1 홈", go: (p) => p.goto(`${BASE}/home`, { waitUntil: "networkidle" }) },
  { name: "B-2 이야기 목록", go: (p) => p.goto(`${BASE}/stories`, { waitUntil: "networkidle" }) },
  {
    name: "B-3 이야기 상세",
    go: (p) =>
      p.goto(`${BASE}/stories/s_banggui_daughter_in_law_001`, { waitUntil: "networkidle" }),
  },
  { name: "E-1 단어장", go: (p) => p.goto(`${BASE}/wordbook`, { waitUntil: "networkidle" }) },
  { name: "F-1 마이페이지", go: (p) => p.goto(`${BASE}/mypage`, { waitUntil: "networkidle" }) },
  { name: "A-6 보호자 홈", go: (p) => p.goto(`${BASE}/parent`, { waitUntil: "networkidle" }) },
  { name: "H-1 설정", go: (p) => p.goto(`${BASE}/parent/settings`, { waitUntil: "networkidle" }) },
  { name: "H-2 아이 관리", go: (p) => p.goto(`${BASE}/parent/settings/children`, { waitUntil: "networkidle" }) },
  { name: "H-5 이용 안내", go: (p) => p.goto(`${BASE}/parent/guide`, { waitUntil: "networkidle" }) },
];

for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.w, height: vp.h },
    permissions: ["microphone"],
  });
  const page = await ctx.newPage();
  await page.addInitScript(STUB);

  const problems = [];
  let checked = 0;
  let rootFontPx = 0;

  const inspect = (label, found) => {
    rootFontPx = found.rootFontPx;
    if (found.docW > found.innerW + 1) {
      problems.push(`${label}: 가로 스크롤 (문서 ${found.docW} > 창 ${found.innerW})`);
    }
    // 푸터 안이 비어 있으면 무언가가 푸터를 부풀린 것이다.
    if (found.footerSlackPx !== null && found.footerSlackPx > 24) {
      problems.push(
        `${label}: 푸터 안에 빈 공간 ${found.footerSlackPx}px (푸터 높이 ${found.footerHeightPx}px)`
      );
    }
    for (const r of found.rows) {
      checked += 1;
      if (r.lines > 1) {
        problems.push(
          `${label}: "${r.text}" ${r.lines}줄 (폰트 ${r.fontPx}px, 박스 ${r.boxW}px, 패딩 ${r.padX}px)`
        );
      } else if (r.slackPx < SLACK_WARN_PX) {
        warns += 1;
        console.log(
          `  ⚠ ${label}: "${r.text}" 여유 ${r.slackPx}px (박스 ${r.boxW}px, 패딩 ${r.padX}px)`
        );
      }
    }
  };

  for (const screen of SCREENS) {
    await screen.go(page);
    await page.waitForTimeout(700);
    inspect(screen.name, await page.evaluate(PROBE));
  }

  for (const [target, label] of [
    ["C4", "C-4 내 차례"],
    ["C5", "C-5 확인"],
    ["C3", "C-3 캐릭터 발화"],
    ["I2", "I-2 인식 실패"],
  ]) {
    const reached = await drivePlay(page, `lay-${vp.w}-${target}`, target);
    if (!reached) {
      problems.push(`${label}: 상태 도달 실패 — 검사하지 못했다`);
      continue;
    }
    inspect(label, await page.evaluate(PROBE));
  }

  /**
   * C-10 미션 — 두 상태를 본다. 이제 **한 패널에 카드와 마이크가 함께 있지 않다.**
   *
   *   브리프 — 카드만. 마이크가 없어야 한다. "말해볼래요"는 카드 **밖**이다
   *   발화   — 카드가 사라지고 마이크만. 미션 항목은 한 줄 라벨로 남는다
   */
  const checkBrief = async (label) => {
    inspect(label, await page.evaluate(PROBE));
    const m = await page.evaluate(MISSION_PROBE);
    checked += 1;

    if (!m.found || !m.hasCard) {
      problems.push(`${label}: 미션 카드를 찾지 못했다`);
      return;
    }
    for (const cls of m.clipped) {
      problems.push(`${label}: 패널 내용이 잘림 — ${cls}`);
    }
    for (const pair of m.overlaps) {
      problems.push(`${label}: 겹침 — ${pair}`);
    }
    for (const out of m.outside) {
      problems.push(`${label}: 패널 밖으로 밀려남 — ${out}`);
    }
    if (m.itemCount !== 4) {
      problems.push(`${label}: 체크리스트가 4개가 아니다 (${m.itemCount})`);
    }
    if (m.hiddenItems > 0) {
      problems.push(
        `${label}: 체크리스트 ${m.itemCount}개 중 ${m.hiddenItems}개가 안 보인다`
      );
    }
    // 1열 4행 — 네 항목의 left가 하나여야 한다 (계획 D21)
    if (m.columns !== 1) {
      problems.push(`${label}: 체크리스트가 ${m.columns}열이다 (1열이어야 한다)`);
    }
    if (!m.dismissFound) {
      problems.push(`${label}: "말해볼래요"가 없다 (시작할 방법이 없다)`);
    } else {
      if (!m.dismissVisible) {
        problems.push(`${label}: "말해볼래요"가 패널 밖이다`);
      }
      // 카드 밖에 있어야 한다 — "카드는 읽을 것, 버튼은 할 것" (계획 D23)
      if (m.dismissInsideCard) {
        problems.push(`${label}: "말해볼래요"가 미션 카드 안에 있다`);
      }
    }
    // 카드를 세로 중앙에 둔 이유가 이것이다 (계획 D22)
    if (m.pauseOverlap !== null) {
      problems.push(
        `${label}: 미션 카드가 "잠시 멈춤"과 겹친다 (세로 ${m.pauseOverlap}px)`
      );
    }
    // 브리프에는 마이크를 그리지 않는다 — 보이면 "지금 말해도 되나?"를 아이가 판단해야 한다
    if (m.mic) {
      problems.push(`${label}: 브리프에 마이크가 있다 (${m.mic.w}px)`);
    }
  };

  const checkMissionTurn = async (label) => {
    inspect(label, await page.evaluate(PROBE));
    const m = await page.evaluate(MISSION_PROBE);
    checked += 1;

    if (!m.found) {
      problems.push(`${label}: 우측 패널을 찾지 못했다`);
      return;
    }
    // 발화 중에는 카드를 감춘다 (계획 D17)
    if (m.hasCard) {
      problems.push(`${label}: 발화 중인데 미션 카드가 남아 있다`);
    }
    for (const cls of m.clipped) {
      problems.push(`${label}: 패널 내용이 잘림 — ${cls}`);
    }
    for (const pair of m.overlaps) {
      problems.push(`${label}: 겹침 — ${pair}`);
    }
    for (const out of m.outside) {
      problems.push(`${label}: 패널 밖으로 밀려남 — ${out}`);
    }
    if (!m.mic) {
      problems.push(`${label}: 마이크가 없다`);
    } else {
      if (Math.abs(m.mic.w - m.mic.h) > 1) {
        problems.push(`${label}: 마이크가 타원 ${m.mic.w}×${m.mic.h}`);
      }
      if (m.mic.w < 72) {
        problems.push(`${label}: 마이크 ${m.mic.w}px < 72px (§1-4)`);
      }
    }
    // 카드는 감추되 지금 말할 항목은 남긴다 (계획 D17)
    if (!m.nowItem) {
      problems.push(`${label}: 지금 말할 미션 항목이 화면에 없다`);
    }
  };

  if (await driveToMission(page, `lay-${vp.w}-mission`)) {
    await checkBrief("C-10 미션 브리프");

    // "말해볼래요"를 눌러 발화 상태로 넘긴다.
    // MISSION_DISMISS가 상태를 곧바로 CHILD_TURN으로 옮긴다.
    const passed = await passMissionBrief(page);
    const atChildTurn = passed
      ? await page
          .getByText("이제 말해 볼까?")
          .waitFor({ timeout: 10000 })
          .then(() => true)
          .catch(() => false)
      : false;
    if (atChildTurn) await checkMissionTurn("C-10 미션 + 발화");
    else problems.push("C-10 미션 + 발화: 상태 도달 실패");
  } else {
    problems.push("C-10 미션: 상태 도달 실패 — 검사하지 못했다");
  }

  if (problems.length > 0) {
    fails += problems.length;
    console.log(`FAIL ${vp.w}×${vp.h} (루트 ${rootFontPx}px) — ${problems.length}건`);
    for (const p of problems) console.log(`       ${p}`);
    await page.screenshot({ path: SHOT(`layout-${vp.w}`) });
  } else {
    console.log(`  OK   ${vp.w}×${vp.h} (루트 ${rootFontPx}px) — 버튼 ${checked}개 전부 한 줄`);
  }

  await ctx.close();
}

console.log(
  `\n${fails === 0 ? "전부 통과" : `실패 ${fails}건`}${warns > 0 ? ` · 경고 ${warns}건 (여유 ${SLACK_WARN_PX}px 미만)` : ""}`
);
await browser.close();
process.exit(fails > 0 ? 1 : 0);
