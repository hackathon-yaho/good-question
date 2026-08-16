// 8단계 검증 — B-2 목록 · B-3 상세 · B-4 이어하기 모달 · C-9 단어 팝업 · E 단어장 · F-1 마이페이지
import { chromium } from "playwright-core";

import { SHOT, BASE, chromeExecutable, passMissionBrief } from "./_browser.mjs";

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
// 목 카탈로그가 3편이다(재생 가능 1 + 준비 중 2). 주제는 세 편의 합집합이라
// 다름·자기이해·장점 발견·용기·지혜·가족 6개 + "전체" = 7개.
// 카탈로그 편이 없으면 카드가 1장이라 **태블릿 3열을 확인할 방법이 없다.**
ok((await page.getByRole("tab").count()) === 7, "필터 칩 = 전체 + 주제 6개", `${await page.getByRole("tab").count()}개`);
{
  const cards = await page.locator('a[href^="/stories/"]').count();
  ok(cards === 3, "카드 3장 (재생 가능 1 + 준비 중 2)", `${cards}장`);
}
// 태블릿 1133px에서도 한 행에 3개다. 1열당 (813−48)÷3 = 255px.
{
  // ⚠️ <a>가 아니라 부모 <li>를 잰다. `hover:-translate-y-0.5` 때문에 포인터가
  //    얹힌 카드만 2px 올라가 "행이 다르다"로 오판된다.
  const tops = await page.evaluate(() =>
    [...document.querySelectorAll('a[href^="/stories/"]')].map((a) =>
      Math.round((a.parentElement ?? a).getBoundingClientRect().top)
    )
  );
  ok(new Set(tops).size === 1, "카드 3장이 한 행 (태블릿 3열)", `y=${[...new Set(tops)].join(",")}`);
}
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
/**
 * 뒤로가기가 표지 모서리에 딱 붙지 않는지 — 요구 5-2.
 * 예전에는 바깥 여백 `p-6`(24px)과 버튼 위치 `top-6`(24px)이 같아서
 * 버튼이 표지가 시작하는 좌표 정확히 그 지점에 앉았다.
 */
{
  const gap = await page.evaluate(() => {
    const back = document.querySelector('button[aria-label="돌아가기"], a[aria-label="돌아가기"]');
    if (!back) return null;
    // 표지 컨테이너 — 버튼의 offsetParent가 그것이다
    const cover = back.offsetParent;
    if (!cover) return null;
    const b = back.getBoundingClientRect();
    const c = cover.getBoundingClientRect();
    return { left: Math.round(b.left - c.left), top: Math.round(b.top - c.top) };
  });
  ok(gap !== null, "뒤로가기 버튼을 찾았다");
  ok(
    gap !== null && gap.left >= 16 && gap.top >= 16,
    "뒤로가기가 표지 모서리에서 16px 이상 떨어져 있다",
    gap ? `left ${gap.left}px · top ${gap.top}px` : ""
  );
}

/**
 * 캐릭터 이름이 한 줄인지 — 요구 5-1.
 * `w-20`(80px)이면 text-sm 한글 6.6자가 한계라 "방귀쟁이 며느리"(8자)가 두 줄로 깨졌다.
 */
{
  const lines = await page.evaluate(() => {
    const names = [...document.querySelectorAll("span")].filter((el) =>
      ["방귀쟁이 며느리", "시아버지", "마을 이장"].includes(
        (el.textContent ?? "").trim()
      )
    );
    return names.map((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return {
        text: (el.textContent ?? "").trim(),
        lines: [...range.getClientRects()].filter((r) => r.width > 0).length,
      };
    });
  });
  const broken = lines.filter((n) => n.lines > 1);
  ok(lines.length >= 3, "캐릭터 이름 3개를 찾았다", `${lines.length}개`);
  ok(
    broken.length === 0,
    "캐릭터 이름이 전부 한 줄",
    broken.map((n) => `${n.text}(${n.lines}줄)`).join(",")
  );
}

ok(await page.getByText("방귀쟁이 며느리").isVisible(), "등장 캐릭터 (distinct)");
ok(await page.getByText("시아버지", { exact: true }).isVisible(), "등장 캐릭터 2");
ok(await page.getByText("마을 이장").isVisible(), "등장 캐릭터 3");
ok(await page.getByText("약 20분").isVisible(), "예상 시간");
ok(await page.getByText("난이도 보통").isVisible(), "난이도");

