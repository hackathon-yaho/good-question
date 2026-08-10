// D-2 드래그(Pointer Events) + /play → /activity 연결 검증
import { chromium } from "playwright-core";

import { chromeExecutable } from "./_browser.mjs";

const EXE = chromeExecutable();
const browser = await chromium.launch({ executablePath: EXE, headless: true });

const stub = () => {
  window.__spoken = [];
  if (window.speechSynthesis) {
    window.speechSynthesis.speak = (u) => {
      window.__spoken.push(u.text);
      setTimeout(() => u.onend && u.onend(new Event("end")), 30);
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

const ok = (c, l) => console.log(`  ${c ? "OK  " : "FAIL"} ${l}`);

/* ── 1. 마우스 드래그 ────────────────────────────────────────────── */
{
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } , permissions: ["microphone"] })).newPage();
  await page.addInitScript(stub);
  await page.goto("http://localhost:3000/activity/drag-mouse", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "시작하기" }).click();
  await page.getByText("이야기 순서대로 놓아볼까?").waitFor();

  console.log("=== 마우스 드래그 (Pointer Events) ===");
  const card = page.locator("button.touch-none").first();
  const cardText = (await card.innerText()).trim();
  const from = await card.boundingBox();
  const to = await page.locator('[data-slot-index="2"]').boundingBox();

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(250);

  const slot2 = (await page.locator('[data-slot-index="2"]').innerText()).trim();
  ok(slot2 === cardText, `3번 칸에 드롭됨 — "${slot2.slice(0, 18)}…"`);
  ok((await page.locator("button.touch-none").count()) === 3, "트레이에서 제거됨");

  // 슬롯 탭 → 트레이 복귀
  await page.locator('[data-slot-index="2"]').click();
  await page.waitForTimeout(200);
  ok((await page.locator("button.touch-none").count()) === 4, "슬롯 탭으로 트레이 복귀");
  await page.close();
}

/* ── 2. 터치 드래그 ──────────────────────────────────────────────── */
{
  const page = await (
    await browser.newContext({
      viewport: { width: 1180, height: 820 },
      hasTouch: true,
      isMobile: false,
      permissions: ["microphone"],
    })
  ).newPage();
  await page.addInitScript(stub);
  await page.goto("http://localhost:3000/activity/drag-touch", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "시작하기" }).click();
  await page.getByText("이야기 순서대로 놓아볼까?").waitFor();

  console.log("\n=== 터치 드래그 (태블릿 1180×820) ===");
  const card = page.locator("button.touch-none").first();
  const cardText = (await card.innerText()).trim();
  const from = await card.boundingBox();
  const to = await page.locator('[data-slot-index="0"]').boundingBox();

  const cdp = await page.context().newCDPSession(page);
  const touch = async (type, x, y) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x, y }],
    });

  await touch("touchStart", from.x + from.width / 2, from.y + from.height / 2);
  await touch("touchMove", to.x + to.width / 2, to.y + to.height / 2);
  await page.waitForTimeout(60);
  await touch("touchEnd", to.x + to.width / 2, to.y + to.height / 2);
  await page.waitForTimeout(300);

  const slot0 = (await page.locator('[data-slot-index="0"]').innerText()).trim();
  ok(slot0 === cardText, `1번 칸에 드롭됨 — "${slot0.slice(0, 18)}…"`);
  await page.close();
}

/* ── 3. /play → /activity 연결 ───────────────────────────────────── */
{
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } , permissions: ["microphone"] })).newPage();
  await page.addInitScript(stub);
  await page.goto("http://localhost:3000/play/handoff", { waitUntil: "networkidle" });

  // /play 완주 → /activity 인계는 상태 인식 드라이버가 있는 verify-handoff.mjs가 담당한다.
  // 여기서 고정 루프로 또 돌리면 같은 것을 두 번, 그것도 더 약하게 검증한다.
  await page.screenshot({ path: "drag-shot.png" });
  await page.close();
}

await browser.close();
console.log("\n스크린샷: drag-shot.png");
