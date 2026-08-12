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

await page.getByRole("button", { name: "캐릭터 color3" }).click();
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
ok(navLabels.length === 5, "사이드바 로고 + 메뉴 4개", navLabels.join("/"));
ok(await page.getByText("별가루").count() === 0, "별가루 칩 없음 (Q-12 MVP 제외)");
ok(await page.getByText("오늘의 이야기").isVisible(), "진행 중 세션 없음 → 오늘의 이야기 카드");
ok(await page.getByText("이어서 하기").count() === 0, "이어하기 카드는 없음");
ok(await page.getByText("이런 이야기도 있어요").isVisible(), "추천 영역");

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
await page.getByRole("button", { name: "이야기 시작하기" }).click();
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
ok(await page.getByText("오늘의 이야기").count() === 0, "이어하기가 있으면 오늘의 이야기 자리 대체");
await page.getByRole("button", { name: "이어서 이야기하기" }).click();
await page.waitForURL("**/play/**", { timeout: 8000 }).catch(() => {});
ok(path().startsWith("/play/"), "이어하기 → /play", path());

console.log("\n=== A-4 정원 초과 (3명) ===");
await page.goto(`${BASE}/profiles`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
for (const [name, avatar] of [["서연", "color1"], ["하준", "color5"]]) {
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
