// /play 도입부 클릭·TTS 검증
import { chromium } from "playwright-core";

import { chromeExecutable } from "./_browser.mjs";

const EXE = chromeExecutable();

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } , permissions: ["microphone"] })).newPage();

const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));

// speechSynthesis.speak을 가로채 호출 내역을 기록한다.
// 헤드리스에는 음성 엔진이 없어 실제 소리는 안 나므로, 호출 여부로 검증한다.
await page.addInitScript(() => {
  window.__spoken = [];
  const orig = window.speechSynthesis?.speak?.bind(window.speechSynthesis);
  if (window.speechSynthesis) {
    window.speechSynthesis.speak = (u) => {
      window.__spoken.push({ text: u.text, lang: u.lang, rate: u.rate });
      // onend가 안 오는 브라우저를 흉내내지 않도록 바로 종료 처리
      setTimeout(() => u.onend && u.onend(new Event("end")), 60);
      try { orig && orig(u); } catch {}
    };
  }
});

const step = async (label, fn) => {
  try {
    await fn();
    console.log(`  OK   ${label}`);
  } catch (e) {
    console.log(`  FAIL ${label} — ${String(e).split("\n")[0]}`);
  }
};

await page.goto("http://localhost:3000/play/demo", { waitUntil: "networkidle" });

console.log("=== 1. 도입 화면 렌더 ===");
await step("도입 문장 표시", () =>
  page.getByText("옛날 어느 마을에", { exact: false }).waitFor({ timeout: 8000 })
);
await step("자동재생 게이트 표시", () =>
  page.getByText("탭하면 이야기가 시작돼요").waitFor({ timeout: 3000 })
);

console.log("=== 2. 게이트 탭 → TTS 시작 ===");
await step("게이트 클릭", () =>
  page.getByText("탭하면 이야기가 시작돼요").click({ timeout: 3000 })
);
await page.waitForTimeout(400);
let spoken = await page.evaluate(() => window.__spoken);
console.log(`  speak 호출 ${spoken.length}회` +
  (spoken[0] ? ` — lang=${spoken[0].lang} "${spoken[0].text.slice(0, 24)}…"` : ""));

console.log("=== 3. '다음' 버튼으로 문장 진행 ===");
const firstSentence = await page
  .locator("p.text-intro")
  .first()
  .textContent();
await step("다음 클릭", () =>
  page.getByRole("button", { name: "다음" }).click({ timeout: 3000 })
);
await page.waitForTimeout(500);
const secondSentence = await page
  .locator("p.text-intro")
  .first()
  .textContent();
console.log(
  secondSentence && secondSentence !== firstSentence
    ? `  OK   문장 변경됨\n         전: ${firstSentence?.slice(0, 30)}…\n         후: ${secondSentence?.slice(0, 30)}…`
    : `  FAIL 문장이 그대로다: ${firstSentence?.slice(0, 40)}`
);

console.log("=== 4. 끝까지 진행 → 전개1(C-2) 전환 ===");
for (let i = 0; i < 4; i++) {
  const next = page.getByRole("button", { name: /다음|이야기 시작하기/ });
  if (await next.count()) {
    await next.first().click().catch(() => {});
    await page.waitForTimeout(400);
  }
}
// 가짜 TTS는 ms 단위로 끝나므로 "이야기 듣는 중" 칩은 눈 깜빡할 사이에 지나간다.
// 칩이 떠 있는 순간을 노리는 대신, 전개1이 실제로 낭독됐고 좌우 분할까지 갔는지 본다.
await step("좌우 분할 전환 (장면 1 · 캐릭터 패널)", async () => {
  await page.getByText("장면 1").waitFor({ timeout: 6000 });
  await page.getByText("방귀쟁이 며느리").first().waitFor({ timeout: 6000 });
});

const narrated = (await page.evaluate(() => window.__spoken)).some((s) =>
  s.text.startsWith("그래서 며느리는 방귀가")
);
console.log(
  narrated ? "  OK   전개1 자막 낭독됨" : "  FAIL 전개1 자막이 낭독되지 않았다"
);

spoken = await page.evaluate(() => window.__spoken);
console.log(`\n총 speak 호출: ${spoken.length}회`);
spoken.slice(0, 8).forEach((s, i) =>
  console.log(`  ${i + 1}. "${s.text.slice(0, 40)}…"`)
);

if (logs.length) {
  console.log("\n=== 콘솔/에러 ===");
  logs.slice(0, 12).forEach((l) => console.log("  " + l));
}

await page.screenshot({ path: "play-shot.png", fullPage: false });
console.log("\n스크린샷: play-shot.png");

await browser.close();
