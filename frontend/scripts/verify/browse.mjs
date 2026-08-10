// 8단계 검증 — B-2 목록 · B-3 상세 · B-4 이어하기 모달 · C-9 단어 팝업 · E 단어장 · F-1 마이페이지
import { chromium } from "playwright-core";

import { BASE, chromeExecutable } from "./_browser.mjs";

const EXE = chromeExecutable();

const browser = await chromium.launch({ executablePath: EXE, headless: true });

let fails = 0;
const ok = (cond, label, extra = "") => {
  if (!cond) fails += 1;
  console.log(`  ${cond ? "OK  " : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};
const STORY = "s_banggui_daughter_in_law_001";

const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  permissions: ["microphone"],
});
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));

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
  // TTS·STT 스텁 — 대화를 빠르게 통과시킨다.
  if (window.speechSynthesis) {
    // 밑줄 단어가 있는 대사(C-3)에서는 onend를 보내지 않는다. 그러면 화면이
    // CHARACTER_SPEAKING에 머물러 단어를 탭할 시간이 생긴다. 실제 브라우저에서는
    // TTS가 몇 초씩 걸리므로 같은 상태가 자연히 유지된다.
    window.speechSynthesis.speak = (u) => {
      if (u.text.includes("창피한")) return;
      setTimeout(() => u.onend && u.onend(new Event("end")), 25);
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
});

const path = () => new URL(page.url()).pathname;

// ── B-2 이야기 목록 ───────────────────────────────────────────────────
console.log("=== B-2 이야기 목록 ===");
await page.goto(`${BASE}/stories`, { waitUntil: "networkidle" });
await page.getByText("방귀 뀌는 며느리").first().waitFor({ timeout: 8000 }).catch(() => {});
ok(await page.getByRole("heading", { name: "이야기" }).isVisible(), "제목");
ok((await page.getByRole("tab").count()) === 4, "필터 칩 = 전체 + 주제 3개", `${await page.getByRole("tab").count()}개`);
ok(await page.getByText("방귀 뀌는 며느리").first().isVisible(), "카드 1장");
ok((await page.getByText("진행 중").count()) === 0, "세션 없으면 배지 없음");

// 필터: 없는 주제 → 목록만 비고 페이지 이동은 없음
await page.getByRole("tab", { name: "자기이해" }).click();
await page.waitForTimeout(500);
ok(path() === "/stories", "필터 클릭 후에도 같은 경로", path());
ok(await page.getByText("방귀 뀌는 며느리").first().isVisible(), "해당 주제면 카드 유지");

// ── B-3 이야기 상세 ───────────────────────────────────────────────────
console.log("\n=== B-3 이야기 상세 ===");
await page.getByRole("tab", { name: "전체" }).click();
await page.waitForTimeout(400);
await page.getByText("방귀 뀌는 며느리").first().click();
await page.waitForURL("**/stories/**", { timeout: 8000 }).catch(() => {});
await page.getByRole("heading", { name: "방귀 뀌는 며느리" }).waitFor({ timeout: 8000 }).catch(() => {});
ok(path() === `/stories/${STORY}`, "→ /stories/{storyId}", path());

for (const [label, text] of [
  ["이야기 도입", "옛날 어느 마을에"],
  ["이야기 상황", "큰 방귀 때문에 며느리가 집에서 쫓겨날 위기에 놓였어요."],
  ["내 역할", "며느리의 방귀가 특별한 장점이 될 수 있도록 도와주세요."],
]) {
  ok(await page.getByText(label, { exact: true }).isVisible(), `정보 블록 "${label}"`);
  ok(
    await page.getByText(text, { exact: false }).first().isVisible(),
    `"${label}" 내용 = PRD F-03 확정 문구`
  );
}
ok(await page.getByText("방귀쟁이 며느리").isVisible(), "등장 캐릭터 (distinct)");
ok(await page.getByText("시아버지", { exact: true }).isVisible(), "등장 캐릭터 2");
ok(await page.getByText("마을 이장").isVisible(), "등장 캐릭터 3");
ok(await page.getByText("약 20분").isVisible(), "예상 시간");
ok(await page.getByText("난이도 보통").isVisible(), "난이도");

// 세션이 없으면 B-4 없이 바로 시작
await page.getByRole("button", { name: "이야기 시작하기" }).click();
await page.waitForURL("**/play/**", { timeout: 10000 }).catch(() => {});
ok(path().startsWith("/play/"), "세션 없으면 곧바로 /play", path());

// ── C-9 단어 뜻 팝업 → 단어장에 담기 ─────────────────────────────────
console.log("\n=== C-9 단어 뜻 팝업 ===");
// 밑줄 단어("구박")는 장면 2(sc_banggui_05)에 있다. 대화 1을 끝내야 도달한다.
await page.getByText("탭하면 이야기가 시작돼요").click({ timeout: 8000 }).catch(() => {});

const LONG = "며느리가 창피해서 계속 참았던 것 같아요. 가족들에게 솔직하게 말하면 좋겠어요. 그러면 마음이 편해질 거예요.";
let found = false;
for (let step = 0; step < 60 && !found; step++) {
  const body = await page.locator("body").innerText();
  if (await page.getByRole("button", { name: /창피한 뜻 보기/ }).count()) { found = true; break; }
  if (body.includes("계속하기")) await page.getByRole("button", { name: "계속하기" }).click().catch(() => {});
  else if (body.includes("이제 말해 볼까?")) await page.evaluate((t) => window.__say(t), LONG);
  else if (body.includes("이렇게 말한 게 맞아?")) await page.getByRole("button", { name: "보내기" }).click().catch(() => {});
  else if (body.includes("다음") || body.includes("이야기 시작하기")) {
    const b = page.getByRole("button", { name: /다음|이야기 시작하기/ });
    if (await b.count()) await b.first().click().catch(() => {});
  }
  await page.waitForTimeout(320);
}
ok(found, "장면 2 첫 대사에 밑줄 단어 '창피한'");

if (found) {
  await page.getByRole("button", { name: /창피한 뜻 보기/ }).first().click();
  await page.getByText("쉬운 뜻").waitFor({ timeout: 5000 }).catch(() => {});
  ok(await page.getByText("쉬운 뜻").isVisible(), "C-9 모달 — 쉬운 뜻 카드");
  ok(
    await page.getByText("남이 볼까 봐 부끄럽고 얼굴이 뜨거워지는 마음").isVisible(),
    "뜻 표시"
  );
  ok(await page.getByText("이야기 속에서는").isVisible(), "원문 카드");
  await page.getByRole("button", { name: "단어장에 담기" }).click();
  await page.getByText("단어장에 담았어요!").waitFor({ timeout: 5000 }).catch(() => {});
  ok(await page.getByText("단어장에 담았어요!").isVisible(), "토스트 '단어장에 담았어요!'");
  await page.waitForTimeout(400);
  ok((await page.getByText("쉬운 뜻").count()) === 0, "담으면 모달이 닫힌다");

  // 다시 열면 "담김 ✓"
  await page.getByRole("button", { name: /창피한 뜻 보기/ }).first().click();
  await page.waitForTimeout(400);
  ok(
    (await page.getByRole("button", { name: "담김 ✓" }).count()) === 1,
    "이미 담긴 단어면 '담김 ✓'"
  );
  await page.getByRole("button", { name: "닫기" }).click();
}

// ── E-1 / E-2 단어장 ─────────────────────────────────────────────────
console.log("\n=== E 단어장 ===");
await page.goto(`${BASE}/wordbook`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "단어장" }).waitFor({ timeout: 8000 }).catch(() => {});
await page.waitForTimeout(500);
ok(await page.getByText("1개").isVisible(), "개수 칩");
ok(await page.getByRole("button", { name: "창피한", exact: true }).isVisible(), "담은 단어 카드");
ok(await page.getByText("새 단어").isVisible(), "'새 단어' 칩");
ok(
  (await page.getByRole("button", { name: "창피한 발음 듣기" }).count()) >= 1,
  "발음 버튼 (TTS)"
);

// 하트 토글
await page.getByRole("button", { name: "창피한 좋아하는 단어로 담기" }).click();
await page.waitForTimeout(600);
ok(
  (await page.getByRole("button", { name: "창피한 좋아하는 단어 해제" }).count()) >= 1,
  "하트 토글 반영"
);
await page.getByRole("tab", { name: "좋아하는 단어" }).click();
await page.waitForTimeout(600);
ok(await page.getByRole("button", { name: "창피한", exact: true }).isVisible(), "'좋아하는 단어' 필터");

// E-2 모달
await page.getByRole("tab", { name: "전체" }).click();
await page.waitForTimeout(500);
await page.getByRole("button", { name: "창피한", exact: true }).click();
await page.waitForTimeout(400);
ok((await page.getByRole("dialog").count()) === 1, "E-2 모달 열림");
ok(
  await page.getByText(/방귀 뀌는 며느리 · 장면 \d에서 만났어요/).isVisible(),
  "출처 메타"
);
ok(
  (await page.getByRole("button", { name: "다음 단어" }).count()) === 0,
  "단어가 1개면 '다음 단어' 없음"
);
await page.getByRole("button", { name: "닫기" }).click();

// 빈 상태
await page.evaluate(() => window.localStorage.removeItem("gq.mock.wordbook"));
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);
ok(
  await page
    .getByText("이야기를 하다가 모르는 단어를 만나면 여기에 담을 수 있어요.")
    .isVisible(),
  "빈 상태 안내"
);

// ── F-1 마이페이지 ───────────────────────────────────────────────────
console.log("\n=== F-1 마이페이지 ===");
await page.goto(`${BASE}/mypage`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "민준" }).waitFor({ timeout: 8000 }).catch(() => {});
ok(await page.getByRole("heading", { name: "민준" }).isVisible(), "프로필 헤더");
for (const label of ["완료한 이야기", "모은 단어", "함께한 날"]) {
  ok(await page.getByText(label).isVisible(), `통계 "${label}"`);
}
ok((await page.getByText("별가루").count()) === 0, "별가루 칩 없음 (Q-12)");
const mypageBody = await page.locator("body").innerText();
ok(
  !mypageBody.includes("내 목소리로"),
  "'내 목소리로 듣기' 문구 없음 (Q-07 음성 미저장)"
);
ok(
  mypageBody.includes("목소리는 저장하지 않아요"),
  "음성 미저장 안내 문구"
);

// ── B-4 이어하기 확인 모달 ───────────────────────────────────────────
console.log("\n=== B-4 이어하기 확인 모달 ===");
await page.goto(`${BASE}/stories/${STORY}`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "이야기 시작하기" }).waitFor({ timeout: 8000 });
await page.getByRole("button", { name: "이야기 시작하기" }).click();
await page.getByRole("heading", { name: "이어서 할까요?" }).waitFor({ timeout: 6000 }).catch(() => {});
ok(await page.getByRole("heading", { name: "이어서 할까요?" }).isVisible(), "진행 중 세션 → B-4 모달");
ok(
  await page.getByText(/지난번에 장면 \d까지 이야기했어요/).isVisible(),
  "진행 문구"
);
// 바깥 클릭으로 닫히지 않는다 (선택 강제)
await page.mouse.click(20, 20);
await page.waitForTimeout(400);
ok(await page.getByRole("heading", { name: "이어서 할까요?" }).isVisible(), "바깥 클릭으로 닫히지 않음");

await page.getByRole("button", { name: "처음부터 하기" }).click();
await page.waitForURL("**/play/**", { timeout: 10000 }).catch(() => {});
ok(path().startsWith("/play/"), "처음부터 하기 → /play", path());
await page.getByText("옛날 어느 마을에", { exact: false }).waitFor({ timeout: 8000 }).catch(() => {});
ok(
  await page.getByText("옛날 어느 마을에", { exact: false }).isVisible(),
  "새 세션은 도입부터"
);

// 기록 보존: 이전 세션의 대화가 남아 있어야 한다 (B-4 체크리스트)
const kept = await page.evaluate(() => {
  const raw = window.localStorage.getItem("gq.mock.sessions");
  if (!raw) return 0;
  const parsed = JSON.parse(raw);
  return (parsed.sessions ?? []).reduce((sum, s) => sum + (s.messages?.length ?? 0), 0);
});
ok(kept > 0, "'처음부터 하기' 후에도 이전 대화 기록이 남아 있다", `메시지 ${kept}건`);

if (errs.length) {
  console.log("\n=== 에러 ===");
  [...new Set(errs)].slice(0, 6).forEach((e) => console.log("  " + e));
}
console.log(`\n${fails === 0 ? "전부 통과" : `실패 ${fails}건`}`);
await page.screenshot({ path: "browse-shot.png" });
await browser.close();