/**
 * 준비 중 이야기 — 상세까지는 보여주고 **재생만 막는다.**
 * 장면 데이터가 없어 시작 버튼을 살려두면 /play에서 깨지는 막다른 길이 된다.
 */
await page.goto(`${BASE}/stories/story_horangi`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "호랑이와 하나" }).waitFor({ timeout: 8000 }).catch(() => {});
ok(await page.getByRole("heading", { name: "호랑이와 하나" }).isVisible(), "준비 중 이야기도 상세는 보인다");
ok(
  (await page.getByRole("button", { name: "이야기 시작하기" }).count()) === 0,
  "준비 중 이야기에 '이야기 시작하기'가 없다"
);
ok(
  await page.getByRole("button", { name: "준비 중이에요" }).isDisabled(),
  "준비 중 버튼이 비활성 (막다른 길 방지)"
);
ok(
  await page.getByText("아직 준비 중이에요", { exact: false }).isVisible(),
  "준비 중 이유를 안내한다"
);

// 다시 재생 가능한 편으로 돌아온다
await page.goto(`${BASE}/stories/${STORY}`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "방귀 뀌는 며느리" }).waitFor({ timeout: 8000 }).catch(() => {});

// 세션이 없으면 B-4 없이 바로 시작
await page.getByRole("button", { name: "이야기 시작하기" }).click();
await page.waitForURL("**/play/**", { timeout: 10000 }).catch(() => {});
ok(path().startsWith("/play/"), "세션 없으면 곧바로 /play", path());

// ── C-9 단어 뜻 팝업 → 단어장에 담기 ─────────────────────────────────
console.log("\n=== C-9 단어 뜻 팝업 ===");
// 밑줄 단어는 **장면 첫 대사가 아니라 턴 응답**에 실려 온다 — 서버가 생성한 대사에
// 후보 단어가 실제로 등장한 턴에만 채워진다 (백엔드 D-22). 그래서 몇 턴 진행해야 나온다.
await page.getByText("탭하면 이야기가 시작돼요").click({ timeout: 8000 }).catch(() => {});

const LONG = "며느리가 창피해서 계속 참았던 것 같아요. 가족들에게 솔직하게 말하면 좋겠어요. 그러면 마음이 편해질 거예요.";
let found = false;
for (let step = 0; step < 60 && !found; step++) {
  const body = await page.locator("body").innerText();
  if (await page.getByRole("button", { name: /창피한 뜻 보기/ }).count()) { found = true; break; }
  if (body.includes("계속하기")) await page.getByRole("button", { name: "계속하기" }).click().catch(() => {});
  else if (body.includes("말해볼래요")) await passMissionBrief(page);
  else if (body.includes("이제 말해 볼까?")) await page.evaluate((t) => window.__say(t), LONG);
  else if (body.includes("이렇게 말한 게 맞아?")) await page.getByRole("button", { name: "보내기" }).click().catch(() => {});
  else if (body.includes("다음") || body.includes("이야기 시작하기")) {
    const b = page.getByRole("button", { name: /다음|이야기 시작하기/ });
    if (await b.count()) await b.first().click().catch(() => {});
  }
  await page.waitForTimeout(320);
}
ok(found, "턴 응답 대사에 밑줄 단어 '창피한' (D-22)");

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
  // 페이지 다른 곳의 "사이드바 닫기" 버튼도 "닫기"를 부분 일치로 포함해 strict mode
  // violation이 난다. 모달(dialog) 안으로 스코프를 좁힌다.
  await page.getByRole("dialog").getByRole("button", { name: "닫기" }).click();
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
// 페이지 다른 곳의 "사이드바 닫기" 버튼도 "닫기"를 부분 일치로 포함해 strict mode
// violation이 난다. 모달(dialog) 안으로 스코프를 좁힌다.
await page.getByRole("dialog").getByRole("button", { name: "닫기" }).click();

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
// F-1 프로필에 누적 별가루가 붙는다. 서버가 값을 줄 때만 보인다. (계획 D4)
ok((await page.getByText(/별가루 \d+/).count()) >= 1, "마이페이지 별가루 칩");
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
await page.screenshot({ path: SHOT("browse-shot") });
await browser.close();
