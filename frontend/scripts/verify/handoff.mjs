// /play 완주 → /activity 자동 이동. 상태를 읽고 그에 맞는 조작만 한다.
import { chromium } from "playwright-core";

import { SHOT, chromeExecutable, passMissionBrief } from "./_browser.mjs";

const EXE = chromeExecutable();
const browser = await chromium.launch({ executablePath: EXE, headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } , permissions: ["microphone"] })).newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));

await page.addInitScript(() => {
  if (window.speechSynthesis) {
    /**
     * 낭독을 600ms로 둔다. 25ms면 C-3(캐릭터 발화 중)이 눈 깜빡할 사이에 지나가
     * 350ms마다 살펴보는 루프가 **그 상태를 거의 못 잡는다.** 우측 패널의 대화
     * 내역을 확인해야 하므로 표본이 잡힐 만큼은 머물러야 한다.
     * 실제 TTS는 몇 초씩 걸리니 600ms도 여전히 빠른 쪽이다.
     */
    window.speechSynthesis.speak = (u) =>
      setTimeout(() => u.onend && u.onend(new Event("end")), 600);
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
    // 미션 브리프 — 아이가 읽고 "말해볼래요"를 눌러야 발화 차례가 온다 (계획 D16)
    if (body.includes("말해볼래요")) return "MISSION";
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

/**
 * 완주까지 **시간**으로 제한한다. 반복 횟수로 세지 않는다.
 *
 * ⚠️ 예전에는 `step < 120`처럼 반복 횟수를 셌다. 그런데 한 번 도는 동안 화면 상태
 *    하나에만 반응하므로, 캐릭터가 말하는 중(C-3)이나 응답을 기다리는 중(C-6)에는
 *    **아무 분기도 타지 않고 반복만 소모한다.** 미션이 [브리프 → 발화]를 네 번
 *    돌게 되면서 필요한 반복이 늘었고, 전체 검증을 병렬로 돌리면 대기 구간이
 *    길어져 더 늘어난다. 그래서 횟수를 올리는 건 근본 대책이 아니다 —
 *    올릴 때마다 또 모자란다.
 *
 * 우리가 정말 정하고 싶은 것은 "완주에 몇 초까지 허용할지"다.
 */
const DEADLINE_MS = 180_000;
const startedAt = Date.now();
/**
 * C-3에서 우측 패널이 **어느 캐릭터와의 대화를 몇 개 보여주는지** 기록한다.
 *
 * 같은 캐릭터가 여러 장면에 나오므로(PRD I-13 · 방귀쟁이 며느리는 장면 1과 4)
 * 재등장 장면에서는 지난 장면 대화가 함께 보이고 "지난 이야기" 구분선이 붙어야 한다.
 * 완주하는 이 스위트가 그 순간을 지나가므로 여기서 함께 확인한다.
 */
const panelLog = [];

while (Date.now() - startedAt < DEADLINE_MS) {
  const state = await readState();
  if (seen.at(-1) !== state) seen.push(state);
  if (state === "ACTIVITY") break;

  if (state === "C3") {
    const snap = await page.evaluate(() => {
      const panel = [...document.querySelectorAll("section")].find((s) =>
        s.className.includes("w-[40%]")
      );
      const header = panel?.querySelector("header p")?.textContent?.trim();
      if (!header) return null;
      const text = panel.textContent ?? "";
      return {
        name: header.replace("와 나눈 이야기", ""),
        past: text.includes("지난 이야기"),
        bubbles: panel.querySelectorAll(".rounded-bubble").length,
      };
    });
    if (snap) {
      const last = panelLog.at(-1);
      if (!last || last.name !== snap.name || last.past !== snap.past) {
        panelLog.push(snap);
      } else if (snap.bubbles > last.bubbles) {
        last.bubbles = snap.bubbles;
      }
    }
  }

  switch (state) {
    case "GATE":
      await page.getByText("탭하면 이야기가 시작돼요").click();
      break;
    case "C1": {
      const b = page.getByRole("button", { name: /다음|이야기 시작하기/ });
      if (await b.count()) await b.first().click().catch(() => {});
      break;
    }
    case "MISSION":
      await passMissionBrief(page);
      break;
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

const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
const url = new URL(page.url()).pathname;
console.log(`\n완주 소요 ${elapsedSec}초 (상한 ${DEADLINE_MS / 1000}초)`);
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

/* ── 우측 패널이 그 캐릭터와의 대화 전체를 보여주는가 ─────────────── */
console.log("\n=== C-3 우측 패널 (캐릭터별 대화 내역) ===");
for (const e of panelLog) {
  console.log(
    `  ${e.name} — 말풍선 ${e.bubbles}개${e.past ? " · 지난 이야기 구분선" : ""}`
  );
}

const names = panelLog.map((e) => e.name);
const repeated = names.find((n, i) => names.indexOf(n) !== i);
console.log(
  `  ${repeated ? "OK  " : "FAIL"} 같은 캐릭터가 여러 장면에 재등장 — ${repeated ?? "없음"}`
);
if (repeated) {
  const entries = panelLog.filter((e) => e.name === repeated);
  const later = entries.at(-1);
  console.log(
    `  ${later?.past ? "OK  " : "FAIL"} 재등장 장면에 "지난 이야기" 구분선`
  );
  // 재등장 장면은 지난 장면 대화까지 들고 있으므로 첫 등장보다 말풍선이 많아야 한다
  console.log(
    `  ${(later?.bubbles ?? 0) > (entries[0]?.bubbles ?? 0) ? "OK  " : "FAIL"} 재등장 장면이 지난 대화까지 보여준다 — 첫 등장 ${entries[0]?.bubbles}개 → 재등장 ${later?.bubbles}개`
  );
}
// 다른 캐릭터 대사는 섞이지 않아야 한다 — 각 항목의 이름이 하나여야 한다
console.log(
  `  ${panelLog.every((e) => !e.name.includes(",")) ? "OK  " : "FAIL"} 한 패널에 한 캐릭터만`
);

if (errs.length) { console.log("\npageerror:"); errs.slice(0, 5).forEach((e) => console.log("  " + e)); }
await page.screenshot({ path: SHOT("handoff-ok") });
await browser.close();
