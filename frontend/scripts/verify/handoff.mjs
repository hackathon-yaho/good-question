// /play 완주 → /activity 자동 이동. 상태를 읽고 그에 맞는 조작만 한다.
import { chromium } from "playwright-core";

import { chromeExecutable } from "./_browser.mjs";

const EXE = chromeExecutable();
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } , permissions: ["microphone"] })).newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));

await page.addInitScript(() => {
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
});

/** 우측 패널 텍스트로 현재 상태를 판별한다. */
async function readState() {
  return page.evaluate(() => {
    if (location.pathname.startsWith("/activity/")) return "ACTIVITY";
    const body = document.body.innerText;
    if (body.includes("탭하면 이야기가 시작돼요")) return "GATE";
    if (body.includes("계속하기")) return "C12";
    if (body.includes("이렇게 말한 게 맞아?")) return "C5";
    if (body.includes("잘 안 들렸어")) return "I2";
    if (body.includes("이제 말해 볼까?")) return "C4";
    if (body.includes("음… 생각 중이야") || body.includes("조금만 더 기다려줘")) return "C6";
    if (body.includes("말하는 중")) return "C3";
    if (body.includes("이야기 듣는 중")) return "C2";
    if (body.includes("다음") || body.includes("이야기 시작하기")) return "C1";
    return "?";
  });
}

const LONG =
  "며느리가 창피해서 계속 참았던 것 같아요. 가족들에게 솔직하게 말하면 좋겠어요. 그러면 마음이 편해질 거예요.";

await page.goto("http://localhost:3000/play/handoff2", { waitUntil: "networkidle" });

const seen = [];
let utterances = 0;

for (let step = 0; step < 120; step++) {
  const state = await readState();
  if (seen.at(-1) !== state) seen.push(state);
  if (state === "ACTIVITY") break;

  switch (state) {
    case "GATE":
      await page.getByText("탭하면 이야기가 시작돼요").click();
      break;
    case "C1": {
      const b = page.getByRole("button", { name: /다음|이야기 시작하기/ });
      if (await b.count()) await b.first().click().catch(() => {});
      break;
    }
    case "C4":
      // 반드시 발화를 먼저 흘려넣는다. 빈 상태로 보내기를 누르면 I-2로 간다.
      await page.evaluate((t) => window.__say(t), LONG);
      utterances += 1;
      break;
    case "C5":
      await page.getByRole("button", { name: "보내기" }).click().catch(() => {});
      break;
    case "C12":
      await page.getByRole("button", { name: "계속하기" }).click().catch(() => {});
      break;
    case "I2":
      await page.getByRole("button", { name: "다시 말하기" }).click().catch(() => {});
      break;
    default:
      break; // C2 · C3 · C6은 자동 진행이므로 기다린다
  }
  await page.waitForTimeout(350);
}

const url = new URL(page.url()).pathname;
console.log("=== 상태 전이 경로 ===");
console.log("  " + seen.join(" → "));
console.log(`\n  아이 발화 ${utterances}회`);
console.log(`  ${url.startsWith("/activity/") ? "OK  " : "FAIL"} 최종 경로 ${url}`);

if (url.startsWith("/activity/")) {
  const arrived = await page.getByText("이제 네 이야기로 다시 들려줄래?").count();
  console.log(`  ${arrived ? "OK  " : "FAIL"} D-1 활동 인트로 도달`);
}

const scenes = seen.filter((s) => s === "C12").length;
console.log(`  ${scenes === 4 ? "OK  " : "info"} C-12 장면 전환 ${scenes}회 (대화 장면 4개)`);

if (errs.length) { console.log("\npageerror:"); errs.slice(0, 5).forEach((e) => console.log("  " + e)); }
await page.screenshot({ path: "handoff-ok.png" });
await browser.close();
