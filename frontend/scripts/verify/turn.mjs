// 대화 1턴 전체 검증 — C-3 → C-4 → C-5 → C-6 → (NORMAL/GUIDED/CLOSING)
// 헤드리스에는 음성 인식이 없으므로 SpeechRecognition을 스텁으로 주입한다.
import { chromium } from "playwright-core";

import { SHOT, chromeExecutable, skipIntro } from "./_browser.mjs";

const EXE = chromeExecutable();

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } , permissions: ["microphone"] })).newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.addInitScript(() => {
  // TTS: 호출 기록 + 즉시 종료
  window.__spoken = [];
  if (window.speechSynthesis) {
    // 낭독 시간을 조절할 수 있게 한다. 기본 900ms는 흐름을 빠르게 돌리기 위한 값이고,
    // **발화 중 화면**(테두리 점등 등)을 보려면 그 순간을 붙잡아야 한다.
    window.__ttsDelayMs = 900;
    window.speechSynthesis.speak = (u) => {
      window.__spoken.push(u.text);
      setTimeout(
        () => u.onend && u.onend(new Event("end")),
        window.__ttsDelayMs ?? 900
      );
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

// 도입 통과 — 자막 개수에 의존하지 않는다
await skipIntro(page);

// 대화1 도착 대기
await page.getByText("이제 말해 볼까?").waitFor({ timeout: 10000 });
console.log("=== C-4 내 차례 도달 ===");
console.log("  OK   '이제 말해 볼까?' 표시");
const glow = await page.locator(".turn-glow").count();
console.log(`  ${glow ? "OK  " : "FAIL"} turn-glow 테두리 ${glow}개`);

/**
 * "이제 말해 볼까?"가 잘리지 않는지 — 요구 7-2.
 *
 * 아래 마이크 칸이 `flex-1`로 남은 높이를 다 가져가면 열이 꽉 차고, 부모의
 * `justify-center`가 무력화되어 문구가 y=0에 앉는다. text-turn은 32px이라 그대로
 * 잘린다. 실제로 1280×800 스크린샷에서 위쪽이 잘려 있었다.
 */
{
  const m = await page.evaluate(() => {
    const p = [...document.querySelectorAll("p")].find(
      (el) => (el.textContent ?? "").trim() === "이제 말해 볼까?"
    );
    const panel = [...document.querySelectorAll("section")].find((s) =>
      s.className.includes("w-[40%]")
    );
    const pause = [...document.querySelectorAll("button")].find(
      (b) => (b.textContent ?? "").trim() === "잠시 멈춤"
    );
    if (!p || !panel) return null;
    const a = p.getBoundingClientRect();
    const b = panel.getBoundingClientRect();
    const q = pause?.getBoundingClientRect();
    return {
      gapTop: Math.round(a.top - b.top),
      pauseOverlap:
        q && Math.min(a.bottom, q.bottom) - Math.max(a.top, q.top) > 1 &&
        Math.min(a.right, q.right) - Math.max(a.left, q.left) > 1
          ? Math.round(Math.min(a.bottom, q.bottom) - Math.max(a.top, q.top))
          : 0,
    };
  });
  if (!m) console.log("  FAIL '이제 말해 볼까?' 위치를 잴 수 없다");
  else {
    console.log(
      `  ${m.gapTop >= 8 ? "OK  " : "FAIL"} '이제 말해 볼까?'가 잘리지 않는다 — 패널 상단에서 ${m.gapTop}px`
    );
    console.log(
      `  ${m.pauseOverlap === 0 ? "OK  " : "FAIL"} '잠시 멈춤' 버튼과 겹치지 않는다 — ${m.pauseOverlap}px`
    );
  }

  /**
   * 발화 패널 요소들이 **패널 진짜 중심**에 있는지 — 요구 확인 사항.
   *
   * ⚠️ 예전에는 "잠시 멈춤"을 피하려고 열 전체에 `pr-28`(112px)을 걸었다. 그 버튼은
   *    우상단 모서리에만 있는데도 오른쪽 여백이 열 전체에 걸려 문구·마이크·안내문이
   *    모두 **43px 왼쪽으로 밀렸다.** 겹치지도 잘리지도 않아 기존 검사는 전부 통과했다.
   *    지금은 위쪽 여백으로 버튼을 피하고 좌우는 대칭으로 둔다.
   */
  const align = await page.evaluate(() => {
    const panel = [...document.querySelectorAll("section")].find((s) =>
      s.className.includes("w-[40%]")
    );
    if (!panel) return null;
    const pb = panel.getBoundingClientRect();
    const center = pb.left + pb.width / 2;
    const off = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return Math.round(r.left + r.width / 2 - center);
    };
    const byText = (t) =>
      [...panel.querySelectorAll("p")].find(
        (e) => (e.textContent ?? "").trim() === t
      );
    return {
      turn: off(byText("이제 말해 볼까?")),
      mic: off(
        panel.querySelector(
          "button[aria-label='말하기 시작'], button[aria-label='말하는 중']"
        )
      ),
    };
  });
  if (!align) console.log("  FAIL 우측 패널을 찾지 못했다");
  else {
    // 안내문과 보내기 버튼은 제거됐다(자동 제출). 남은 두 요소만 본다.
    for (const [name, label] of [
      ["turn", "'이제 말해 볼까?'"],
      ["mic", "마이크"],
    ]) {
      const v = align[name];
      const ok2 = v !== null && Math.abs(v) <= 2;
      console.log(
        `  ${ok2 ? "OK  " : "FAIL"} ${label}이 패널 중심에 정렬 — 중심대비 ${v ?? "?"}px`
      );
    }
  }
}

/**
 * NPC가 말하는 동안 초상 테두리가 **점등**하는지 — 요구 7-1.
 *
 * 예전에는 정지된 `ring-4 ring-info`와, 160px 초상에서 거의 안 보이는
 * `animate-ping` 후광뿐이었다. 지금은 두께·번짐이 함께 커지는 맥동이다.
 */
const checkSpeakingRing = async () => {
  // 링은 **발화 중에만** 있다. 스텁이 900ms에 끝나므로 그 안에 잡아야 한다.
  // 나타날 때까지 짧게 기다린다 — 고정 대기는 느린 실행에서 놓친다.
  await page
    .locator(".animate-speaking-ring")
    .first()
    .waitFor({ timeout: 4000 })
    .catch(() => {});
  const m = await page.evaluate(() => {
    const ring = document.querySelector(".animate-speaking-ring");
    if (!ring) {
      return { found: false, ping: document.querySelectorAll(".animate-ping").length };
    }
    const cs = getComputedStyle(ring);
    return {
      found: true,
      name: cs.animationName,
      duration: cs.animationDuration,
      iteration: cs.animationIterationCount,
      ping: document.querySelectorAll(".animate-ping").length,
    };
  });
  if (!m.found) {
    console.log("  FAIL NPC 발화 중 테두리 점등이 없다");
    return;
  }
  console.log(
    `  ${m.name === "speaking-ring" ? "OK  " : "FAIL"} NPC 발화 중 테두리 점등 — ${m.name} ${m.duration}`
  );
  console.log(
    `  ${m.iteration === "infinite" ? "OK  " : "FAIL"} 발화가 끝날 때까지 반복`
  );
};

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
// 캐릭터가 답하는 동안(C-3) 초상 테두리를 확인한다.
// 낭독을 길게 늘려 그 순간을 붙잡고, 확인이 끝나면 원래대로 돌린다.
await page.evaluate(() => { window.__ttsDelayMs = 4000; });
await turn("1턴", "네");
await checkSpeakingRing();
await page.evaluate(() => { window.__ttsDelayMs = 900; });
// ⚠️ 낭독을 늘린 만큼 아직 캐릭터가 말하는 중이다. 아이 차례가 돌아올 때까지
//    기다려야 한다 — 안 기다리면 아래 턴들이 "이제 말해 볼까?"를 못 찾고 전부 건너뛴다.
await page.getByText("이제 말해 볼까?").waitFor({ timeout: 10000 }).catch(() => {});
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

  /**
   * 마무리 대사의 좌우대칭과 폭 — 요구 8.
   *
   * `SpeechBubble`은 화자로 정렬을 정한다. `character`면 `justify-start` +
   * `max-w-[92%]`라 **오른쪽에만** 여백이 남아, 나머지 요소가 다 가운데 정렬인
   * 이 화면에서 이 하나만 왼쪽으로 밀려 보였다.
   */
  const bubble = await page.evaluate(() => {
    // 마무리 대사 말풍선 — text-dialogue를 가진 블록
    const el = [...document.querySelectorAll("div")].find(
      (d) =>
        d.className.includes("rounded-bubble") &&
        d.className.includes("text-dialogue")
    );
    if (!el) return null;
    const parent = el.parentElement;
    if (!parent) return null;
    const a = el.getBoundingClientRect();
    const b = parent.getBoundingClientRect();
    const fs = parseFloat(getComputedStyle(el).fontSize);
    const probe = document.createElement("span");
    probe.style.cssText = `position:fixed;visibility:hidden;white-space:nowrap;font-size:${fs}px`;
    probe.textContent = "가".repeat(10);
    document.body.appendChild(probe);
    const ko = probe.getBoundingClientRect().width / 10;
    probe.remove();
    return {
      left: Math.round(a.left - b.left),
      right: Math.round(b.right - a.right),
      width: Math.round(a.width),
      perLine: Math.round(a.width / ko),
    };
  });
  if (!bubble) console.log("  FAIL 마무리 대사 말풍선을 찾지 못했다");
  else {
    console.log(
      `  ${Math.abs(bubble.left - bubble.right) <= 2 ? "OK  " : "FAIL"} 마무리 대사가 좌우대칭 — 좌 ${bubble.left}px / 우 ${bubble.right}px`
    );
    // 첫 번째 안은 368px(한글 13자)이었다. 720px로 넓혔다.
    console.log(
      `  ${bubble.width >= 600 ? "OK  " : "FAIL"} 마무리 대사 폭 ${bubble.width}px (한글 ${bubble.perLine}자)`
    );
  }
}

await page.screenshot({ path: SHOT("turn-shot") });
if (errors.length) { console.log("\n=== pageerror ==="); errors.slice(0, 6).forEach((e) => console.log("  " + e)); }
console.log("\n스크린샷: turn-shot.png");
await browser.close();
