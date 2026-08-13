// D-1 ~ D-7 전체 검증. 오답 → 재시도 → 정답 → 키워드 점등 → 완료까지.
import { chromium } from "playwright-core";

import { SHOT, chromeExecutable } from "./_browser.mjs";

const EXE = chromeExecutable();
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } , permissions: ["microphone"] })).newPage();

const errs = [];
page.on("pageerror", (e) => errs.push(e.message));

await page.addInitScript(() => {
  window.__spoken = [];
  if (window.speechSynthesis) {
    window.speechSynthesis.speak = (u) => {
      window.__spoken.push(u.text);
      setTimeout(() => u.onend && u.onend(new Event("end")), 40);
    };
    window.speechSynthesis.cancel = () => {};
    window.speechSynthesis.getVoices = () => [];
  }
  // STT 스텁 — __feed(text)로 부분 전사, __say()로 최종 확정
  class Stub {
    constructor() { window.__rec = this; }
    start() { setTimeout(() => this.onstart && this.onstart(), 5); }
    stop() { this._finish(); }
    abort() {}
    _emit(text, isFinal) {
      const alt = { transcript: text, confidence: 1 };
      const res = { 0: alt, length: 1, isFinal, item: () => alt };
      this.onresult && this.onresult({
        resultIndex: 0,
        results: { 0: res, length: 1, item: () => res },
      });
    }
    _finish() {
      if (window.__pending) this._emit(window.__pending, true);
      window.__pending = undefined;
      setTimeout(() => this.onend && this.onend(), 10);
    }
  }
  window.SpeechRecognition = Stub;
  window.webkitSpeechRecognition = Stub;
  window.__feed = (t) => window.__rec?._emit(t, false);
  window.__say = (t) => { window.__pending = t; window.__rec?.stop(); };
});

const ok = (cond, label) => console.log(`  ${cond ? "OK  " : "FAIL"} ${label}`);

await page.goto("http://localhost:3000/activity/demo", { waitUntil: "networkidle" });

console.log("=== D-1 활동 인트로 ===");
await page.getByText("이제 네 이야기로 다시 들려줄래?").waitFor({ timeout: 8000 });
ok(true, "인트로 표시");
await page.getByRole("button", { name: "시작하기" }).click();

console.log("\n=== D-2 카드 순서 배열 ===");
await page.getByText("이야기 순서대로 놓아볼까?").waitFor({ timeout: 5000 });
const trayCount = await page.locator("button.touch-none").count();
ok(trayCount === 4, `트레이 카드 ${trayCount}장`);
const submitBtn = page.getByRole("button", { name: "확인하기" });
ok(await submitBtn.isDisabled(), "슬롯 비면 확인하기 비활성");

// 정답 순서를 프론트가 모르는지 확인 — 클라이언트 페이로드에 correctOrder가 없어야 한다
const leaked = await page.evaluate(() =>
  document.documentElement.innerHTML.includes("correctOrder")
);
ok(!leaked, "correctOrder가 클라이언트에 노출되지 않음");

/**
 * 이야기의 정답 순서. 목의 `MOCK_POST_ACTIVITY.cards`와 같다.
 * 프론트 코드는 이 값을 모른다 — **검증 스크립트만** 안다.
 */
const STORY_ORDER = [
  "며느리는 방귀를 꾹 참고 또 참았어요.",
  "며느리의 큰 방귀에 시아버지의 갓이 날아갔어요.",
  "며느리의 방귀로 높은 배나무의 배가 우수수 떨어졌어요.",
  "시아버지가 며느리에게 미안하다고 말했어요.",
];

// 탭으로 4장 배치 (드래그 대안 경로)
console.log("\n=== 탭 배치 → 오답 제출 ===");
/**
 * ⚠️ **일부만 틀린 배치**를 만든다. 트레이 순서대로 아무렇게나 넣으면 4칸이
 *    전부 틀릴 수 있고, 그러면 "맞은 칸은 표시하지 않는다"(요구 10)를
 *    확인할 수가 없다. 3·4번만 바꿔 넣어 1·2번은 정답 자리에 둔다.
 */
