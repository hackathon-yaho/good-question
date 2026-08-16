// 2단계 검증 — A-1 → A-2 → A-3 → A-4 → A-5 → B-1, 그리고 새로고침 유지·가드.
import { chromium } from "playwright-core";

import { SHOT, BASE, chromeExecutable } from "./_browser.mjs";

const EXE = chromeExecutable();

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["microphone"] });
const page = await ctx.newPage();

const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error" && !m.text().includes("Download the React DevTools")) {
    errs.push(`[console] ${m.text().slice(0, 160)}`);
  }
});

let fails = 0;
const ok = (cond, label, extra = "") => {
  if (!cond) fails += 1;
  console.log(`  ${cond ? "OK  " : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};
const path = () => new URL(page.url()).pathname;

console.log("=== A-1 스플래시 → 미인증이면 /login ===");
await page.goto(BASE, { waitUntil: "networkidle" });
ok(await page.getByText("굿퀘스천").first().isVisible(), "앱명 표시");
await page.waitForURL("**/login", { timeout: 6000 }).catch(() => {});
ok(path() === "/login", "미인증 → /login", path());

console.log("\n=== A-2 로그인 ===");
ok(await page.getByRole("button", { name: "카카오로 시작하기" }).count() === 1, "카카오 버튼 1개");
const googleOrNaver = await page.getByText(/구글|네이버/).count();
ok(googleOrNaver === 0, "구글·네이버 버튼 없음 (PRD M-01 카카오만)");
ok(
  await page.getByRole("heading", { name: "아이의 생각을 여는 첫 걸음" }).isVisible(),
  "헤딩 표시"
);
// 데모 반복을 위해 이전 상태를 지운다.
const reset = page.getByRole("button", { name: /데모 상태 초기화/ });
if (await reset.count()) { await reset.click(); await page.waitForTimeout(300); }

await page.getByRole("button", { name: "카카오로 시작하기" }).click();
// /login → /auth/callback → /onboarding/consent 두 단계를 거친다. 목 모드에서도
// 백엔드가 만들 콜백 URL을 그대로 태우기 때문이다. (lib/api/auth.ts)
// dev 서버는 /auth/callback을 이 시점에 처음 컴파일하므로 여유를 크게 준다.
await page.waitForURL("**/auth/callback**", { timeout: 25000 }).catch(() => {});
await page.waitForURL("**/onboarding/consent", { timeout: 10000 }).catch(() => {});
ok(path() === "/onboarding/consent", "신규 → A-3 동의", path());

console.log("\n=== A-3 동의 ===");
const cta = page.getByRole("button", { name: "동의하고 계속하기" });
ok(await cta.isDisabled(), "필수 미체크면 CTA 비활성");

// 전문 모달
await page.getByRole("button", { name: "아동 개인정보 처리 동의 전문 보기" }).click();
await page.waitForTimeout(250);
ok(await page.getByRole("dialog").count() === 1, "약관 전문 모달 열림");
await page.getByRole("button", { name: "닫기" }).click();
await page.waitForTimeout(250);

// 필수 3개만 체크 → 활성
for (const label of ["서비스 이용약관", "개인정보 처리방침", "아동 개인정보 처리 동의"]) {
  await page.getByRole("checkbox", { name: label }).check();
}
ok(await cta.isEnabled(), "필수 3개 체크 후 CTA 활성");
ok(
  !(await page.getByRole("checkbox", { name: "전체 동의합니다" }).isChecked()),
  "선택 항목 미체크면 '전체 동의'도 미체크"
);
// 전체 동의 토글
await page.getByRole("checkbox", { name: "전체 동의합니다" }).check();
ok(
  await page.getByRole("checkbox", { name: "마케팅 정보 수신" }).isChecked(),
  "전체 동의 → 4개 모두 체크"
);
await page.getByRole("checkbox", { name: "마케팅 정보 수신" }).uncheck();
ok(
  !(await page.getByRole("checkbox", { name: "전체 동의합니다" }).isChecked()),
  "하나 해제 → '전체 동의' 해제"
);

await cta.click();
await page.waitForURL("**/onboarding/child", { timeout: 8000 }).catch(() => {});
ok(path() === "/onboarding/child", "→ A-4 아이 등록", path());

console.log("\n=== A-4 아이 등록 ===");
const done = page.getByRole("button", { name: "등록 완료" });
ok(await done.isDisabled(), "미입력이면 '등록 완료' 비활성");
ok(
  await page.getByText("실명이 아니어도 괜찮아요.", { exact: false }).isVisible(),
  "헬퍼 텍스트 있음"
);
ok(await page.getByRole("button", { name: /캐릭터 / }).count() === 6, "캐릭터 6종");
ok(await page.getByRole("button", { name: "취소" }).count() === 0, "첫 등록엔 취소 없음");

// 라벨은 동물 이름이고 저장 값은 color1~6을 유지한다. (계획 D1)
await page.getByRole("button", { name: "캐릭터 곰" }).click();
await page.getByLabel("아이 이름").fill("민준");
await page.getByLabel("출생 연도").selectOption({ index: 3 });
ok(await done.isEnabled(), "입력 완료 후 활성");
await done.click();
await page.waitForURL("**/profiles", { timeout: 8000 }).catch(() => {});
ok(path() === "/profiles", "→ A-5 프로필 선택", path());

console.log("\n=== A-5 프로필 선택 ===");
// listChildren이 도착할 때까지 "불러오고 있어요…"가 보인다. 목록을 기다린다.
await page.getByRole("heading", { name: "누가 이야기할까요?" }).waitFor({ timeout: 8000 });
ok(await page.getByRole("heading", { name: "누가 이야기할까요?" }).isVisible(), "제목 표시");
ok(await page.getByText("민준", { exact: true }).count() >= 1, "등록한 아이 카드");
ok(await page.getByText("아직 시작 전").isVisible(), "활동 없음 → '아직 시작 전'");
ok(await page.getByRole("button", { name: "아이 추가" }).count() === 1, "3명 미만이면 추가 카드");
ok(await page.getByRole("button", { name: /보호자 모드/ }).count() === 1, "보호자 모드 버튼");

await page.getByText("민준", { exact: true }).first().click();
await page.waitForURL("**/home", { timeout: 8000 }).catch(() => {});
ok(path() === "/home", "→ B-1 홈", path());

console.log("\n=== B-1 홈 ===");
await page.waitForTimeout(600);
ok(await page.getByRole("navigation").count() === 1, "좌측 사이드바 (하단 탭바 아님)");
const navLabels = await page.getByRole("navigation").getByRole("link").allInnerTexts();
ok(navLabels.length === 6, "사이드바 로고 + 메뉴 5개 (상점 포함)", navLabels.join("/"));
// 프로필은 우상단이 아니라 상단 1줄 전체다. 이름이 h1이다.
ok(
  await page.getByRole("heading", { level: 1, name: "민준" }).isVisible(),
  "프로필 바에 아이 이름 (상단 1줄)"
);
// 별가루는 서버가 값을 줄 때만 보인다. 목은 완료 0편이라 0으로 온다.
// 값이 없을 때 숨는지는 wiring 스위트(실서버 응답에 필드가 없다)가 확인한다.
ok(
  (await page.getByText(/별가루 \d+/).count()) >= 1,
  "별가루 칩 표시 (값이 있을 때)"
);
ok(await page.getByText("이어서 하기").count() === 0, "이어하기 카드는 없음");
ok(
  await page.getByRole("heading", { name: /오늘의 추천 이야기/ }).isVisible(),
  "이어하기 없으면 추천만 (필터 없음)"
);
/**
 * 이어하기가 없을 때는 **카드 3열**이다. 목록 형식은 이어하기가 있을 때
 * 우측 42%에서만 쓴다 — 좁은 폭의 대안이고 카드를 대체하는 게 아니다.
 */
{
  const cards = await page.locator('a[href^="/stories/"]').count();
  ok(cards === 3, "추천 3개 (이어하기 없을 때)", `${cards}개`);
  // ⚠️ <a>가 아니라 부모 <li>를 잰다. 카드에 `hover:-translate-y-0.5`가 걸려 있어
  //    포인터가 얹힌 카드만 2px 올라가고, 그게 "행이 다르다"로 오판된다.
  const tops = await page.evaluate(() =>
    [...document.querySelectorAll('a[href^="/stories/"]')].map((a) =>
      Math.round((a.parentElement ?? a).getBoundingClientRect().top)
    )
  );
  ok(new Set(tops).size === 1, "추천이 한 행에 3개 (카드 3열)", `y=${[...new Set(tops)].join(",")}`);
  // 카드 형식인지 — 표지 자리가 세로로 카드 안에 있다(가로형 목록 행이 아니다)
  const shape = await page.evaluate(() => {
    const a = document.querySelector('a[href^="/stories/"]');
    const r = a?.getBoundingClientRect();
    return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null;
  });
  ok(shape !== null && shape.h > shape.w, "카드 형식 (세로형)", `${shape?.w}×${shape?.h}`);
}
ok(
  await page.getByRole("button", { name: "이야기 시작하기" }).count() === 0,
  "홈에서 바로 시작하지 않는다 — 카드 → B-3을 거친다"
);
ok(
  await page.getByRole("link", { name: /더 많은 이야기 탐험하기/ }).count() === 1,
  "이야기 목록으로 가는 길"
);

console.log("\n=== 새로고침 후 선택 유지 (A-5 체크리스트) ===");
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(700);
ok(path() === "/home", "새로고침해도 /home 유지", path());
ok(await page.getByText("민준", { exact: false }).count() >= 1, "선택한 아이 유지");

console.log("\n=== 라우트 가드 ===");
await page.evaluate(() => window.localStorage.removeItem("gq.selectedChildId"));
await page.goto(`${BASE}/home`, { waitUntil: "networkidle" });
await page.waitForURL("**/profiles", { timeout: 6000 }).catch(() => {});
ok(path() === "/profiles", "아이 미선택 → /profiles", path());

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForURL("**/profiles", { timeout: 6000 }).catch(() => {});
ok(path() === "/profiles", "A-1: 토큰 있으면 → /profiles", path());

console.log("\n=== 이야기 시작 → 이어하기 카드 등장 ===");
await page.getByText("민준", { exact: true }).first().click();
await page.waitForURL("**/home", { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(600);
// 홈에는 시작 CTA가 없다. 추천 카드 → B-3 → 시작하기 경로를 탄다.
await page.getByRole("link", { name: /방귀 뀌는 며느리/ }).first().click();
await page.waitForURL("**/stories/**", { timeout: 8000 }).catch(() => {});
ok(path().startsWith("/stories/"), "추천 카드 → B-3", path());
await page.getByRole("button", { name: "이야기 시작하기" }).click({ timeout: 8000 });
await page.waitForURL("**/play/**", { timeout: 10000 }).catch(() => {});
ok(path().startsWith("/play/"), "→ /play/{sessionId}", path());

await page.goto(`${BASE}/home`, { waitUntil: "networkidle" });
await page.waitForTimeout(700);
ok(await page.getByText("이어서 하기").isVisible(), "이어하기 히어로 카드 등장");
ok(
  await page.getByText(/장면 \d까지 이야기했어요/).isVisible(),
  "진행 문구 표시"
);
ok(await page.getByRole("progressbar").count() === 1, "진행바 1개");
ok(
  await page.getByRole("heading", { name: /오늘의 추천 이야기/ }).isVisible(),
  "이어하기와 추천이 함께 보인다 (2단 배치)"
);
/**
 * 이어하기가 있을 때는 **목록 행**이고 추천이 3개다. 그리고 두 섹션이
 * **같은 행**에 있어야 한다 — 분기가 `xl:`(1280px)이면 태블릿에서 세로로 쌓인다.
 */
{
  const rows = await page.locator('a[href^="/stories/"]').count();
  ok(rows === 3, "추천 3개 (이어하기 있을 때)", `${rows}개`);
  const shape = await page.evaluate(() => {
    const a = document.querySelector('a[href^="/stories/"]');
    const r = a?.getBoundingClientRect();
    return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null;
  });
  ok(shape !== null && shape.w > shape.h, "목록 형식 (가로형 행)", `${shape?.w}×${shape?.h}`);
}
// 1133px(지원 태블릿 최소 폭)에서도 2열인지 — 요구의 핵심이다
await page.setViewportSize({ width: 1133, height: 744 });
await page.waitForTimeout(400);
{
  const cols = await page.evaluate(() => {
    const hero = [...document.querySelectorAll("h2")].find((h) =>
      (h.textContent ?? "").includes("오늘의 추천")
    );
    const resume = [...document.querySelectorAll("span")].find(
      (s) => (s.textContent ?? "").trim() === "이어서 하기"
    );
    if (!hero || !resume) return null;
    const a = hero.getBoundingClientRect();
    const b = resume.getBoundingClientRect();
    // 같은 행이면 세로로 겹친다. 쌓였으면 겹치지 않는다.
    return {
      overlapY: Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0,
      heroLeft: Math.round(a.left),
      resumeLeft: Math.round(b.left),
    };
  });
  ok(cols !== null && cols.overlapY, "1133px에서도 이어하기·추천이 같은 행", JSON.stringify(cols));
  ok(cols !== null && cols.heroLeft > cols.resumeLeft, "추천이 이어하기 오른쪽");
}
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(300);

// 개발 전환 — 이어하기가 있는 상태에서 ?home=fresh로 빈 상태를 볼 수 있다
await page.goto(`${BASE}/home?home=fresh`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
ok(
  (await page.getByText("이어서 하기").count()) === 0,
  "?home=fresh — 이어하기가 숨는다 (세션은 살아 있다)"
);
// 빈 상태 레이아웃을 그대로 보기 위해 안내 칩을 띄우지 않는다 (2026-08-13 지시).
// 칩이 끼면 확인하려는 배치가 밀린다.
ok(
  (await page.getByText("개발 전환", { exact: false }).count()) === 0,
  "?home=fresh에 안내 칩을 띄우지 않는다"
);
// 빈 상태에서도 추천이 3개인지 — 칩이 없어졌어도 배치는 그대로여야 한다
{
  const cards = await page.locator('a[href^="/stories/"]').count();
  ok(cards === 3, "?home=fresh에서도 추천 3개", `${cards}개`);
}
await page.goto(`${BASE}/home`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
ok(
  await page.getByText("이어서 하기").isVisible(),
  "파라미터를 떼면 원래대로 (데이터를 조작하지 않았다)"
);
await page.getByRole("button", { name: "이어서 이야기하기" }).click();
await page.waitForURL("**/play/**", { timeout: 8000 }).catch(() => {});
ok(path().startsWith("/play/"), "이어하기 → /play", path());

console.log("\n=== A-4 정원 초과 (3명) ===");
await page.goto(`${BASE}/profiles`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
for (const [name, avatar] of [["서연", "병아리"], ["하준", "거북이"]]) {
  await page.getByRole("button", { name: "아이 추가" }).click();
  // child_consents는 아이 한 명당 한 건이므로 둘째·셋째도 동의를 먼저 받는다.
  await page.waitForURL("**/onboarding/consent", { timeout: 6000 });
  await page.getByRole("checkbox", { name: "전체 동의합니다" }).check();
  await page.getByRole("button", { name: "동의하고 계속하기" }).click();
  await page.waitForURL("**/onboarding/child", { timeout: 6000 });
  await page.getByRole("button", { name: `캐릭터 ${avatar}` }).click();
  await page.getByLabel("아이 이름").fill(name);
  await page.getByLabel("출생 연도").selectOption({ index: 2 });
  await page.getByRole("button", { name: "등록 완료" }).click();
  await page.waitForURL("**/profiles", { timeout: 8000 });
  await page.getByRole("heading", { name: "누가 이야기할까요?" }).waitFor({ timeout: 8000 });
}
ok(await page.getByRole("button", { name: "아이 추가" }).count() === 0, "3명이면 추가 카드 숨김");
ok(
  (await page.getByText(/^(민준|서연|하준)$/).count()) === 3,
  "아이 카드 3장"
);

await page.goto(`${BASE}/onboarding/child`, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
ok(path() === "/profiles", "정원 초과면 A-4 진입 차단 → /profiles", path());
ok(
  await page.getByText("아이는 최대 3명까지 등록할 수 있어요.").count() >= 1,
  "정원 초과 토스트"
);

// 로그인 콜백 — 백엔드가 302로 보내는 주소다. 여기가 막히면 로그인이 막힌다.
// (docs/request/frontend/kakao-login-flow.md)
console.log("\n=== 로그인 콜백 ===");
await page.goto(`${BASE}/auth/callback?hasCompletedOnboarding=true`, { waitUntil: "networkidle" });
await page.waitForURL("**/profiles", { timeout: 10000 }).catch(() => {});
ok(path() === "/profiles", "onboarding=true → /profiles", path());

await page.goto(`${BASE}/auth/callback?error=login_failed`, { waitUntil: "networkidle" });
ok(
  await page.getByRole("heading", { name: "로그인하지 못했어요" }).isVisible(),
  "error 쿼리 → 실패 안내 (무한 로딩 아님)"
);
ok(path() === "/auth/callback", "실패 시 자동 이동하지 않음", path());
await page.getByRole("button", { name: "로그인 화면으로" }).click();
await page.waitForURL("**/login", { timeout: 8000 }).catch(() => {});
ok(path() === "/login", "실패 화면에 돌아갈 길 있음", path());

// 로그인 안 된 채 콜백 주소로 직접 들어온 경우. /auth/me가 401을 준다.
await page.evaluate(() => localStorage.removeItem("gq.accessToken"));
await page.goto(`${BASE}/auth/callback`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "로그인하지 못했어요" }).waitFor({ timeout: 8000 }).catch(() => {});
ok(
  await page.getByRole("heading", { name: "로그인하지 못했어요" }).isVisible(),
  "쿼리 없이 직접 진입 + 미인증 → 실패 안내"
);

console.log("\n=== 없는 경로 · 없는 이야기 ===");
await page.goto(`${BASE}/no-such-page`, { waitUntil: "networkidle" });
ok(
  await page.getByText("아직 준비 중인 화면이에요").isVisible(),
  "없는 경로는 안내 화면 (기본 404 아님)"
);

// 라우트는 있지만 ID가 없는 경우. 무한 로딩으로 두면 막다른 길이 된다.
await page.goto(`${BASE}/stories/nope`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "이야기를 찾을 수 없어요" }).waitFor({ timeout: 8000 }).catch(() => {});
ok(
  await page.getByRole("heading", { name: "이야기를 찾을 수 없어요" }).isVisible(),
  "없는 이야기 ID → 안내 + 돌아갈 길"
);

if (errs.length) {
  console.log("\n=== 에러 ===");
  [...new Set(errs)].slice(0, 8).forEach((e) => console.log("  " + e));
}
console.log(`\n${fails === 0 ? "전부 통과" : `실패 ${fails}건`}`);
await page.screenshot({ path: SHOT("account-shot") });
await browser.close();
