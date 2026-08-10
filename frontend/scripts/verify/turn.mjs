// 대화 1턴 전체 검증 — C-3 → C-4 → C-5 → C-6 → (NORMAL/GUIDED/CLOSING)
// 헤드리스에는 음성 인식이 없으므로 SpeechRecognition을 스텁으로 주입한다.
import { chromium } from "playwright-core";

import { chromeExecutable } from "./_browser.mjs";

const EXE = chromeExecutable();

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } , permissions: ["microphone"] })).newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.addInitScript(() => {
  // TTS: 호출 기록 + 즉시 종료
  window.__spoken = [];
  if (window.speechSynthesis) {
    window.speechSynthesis.speak = (u) => {
      window.__spoken.push(u.text);
      setTimeout(() => u.onend && u.onend(new Event("end")), 900);
    };
    window.speechSynthesis.cancel = () => {};
    window.speechSynthesis.getVoices = () => [
      { lang: "ko-KR", name: "stub", default: true },
    ];
  }

  // STT 스텁: __say(text)로 발화를 흘려넣는다.
  class StubRecognition {
    constructor() { this.lang = ""; window.__rec = this; }
    start() { setTimeout(() => this.onstart && this.onstart(), 10); }
    stop() { this._finish(); }
    abort() {}
    _finish() {
      const text = window.__pending ?? "";
      window.__pending = undefined;
      if (this.onresult && text) {
        this.onresult({
          resultIndex: 0,
          results: Object.assign([[{ transcript: text, confidence: 1 }]], {
            length: 1,
            item: (i) => this.results[i],
            0: Object.assign([{ transcript: text, confidence: 1 }], {
              isFinal: true, length: 1, item: (i) => ({ transcript: text }),
            }),
          }),
        });
      }
      setTimeout(() => this.onend && this.onend(), 10);
    }
  }
  window.SpeechRecognition = StubRecognition;
  window.webkitSpeechRecognition = StubRecognition;
  window.__say = (text) => { window.__pending = text; window.__rec?.stop(); };
});

await page.goto("http://localhost:3000/play/demo", { waitUntil: "networkidle" });

// 도입 통과
await page.getByText("탭하면 이야기가 시작돼요").click();
for (let i = 0; i < 4; i++) {
  const btn = page.getByRole("button", { name: /다음|이야기 시작하기/ });
  if (await btn.count()) { await btn.first().click().catch(() => {}); await page.waitForTimeout(250); }
}

// 대화1 도착 대기
await page.getByText("이제 말해 볼까?").waitFor({ timeout: 10000 });
console.log("=== C-4 내 차례 도달 ===");
console.log("  OK   '이제 말해 볼까?' 표시");
const glow = await page.locator(".turn-glow").count();
console.log(`  ${glow ? "OK  " : "FAIL"} turn-glow 테두리 ${glow}개`);

const turn = async (label, utterance) => {
  await page.evaluate((t) => window.__say(t), utterance);
  // C-5 확인 화면
  await page.getByText("이렇게 말한 게 맞아?").waitFor({ timeout: 5000 });
  const draft = await page.locator("textarea").inputValue();
  await page.getByRole("button", { name: "보내기" }).click();
  // C-6 → 응답. 상태가 스쳐 지나갈 수 있으므로 짧게 여러 번 샘플링한다.
  const seen = new Set();
  for (let i = 0; i < 26; i++) {
    await page.waitForTimeout(120);
    const b = await page.locator("body").innerText();
    if (b.includes("계속하기")) seen.add("CLOSING (C-12)");
    else if (b.includes("오늘 모은 생각")) seen.add("GUIDED (C-7)");
    else if (b.includes("말하는 중")) seen.add("NORMAL (C-3)");
    if (seen.has("CLOSING (C-12)")) break;
    if (b.includes("이제 말해 볼까?") && seen.size) break;
  }
  const state = [...seen].join(" + ") || "?";
  console.log(`  ${label}: "${draft}" → ${state}`);
  return state;
};

console.log("\n=== 짧은 답을 반복하면 GUIDED로 가는가 ===");
await turn("1턴", "네");
if (await page.getByText("이제 말해 볼까?").count()) {
  await turn("2턴", "음");
}
if (await page.getByText("이제 말해 볼까?").count()) {
  await turn("3턴", "몰라");
}

console.log("\n=== 긴 답으로 CLOSING까지 ===");
for (let i = 0; i < 4; i++) {
  if (!(await page.getByText("이제 말해 볼까?").count())) break;
  const s = await turn(`${i + 1}회`, "며느리가 창피해서 계속 참았던 것 같아요. 가족들에게 솔직하게 말하면 좋겠어요.");
  if (s.startsWith("CLOSING")) break;
}

const closing = await page.getByRole("button", { name: "계속하기" }).count();
console.log(`\n${closing ? "OK  " : "FAIL"} C-12 장면 전환 도달 (계속하기 ${closing}개)`);
if (closing) {
  const stars = await page.locator("text=오늘 모은 생각").count();
  console.log(`  ${stars ? "OK  " : "warn"} 사고 요소 별 뱃지 표시`);
  const body = await page.locator("body").innerText();
  const banned = ["점", "등급", "%", "잘했", "틀렸"].filter((w) => body.includes(w));
  console.log(`  ${banned.length ? "FAIL 평가 표현 발견: " + banned : "OK   평가 표현 없음"}`);
}

await page.screenshot({ path: "turn-shot.png" });
if (errors.length) { console.log("\n=== pageerror ==="); errors.slice(0, 6).forEach((e) => console.log("  " + e)); }
console.log("\n스크린샷: turn-shot.png");
await browser.close();