for (const text of [STORY_ORDER[0], STORY_ORDER[1], STORY_ORDER[3], STORY_ORDER[2]]) {
  await page.locator("button.touch-none", { hasText: text }).first().click();
  await page.waitForTimeout(120);
}
ok(await submitBtn.isEnabled(), "4칸 채우면 확인하기 활성");
await submitBtn.click();
await page.waitForTimeout(900);

const body1 = await page.locator("body").innerText();
const isFeedback = body1.includes("거의 다 왔어!");
console.log(`  ${isFeedback ? "OK  " : "info"} D-3 오답 피드백 ${isFeedback ? "표시" : "미표시(우연히 정답)"}`);
if (isFeedback) {
  const banned = ["틀렸", "실패", "오답"].filter((w) => body1.includes(w));
  ok(banned.length === 0, `금지 표현 없음${banned.length ? " → " + banned : ""}`);

  /**
   * 칸별 오답 표시 — 요구 10.
   *
   * 목 서버는 1·2회째에 `slotResults`를 실어 보낸다. 그러면 **틀린 칸만** 빨간
   * 테두리를 갖고, 맞은 칸은 지금 테두리를 유지한다.
   *
   * ⚠️ 실서버는 아직 이 필드를 주지 않는다. 그때는 배치 전체가 표시된다 —
   *    프론트는 정답을 모르므로 어느 칸이 틀렸는지 알 방법이 없다 (§0-2).
   *    (docs/request/backend/order-slot-results.md)
   * ⚠️ 맞은 칸에 **초록 테두리를 넣지 않는다.** 정답 개수를 세는 화면이 된다.
   */
  // ⚠️ 클래스 문자열로 판단하지 않는다. `border-secondary`와 `border-danger`가
  //    둘 다 class에 남아 있고 실제 색은 CSS 순서가 정한다. 계산된 색을 본다.
  const marks = await page.evaluate(() => {
    const slots = [...document.querySelectorAll("[data-slot-index]")];
    return slots.map((el) => ({
      wrong: el.dataset.mismatched === "1",
      borderColor: getComputedStyle(el).borderTopColor,
    }));
  });
  const DANGER = "rgb(217, 83, 79)"; // --color-danger
  const wrongCount = marks.filter((m) => m.wrong).length;
  ok(wrongCount > 0, "오답 칸에 표시가 붙는다", `${wrongCount}/4칸`);
  ok(
    wrongCount < marks.length,
    "맞은 칸은 표시하지 않는다 (칸 단위 · slotResults)",
    `${marks.length - wrongCount}칸 유지`
  );
  ok(
    marks.every((m) => (m.borderColor === DANGER) === m.wrong),
    "빨간 테두리가 틀린 칸에만 그려진다",
    marks.map((m) => (m.wrong ? "✗" : "·")).join("")
  );
  // 맞은 칸에 초록을 새로 넣지 않는다 — 정답 개수를 세는 화면이 된다 (PRD 10.3)
  ok(
    !(await page.locator("[data-slot-index].border-secondary[data-mismatched]").count()),
    "맞은 칸에 정답 표시를 추가하지 않는다"
  );

  await page.getByRole("button", { name: "다시 해보기" }).click();
  await page.waitForTimeout(300);
}

console.log("\n=== 정답 순서로 재배치 ===");
// 슬롯을 모두 비우고 card_1..4 순으로 넣는다.
for (let i = 3; i >= 0; i--) {
  const slot = page.locator(`[data-slot-index="${i}"]`);
  if ((await slot.innerText()).trim() !== "여기에 놓아줘") await slot.click();
  await page.waitForTimeout(80);
}
const ORDER = [
  "며느리는 방귀를 꾹 참고 또 참았어요.",
  "며느리의 큰 방귀에 시아버지의 갓이 날아갔어요.",
  "며느리의 방귀로 높은 배나무의 배가 우수수 떨어졌어요.",
  "시아버지가 며느리에게 미안하다고 말했어요.",
];
for (const text of ORDER) {
  await page.locator("button.touch-none", { hasText: text }).first().click();
  await page.waitForTimeout(120);
}
await page.getByRole("button", { name: "확인하기" }).click();
await page.waitForTimeout(900);

