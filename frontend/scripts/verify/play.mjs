// /play 도입부 클릭·TTS 검증
import { chromium } from "playwright-core";

import { SHOT, chromeExecutable, skipIntro } from "./_browser.mjs";

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

/**
 * 자막의 줄 길이와 배치 — 요구 6.
 *
 * ⚠️ `ch`는 숫자 "0"의 폭(0.617em)이고 한글은 0.864em이라 1.4배 좁다.
 *    게다가 글자 크기가 없는 래퍼에 걸면 루트 16px로 계산된다. 두 실수가 겹쳐
 *    `max-w-[28ch]`가 553px 의도에 **266.9px**로 나왔고, 줄당 한글 9.6자였다.
 *    명세 §1-3은 22자다. `.kid-line`(19em)이 그 값을 만든다.
 */
console.log("=== 2-1. 자막 줄 길이 · 배치 (요구 6) ===");
{
  const m = await page.evaluate(() => {
    const p = document.querySelector("p.text-intro");
    if (!p) return null;
    const fs = parseFloat(getComputedStyle(p).fontSize);
    // 한글 1자의 실제 폭을 같은 글꼴·크기로 잰다
    const probe = document.createElement("span");
    probe.style.cssText = `position:fixed;visibility:hidden;white-space:nowrap;font-size:${fs}px`;
    probe.textContent = "가".repeat(10);
    document.body.appendChild(probe);
    const ko = probe.getBoundingClientRect().width / 10;
    probe.remove();

    const width = p.getBoundingClientRect().width;
    const badge = [...document.querySelectorAll("p")].find(
      (el) => (el.textContent ?? "").trim() === "이야기를 듣고 있어요"
    );
    const replay = [...document.querySelectorAll("button")].find((b) =>
      (b.textContent ?? "").includes("다시 듣기")
    );
    const bars = document.querySelectorAll(".animate-wave");
    const barBox = bars[0]?.getBoundingClientRect();
    return {
      width: Math.round(width),
      perLine: Math.round((width / ko) * 10) / 10,
      badgeTop: badge ? Math.round(badge.getBoundingClientRect().top) : null,
      barTop: barBox ? Math.round(barBox.top) : null,
      subtitleTop: Math.round(p.getBoundingClientRect().top),
      replayTop: replay ? Math.round(replay.getBoundingClientRect().top) : null,
      barCount: bars.length,
    };
  });

  if (!m) {
    console.log("  FAIL 자막을 찾지 못했다");
  } else {
    console.log(
      `  ${m.perLine >= 20 && m.perLine <= 24 ? "OK  " : "FAIL"} 자막 줄당 한글 ${m.perLine}자 (목표 22자 · §1-3) — ${m.width}px`
    );
    console.log(
      `  ${m.barCount === 4 ? "OK  " : "FAIL"} 음량 웨이브 막대 4개 — ${m.barCount}개`
    );
    // 웨이브와 라벨이 **다른 행**
    console.log(
      `  ${m.barTop !== null && m.badgeTop !== null && m.badgeTop > m.barTop ? "OK  " : "FAIL"} 웨이브와 라벨이 다른 행 (웨이브가 위)`
    );
    /**
     * ⚠️ '다시 듣기' 검사를 뺐다. C-1이 **자동 진행**으로 바뀌면서 버튼이 사라졌다 —
     *    문장 낭독이 끝나면 0.5초 뒤 다음 문장으로 가고, 마지막 문장에서만
     *    "이야기 시작하기"가 뜬다. 조작을 줄이자는 인터뷰 요구를 따른 의도된 변경이다.
     */
  }
}

console.log("=== 3. 자막 자동 진행 ===");
const firstSentence = await page
  .locator("p.text-intro")
  .first()
  .textContent();
// 버튼을 누르지 않는다. 낭독이 끝나면 스스로 다음 문장으로 넘어가야 한다.
await step("자막이 저절로 넘어간다", async () => {
  await page.waitForFunction(
    (before) =>
      document.querySelector("p.text-intro")?.textContent?.trim() !== before,
    (firstSentence ?? "").trim(),
    { timeout: 15000 }
  );
});
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
// 자막 개수에 의존하지 않는다 — 버튼이 사라질 때까지 누른다. (_browser.mjs)
await skipIntro(page);
// 가짜 TTS는 ms 단위로 끝나므로 "이야기 듣는 중" 칩은 눈 깜빡할 사이에 지나간다.
// 칩이 떠 있는 순간을 노리는 대신, 전개1이 실제로 낭독됐고 좌우 분할까지 갔는지 본다.
// 전개1(C-2)은 가짜 TTS가 ms 단위로 끝나 순식간에 지나간다. 그래서 "대화 장면까지
// 도달했는가"로 확인한다 — 좌측에 캐릭터 이름과 장면 표시가 함께 떠 있어야 한다.
await step("좌우 분할 전환 (장면 표시 · 캐릭터 무대)", async () => {
  await page.getByText("방귀쟁이 며느리").first().waitFor({ timeout: 8000 });
  await page.getByText(/^장면 \d$/).first().waitFor({ timeout: 6000 });
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

await page.screenshot({ path: SHOT("play-shot"), fullPage: false });
console.log("\n스크린샷: play-shot.png");

await browser.close();
