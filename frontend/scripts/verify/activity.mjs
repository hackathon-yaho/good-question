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

// 탭으로 4장 배치 (드래그 대안 경로)
console.log("\n=== 탭 배치 → 오답 제출 ===");
for (let i = 0; i < 4; i++) {
  await page.locator("button.touch-none").first().click();
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
const bannedFinal = ["점수", "등급", "%", "별가루"].filter((w) => finalBody.includes(w));
ok(bannedFinal.length === 0, `평가·미정의 표현 없음${bannedFinal.length ? " → " + bannedFinal : ""}`);
console.log("  통계: " + finalBody.split("\n").filter((l) => /번$|명$|개$/.test(l.trim())).join(" / "));

await page.screenshot({ path: SHOT("activity-shot") });
if (errs.length) { console.log("\n=== pageerror ==="); errs.slice(0, 6).forEach((e) => console.log("  " + e)); }
console.log("\n스크린샷: activity-shot.png");
await browser.close();
