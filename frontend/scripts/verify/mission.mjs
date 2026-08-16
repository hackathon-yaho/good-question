/**
 * C-10·C-11 미션 순차 진행 검증
 *
 * 미션은 4항목을 한 번에 다 말하는 게 아니라 **한 항목씩** 진행한다.
 *
 *   ① 브리프  카드만. 마이크 없음. "말해볼래요"는 카드 밖
 *   ② 말해볼래요  아이가 읽고 스스로 시작
 *   ③ 발화  카드를 통째로 감춘다. 아이는 마이크만 본다
 *   ④ 서버 응답  남은 항목이 있으면 다음 항목으로 ①로 돌아간다
 *
 * 이 스위트가 없으면 "카드가 다시 열리는지"를 아무도 안 본다. 예전 구현은
 * `MISSION_DISMISS`가 미션을 영구 제거해서 카드가 한 번만 떴다.
 *
 * ⚠️ 순차 진행의 게이트는 아직 **백엔드 신호가 없다.** 미션 1의 1·2번이 둘 다
 *    `SOLUTION`이라 `accumulatedElements`로는 구분이 안 된다.
 *    (docs/request/backend/mission-progress.md) 지금은 발화 횟수로 넘긴다.
 */

import { chromium } from "playwright-core";

import { BASE, SHOT, chromeExecutable, passMissionBrief } from "./_browser.mjs";

const EXE = chromeExecutable();
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  permissions: ["microphone"],
});
const page = await ctx.newPage();