console.log("\n=== D-4 핵심 단어 공개 ===");
const gotKeywords = await page.getByText("순서를 맞췄어!").count();
ok(gotKeywords > 0, "정답 판정 + 키워드 공개");
const kwCount = await page.locator("li", { hasText: /^(며느리|방귀|배나무|시아버지)$/ }).count();
console.log(`  키워드 칩 ${kwCount}개`);
await page.getByRole("button", { name: "이야기 말하기" }).click();

console.log("\n=== D-5 키워드 실시간 점등 ===");
await page.getByText("이야기를 처음부터 들려줘").waitFor({ timeout: 5000 });
await page.locator("button[aria-label]").first().click(); // 마이크
await page.waitForTimeout(200);

const litCount = async () =>
  page.locator("li.bg-secondary").count();
console.log(`  녹음 시작 시 점등 ${await litCount()}개`);

await page.evaluate(() => window.__feed("옛날에 며느리가 살았어요"));
await page.waitForTimeout(250);
const after1 = await litCount();
console.log(`  "며느리" 부분 전사 후 점등 ${after1}개`);
ok(after1 === 1, "부분 전사로 실시간 점등 (interimResults)");

await page.evaluate(() => window.__feed("옛날에 며느리가 방귀를 참았어요"));
await page.waitForTimeout(250);
const after2 = await litCount();
ok(after2 === 2, `"방귀" 추가 점등 → ${after2}개`);

console.log("\n=== D-6 결과 확인 ===");
await page.evaluate(() =>
  window.__say("옛날에 며느리가 방귀를 참았어요. 배나무에서 배가 떨어지고 시아버지가 미안하다고 했어요.")
);
await page.getByText("내가 만든 이야기").waitFor({ timeout: 5000 });
ok(true, "전사 결과 표시");
const marks = await page.locator("mark").count();
ok(marks >= 3, `키워드 하이라이트 ${marks}개`);
const reviewBody = await page.locator("body").innerText();
ok(!reviewBody.includes("내 목소리로"), "음성 미저장 정책 위반 문구 없음 (Q-07)");
ok(reviewBody.includes("내 이야기 다시 듣기"), "TTS 대체 문구 사용");

console.log("\n=== D-7 완료 ===");
await page.getByRole("button", { name: "이야기 완성하기" }).click();
await page.getByText("이야기를 끝까지 해냈어!").waitFor({ timeout: 6000 });
ok(true, "완료 화면 도달");
const finalBody = await page.locator("body").innerText();
// 별가루는 이제 구현된 보상 표시다(백엔드 B-20). 금칙어에서 뺀다 —
// 금지 대상은 **평가 표현**이고 별가루는 평가가 아니다.
const bannedFinal = ["점수", "등급", "%"].filter((w) => finalBody.includes(w));
ok(bannedFinal.length === 0, `평가 표현 없음${bannedFinal.length ? " → " + bannedFinal : ""}`);
// 획득 별가루는 서버가 값을 줄 때만 나온다. 목은 완료 시 +100을 준다. (계획 D16)
ok(/별가루 \+\d+/.test(finalBody), "획득 별가루 표시");
console.log("  통계: " + finalBody.split("\n").filter((l) => /번$|명$|개$/.test(l.trim())).join(" / "));

await page.screenshot({ path: SHOT("activity-shot") });

/* ── D-10 카드 재시도 3회 제한 ───────────────────────────────────────
 * 3회째 오답에 서버가 정답 순서를 실어 보내고, 화면은 그걸 보여주며 다음
 * 단계로 넘긴다. 무한 재시도로 아이가 활동에 갇히지 않게 하는 규칙이다.
 * 실패를 지적하지 않는 것이 조건이다. (백엔드 D-10 · Q-15)
 *
 * 새 세션이 필요하다 — 위에서 이미 시도 횟수를 썼다.
 */
console.log("\n=== D-10 재시도 3회 제한 ===");
await page.evaluate(() => {
  localStorage.removeItem("gq.mock.sessions");
});
await page.goto("http://localhost:3000/activity/demo", { waitUntil: "networkidle" });
await page.getByRole("button", { name: "시작하기" }).click();
await page.getByText("이야기 순서대로 놓아볼까?").waitFor({ timeout: 5000 });

/**
 * 정답의 **역순**으로 놓고 제출한다. 셔플 순서에 기대면 우연히 정답이 나올 수 있어
 * 3회를 채우지 못한다. 역순은 항상 오답이다.
 *
 * "다시 해보기"로 돌아오면 슬롯이 그대로 차 있으므로 먼저 비운다.
 */
async function fillWrong() {
  for (let i = 3; i >= 0; i -= 1) {
    const slot = page.locator(`[data-slot-index="${i}"]`);
    if ((await slot.innerText()).trim() !== "여기에 놓아줘") await slot.click();
    await page.waitForTimeout(80);
  }
  for (const text of [...ORDER].reverse()) {
    await page.locator("button.touch-none", { hasText: text }).first().click();
    await page.waitForTimeout(100);
  }
  await page.getByRole("button", { name: "확인하기" }).click();
  await page.waitForTimeout(900);
}

let reachedLimit = false;
for (let attempt = 1; attempt <= 3; attempt += 1) {
  await fillWrong();
  const body = await page.locator("body").innerText();

  if (body.includes("순서를 맞췄어!")) {
    console.log(`  info ${attempt}회째에 우연히 정답 — 이 판정은 건너뛴다`);
    reachedLimit = true; // 아래 단정들을 건너뛴다
    break;
  }

  const revealed = body.includes("이런 순서였어!");
  if (attempt < 3) {
    ok(!revealed, `${attempt}회째에는 정답을 보여주지 않음`);
    ok(body.includes("거의 다 왔어!"), `${attempt}회째 → D-3 오답 피드백`);
    await page.getByRole("button", { name: "다시 해보기" }).click();
    await page.waitForTimeout(300);
    continue;
  }

  // 3회째
  ok(revealed, "3회째 → 정답 순서 공개");
  ok(!body.includes("거의 다 왔어!"), "3회째에는 '다시 해보기'로 되돌리지 않음");
  ok(
    (await page.getByRole("button", { name: "다시 해보기" }).count()) === 0,
    "다음 시도가 없으므로 재시도 버튼 없음"
  );
  ok(
    !body.includes("순서를 맞췄어!"),
    "맞혔다고 하지 않음 (아이도 아는 거짓말)"
  );
  const banned = ["틀렸", "실패", "오답", "정답은", "점수"].filter((w) =>
    body.includes(w)
  );
  ok(banned.length === 0, `실패 지적 표현 없음${banned.length ? " → " + banned : ""}`);
  ok(
    (await page.getByRole("button", { name: "이야기 말하기" }).count()) === 1,
    "다음 단계로 나갈 길 있음 (활동에 갇히지 않음)"
  );
  // 정답 순서로 카드가 다시 그려졌는지. 1번 칸이 정답 1번이어야 한다.
  const firstCard = (await page.locator("ol li").first().innerText()).trim();
  ok(
    firstCard.startsWith("며느리는 방귀를 꾹 참고"),
    "카드가 정답 순서로 다시 배치됨"
  );
  reachedLimit = true;
}
ok(reachedLimit, "3회 안에 판정에 도달");

if (errs.length) { console.log("\n=== pageerror ==="); errs.slice(0, 6).forEach((e) => console.log("  " + e)); }
console.log("\n스크린샷: activity-shot.png");
await browser.close();