let fails = 0;
const ok = (cond, label, extra = "") => {
  if (cond) console.log(`  OK   ${label}${extra ? ` — ${extra}` : ""}`);
  else {
    fails += 1;
    console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`);
  }
};

await page.addInitScript(() => {
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
    window.speechSynthesis.speak = (u) =>
      setTimeout(() => u.onend && u.onend(new Event("end")), 25);
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
        this.onresult &&
          this.onresult({
            resultIndex: 0,
            results: { 0: res, length: 1, item: () => res },
          });
      }
      setTimeout(() => this.onend && this.onend(), 10);
    }
    abort() {}
  }
  window.SpeechRecognition = Stub;
  window.webkitSpeechRecognition = Stub;
  window.__say = (t) => { window.__pending = t; window.__rec?.stop(); };
});

const LONG =
  "며느리가 창피해서 계속 참았던 것 같아요. 가족들에게 솔직하게 말하면 좋겠어요.";

/**
 * 미션 카드의 상태를 읽는다.
 *
 * ⚠️ "현재 항목" 링과 "지금 말해볼 것" 키워드 칩은 더 이상 없다
 *    (`MissionCard.tsx` 주석 — 4항목을 한눈에 보고 스스로 생각하게 두는 쪽으로
 *    정리한 결과). 완료 표시는 배지 문자열이 "✓"인지로 읽는다 — 서버가
 *    `satisfiedIndexes`로 확정해 준 항목만 ✓가 된다. 목은 이 값을 안 보내므로
 *    목으로는 ✓가 뜨는 걸 확인할 수 없다(README 참조: verify-drift-report.md).
 */
const CARD = () =>
  page.evaluate(() => {
    const card = document.querySelector("section.border-accent");
    if (!card) return null;
    const items = [...(card.querySelector("ul")?.children ?? [])].map((li) => {
      const badge = li.querySelector("span");
      const badgeText = (badge?.textContent ?? "").trim();
      return {
        text: (li.textContent ?? "").replace(/말했어요|지금 말할 차례예요|아직이에요/g, "").trim(),
        badge: badgeText,
        done: badgeText === "✓",
        left: Math.round(li.getBoundingClientRect().left),
      };
    });
    return {
      title: (card.querySelector("h3")?.textContent ?? "").trim(),
      items,
      // "말해볼래요"가 카드 안에 있으면 안 된다 (계획 D23)
      dismissInside: [...card.querySelectorAll("button")].some((b) =>
        (b.textContent ?? "").includes("말해볼래요")
      ),
      text: card.textContent ?? "",
    };
  });

/** 미션이 뜰 때까지 몰고 간다. 장면 3의 첫 턴 뒤에 나온다. */
async function driveToMission() {
  await page.goto(`${BASE}/play/mis-1`, { waitUntil: "networkidle" });
  await page
    .getByText("탭하면 이야기가 시작돼요")
    .click({ timeout: 8000 })
    .catch(() => {});

  /* 시간으로 제한한다 — 반복 횟수는 병렬 실행에서 쉽게 모자란다 */
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (await page.locator("section.border-accent").count()) return true;
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
    await page.waitForTimeout(260);
  }
  return false;
}

console.log("=== ① 브리프 ===");
const reached = await driveToMission();
ok(reached, "미션 카드 노출 (서버 신호로만 뜬다)");

if (!reached) {
  console.log("\n미션에 도달하지 못해 이후 검사를 건너뛴다.");
  await browser.close();
  process.exit(1);
}

const first = await CARD();
ok(first !== null, "카드 읽기");
ok(first?.title === "높은 배를 어떻게 딸까?", "미션 제목", first?.title);
ok(first?.items.length === 4, "체크리스트 4개", `${first?.items.length}개`);

// 1열 4행 — 네 항목의 left가 같아야 한다 (계획 D21)
{
  const lefts = new Set(first.items.map((i) => i.left));
  ok(lefts.size === 1, "체크리스트가 1열 4행", `${lefts.size}열`);
}

// 브리프에는 마이크가 없다
ok(
  (await page
    .locator("button[aria-label='말하기 시작'], button[aria-label='말하는 중']")
    .count()) === 0,
  "브리프에 마이크가 없다 (아이가 판단하지 않게)"
);

// "말해볼래요"는 카드 밖 (계획 D23)
ok(!first.dismissInside, "'말해볼래요'가 미션 카드 밖에 있다");
ok(
  await page.getByRole("button", { name: "말해볼래요" }).isVisible(),
  "'말해볼래요' 표시"
);

// 카드가 "잠시 멈춤"과 겹치지 않는다 (계획 D22)
{
  const overlap = await page.evaluate(() => {
    const card = document.querySelector("section.border-accent");
    const pause = [...document.querySelectorAll("button")].find(
      (b) => (b.textContent ?? "").trim() === "잠시 멈춤"
    );
    if (!card || !pause) return null;
    const c = card.getBoundingClientRect();
    const q = pause.getBoundingClientRect();
    const dy = Math.min(c.bottom, q.bottom) - Math.max(c.top, q.top);
    const dx = Math.min(c.right, q.right) - Math.max(c.left, q.left);
    return dy > 1 && dx > 1 ? Math.round(dy) : 0;
  });
  ok(overlap === 0, "미션 카드가 '잠시 멈춤'과 겹치지 않는다", `${overlap}px`);
}

// 아이 화면 금지어 — 평가·점수 표현
{
  const banned = ["완료", "정답", "틀렸", "실패", "점수", "성공"].filter((w) =>
    first.text.includes(w)
  );
  ok(banned.length === 0, "미션 카드에 평가·완료 텍스트가 없다", banned.join(","));
}

console.log("\n=== ② 말해볼래요 → ③ 발화 ===");
await passMissionBrief(page);
const atTurn = await page
  .getByText("이제 말해 볼까?")
  .waitFor({ timeout: 10000 })
  .then(() => true)
  .catch(() => false);
ok(atTurn, "'말해볼래요' → 아이 발화 차례 시작");
ok(
  (await page.locator("section.border-accent").count()) === 0,
  "발화 중에는 미션 카드를 감춘다"
);
{
  const mic = await page.evaluate(() => {
    const m = document.querySelector(
      "button[aria-label='말하기 시작'], button[aria-label='말하는 중']"
    );
    const r = m?.getBoundingClientRect();
    return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null;
  });
  ok(mic !== null && mic.w >= 72, "마이크가 원래 크기로 돌아왔다", `${mic?.w}px`);
}
console.log("\n=== ④ 서버 응답 → 브리프 복귀 ===");
await page.evaluate((t) => window.__say(t), LONG);
await page
  .getByText("이렇게 말한 게 맞아?")
  .waitFor({ timeout: 8000 })
  .catch(() => {});
await page.getByRole("button", { name: "보내기" }).click().catch(() => {});

const returned = await page
  .locator("section.border-accent")
  .waitFor({ timeout: 12000 })
  .then(() => true)
  .catch(() => false);
ok(returned, "다음 항목에서 미션 카드가 다시 열린다");

/**
 * ⚠️ 여기서 항목별 ✓ 표시는 확인하지 않는다. `satisfiedIndexes`(서버가 확정한
 * 인덱스)만이 ✓의 근거인데, 목은 `missionProgress`를 아예 안 보낸다. 턴 수로
 * 추측해 ✓를 붙이면 서버가 확정하지 않은 걸 프론트가 채점하는 셈이라(§0-2)
 * 일부러 안 그런다 — 그러니 목으로는 이 항목을 검증할 방법이 없다.
 * (frontend/docs/verify-drift-report.md 참조)
 */

await page.screenshot({ path: SHOT("mission-brief") });

/* ═══════════════ 미션 2 — 택 1 방식 ═══════════════════════════════════ */
console.log("\n=== 미션 2 (택 1) ===");

const FRIENDS = [
  "목소리가 큰 친구",
  "질문이 많은 친구",
  "힘이 센 친구",
  "조용한 친구",
];
/** PRD 7.6 예시 문장의 앞부분. 힌트 전에 새면 안 된다 */
const EXAMPLES = ["멀리 있는 사람", "새로운 생각", "무거운 물건", "잘 들어 줄"];

/**
 * 미션 2까지 몰고 간다. 장면 4(며느리 재등장)의 첫 턴 뒤에 나온다.
 * 미션 1은 통과시키고, 미션 2 카드가 뜨면 멈춘다.
 */
async function driveToMission2() {
  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    if (await page.getByText("미션 2", { exact: true }).count()) return true;
    if (new URL(page.url()).pathname.startsWith("/activity/")) return false;
    const body = await page.locator("body").innerText();
    if (body.includes("계속하기")) {
      await page.getByRole("button", { name: "계속하기" }).click().catch(() => {});
    } else if (body.includes("말해볼래요")) {
      await passMissionBrief(page);
    } else if (body.includes("이제 말해 볼까?")) {
      await page.evaluate((t) => window.__say(t), LONG);
    } else if (body.includes("이렇게 말한 게 맞아?")) {
      await page.getByRole("button", { name: "보내기" }).click().catch(() => {});
    }
    await page.waitForTimeout(240);
  }
  return false;
}

/** 미션 2 카드 상태 */
const CARD2 = () =>
  page.evaluate((examples) => {
    const card = document.querySelector("section.border-accent");
    if (!card) return null;
    // 라벨은 `data-friend-label`에서 읽는다. 카드 안에 플레이스홀더 문구가 섞여
    // 있어 textContent로 갈라내면 "그림준비 중목소리가 큰 친구"가 된다.
    const options = [...card.querySelectorAll('button[role="radio"]')].map((b) => ({
      label:
        b.querySelector("[data-friend-label]")?.getAttribute("data-friend-label") ??
        "",
      checked: b.getAttribute("aria-checked") === "true",
    }));
    const text = card.textContent ?? "";
    return {
      title: (card.querySelector("h3")?.textContent ?? "").trim(),
      options,
      blank: Boolean(card.querySelector(".border-dotted")),
      prompt: text.includes("친구를 하나 골라줘"),
      hint: text.includes("힌트"),
      // 예시 문장이 힌트 전에 새면 아이가 정해진 답을 찾으려 한다 (PRD 7.6)
      leaked: examples.some((e) => text.includes(e)),
      text,
    };
  }, EXAMPLES);

const reached2 = await driveToMission2();
ok(reached2, "미션 2 카드 노출");

if (reached2) {
  const m2 = await CARD2();
  ok(m2 !== null, "미션 2 카드 읽기");
  ok(
    m2?.title === "친구의 다른 점을 좋은 점으로 바꿔볼까?",
    "미션 2 제목",
    m2?.title
  );
  ok(m2?.options.length === 4, "친구 카드 4장", `${m2?.options.length}장`);
  ok(
    FRIENDS.every((n) => m2.options.some((o) => o.label === n)),
    "친구 4종이 화면 명세 C-11과 일치",
    m2?.options.map((o) => o.label).join("·")
  );
  ok(m2.options.every((o) => !o.checked), "처음에는 아무것도 안 골라져 있다");
  ok(m2?.prompt === true, "고르기 전에는 무엇을 하라고 알려준다");
  ok(m2?.leaked === false, "고르기 전에 예시 문장이 새지 않는다 (PRD 7.6)");
  ok(
    await page.getByRole("button", { name: "말해볼래요" }).isDisabled(),
    "고르기 전에는 '말해볼래요'를 누를 수 없다"
  );

  // 친구를 고른다 — 문장 틀의 주어가 바뀌어야 한다
  await page.getByRole("radio", { name: /질문이 많은 친구/ }).click();
  await page.waitForTimeout(250);
  const picked = await CARD2();
  ok(
    picked.options.filter((o) => o.checked).length === 1,
    "선택은 하나만 유지된다 (택 1)"
  );
  ok(
    picked.options.find((o) => o.checked)?.label === "질문이 많은 친구",
    "고른 친구가 표시된다"
  );
  ok(picked?.blank === true, "문장 틀에 점선 빈칸이 있다");
  ok(
    picked.text.includes("질문이 많은 친구는"),
    "문장 틀 주어가 고른 친구로 바뀐다 (조사 '는')"
  );
  ok(picked?.hint === false, "아직 힌트를 보여주지 않는다");
  ok(
    await page.getByRole("button", { name: "말해볼래요" }).isEnabled(),
    "고르면 '말해볼래요'가 열린다"
  );

  // 다른 친구로 바꿔도 하나만 남는가
  await page.getByRole("radio", { name: /조용한 친구/ }).click();
  await page.waitForTimeout(200);
  const swapped = await CARD2();
  ok(
    swapped.options.filter((o) => o.checked).length === 1 &&
      swapped.options.find((o) => o.checked)?.label === "조용한 친구",
    "다른 친구를 고르면 앞 선택이 풀린다"
  );

  /**
   * 실패 → 힌트. **짧게 답하면** 목이 사고 요소를 채우지 않으므로
   * (`mock.ts`의 저정보 분기) 관점 요소가 확정되지 않고 미션이 다시 열린다.
   */
  await passMissionBrief(page);
  await page.getByText("이제 말해 볼까?").waitFor({ timeout: 10000 }).catch(() => {});
  await page.evaluate(() => window.__say("음"));
  await page.getByText("이렇게 말한 게 맞아?").waitFor({ timeout: 8000 }).catch(() => {});
  await page.getByRole("button", { name: "보내기" }).click().catch(() => {});

  const reopened = await page
    .locator("section.border-accent")
    .waitFor({ timeout: 12000 })
    .then(() => true)
    .catch(() => false);
  ok(reopened, "실패하면 미션 2가 다시 열린다");

  if (reopened) {
    const retry = await CARD2();
    ok(retry?.hint === true, "재시도에는 힌트가 붙는다");
    ok(
      retry.text.includes("다른 사람의 말을 잘 들어 줄 수 있어요"),
      "힌트가 고른 친구의 예시 문장이다 (PRD 7.6)"
    );
    ok(
      retry.options.find((o) => o.checked)?.label === "조용한 친구",
      "고른 친구가 유지된다"
    );
    const banned = ["틀렸", "실패", "오답", "다시 해보"].filter((w) =>
      retry.text.includes(w)
    );
    ok(banned.length === 0, "실패를 지적하는 표현이 없다", banned.join(","));
  }

  await page.screenshot({ path: SHOT("mission2-hint") });
}
console.log(`\n${fails === 0 ? "전부 통과" : `실패 ${fails}건`}`);
await browser.close();
if (fails > 0) process.exit(1);
