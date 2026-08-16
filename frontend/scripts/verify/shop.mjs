// 아바타 상점 검증 — 등록 → 별가루 적립 시드 → 상점(구매 전용) → 프로필(장착).
import { chromium } from "playwright-core";

import { SHOT, BASE, chromeExecutable } from "./_browser.mjs";

const EXE = chromeExecutable();

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
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
/** 라벨을 담은 카드(li) 안에서만 버튼을 찾는다 — "장착하기"가 여러 카드에 반복된다. */
const cardFor = (label) => page.locator("li", { hasText: label });
/**
 * 잔액 칩만 정확히 짚는다. 가격이 잔액과 같아지면(예: 200 == 200) "별가루 N 구매"
 * 버튼과 텍스트가 겹쳐 `getByText`가 strict mode 위반으로 던진다.
 */
const balanceChip = () => page.locator("span.bg-accent-soft");

console.log("=== 아이 등록 ===");
await page.goto(BASE, { waitUntil: "networkidle" });
const reset = page.getByRole("button", { name: /데모 상태 초기화/ });
if (await reset.count()) {
  await reset.click();
  await page.waitForTimeout(300);
}
await page.waitForURL("**/login", { timeout: 6000 }).catch(() => {});
await page.getByRole("button", { name: "카카오로 시작하기" }).click();
await page.waitForURL("**/auth/callback**", { timeout: 25000 }).catch(() => {});
await page.waitForURL("**/onboarding/consent", { timeout: 10000 }).catch(() => {});
await page.getByRole("checkbox", { name: "전체 동의합니다" }).check();
await page.getByRole("button", { name: "동의하고 계속하기" }).click();
await page.waitForURL("**/onboarding/child", { timeout: 8000 }).catch(() => {});
await page.getByRole("button", { name: "캐릭터 여우" }).click();
await page.getByLabel("아이 이름").fill("별이");
await page.getByLabel("출생 연도").selectOption({ index: 3 });
await page.getByRole("button", { name: "등록 완료" }).click();
await page.waitForURL("**/profiles", { timeout: 8000 }).catch(() => {});
await page.getByText("별이", { exact: true }).first().click();
await page.waitForURL("**/home", { timeout: 8000 }).catch(() => {});
ok(path() === "/home", "등록 후 → /home", path());

console.log("\n=== 완료 이야기 2편 시드 (별가루 200) ===");
const childId = await page.evaluate(() => localStorage.getItem("gq.selectedChildId"));
ok(typeof childId === "string" && childId.length > 0, "선택된 아이 id 확보", childId ?? "");
await page.evaluate((id) => {
  const now = Date.now();
  const session = (n) => ({
    sessionId: `s_seed_${n}`,
    childId: id,
    lastActivityAt: now - n * 1000,
    currentSceneId: "sc_banggui_09",
    messages: [],
    status: "completed",
    retellingText: null,
    completedAt: new Date(now - n * 1000).toISOString(),
    detectedElements: [],
  });
  window.localStorage.setItem(
    "gq.mock.sessions",
    JSON.stringify({ seq: 2, sessions: [session(1), session(2)] })
  );
}, childId);
await page.goto(`${BASE}/mypage`, { waitUntil: "networkidle" });
await page.waitForTimeout(400);
ok((await balanceChip().innerText()).includes("별가루 200"), "시드 후 별가루 200");

console.log("\n=== 상점 진입 (사이드바 메뉴) ===");
await page.getByRole("navigation").getByRole("link", { name: "상점" }).click();
await page.waitForURL("**/shop", { timeout: 6000 }).catch(() => {});
ok(path() === "/shop", "사이드바 '상점' → /shop", path());
await page
  .getByRole("heading", { name: "상점" })
  .waitFor({ timeout: 8000 })
  .catch(() => {});
ok(await page.getByRole("heading", { name: "상점" }).isVisible(), "제목 표시");
ok((await balanceChip().innerText()).includes("별가루 200"), "상점 상단에도 잔액 표시");

console.log("\n=== 태그 칩 — 배경·이야기는 준비 중 ===");
ok(
  (await page.getByRole("tab", { name: "아바타", selected: true }).count()) === 1,
  "기본 탭은 '아바타'"
);
await page.getByRole("tab", { name: "배경" }).click();
await page.waitForTimeout(200);
ok((await page.locator("ul li").count()) === 0, "배경 탭 — 아바타 그리드 숨김");
ok(await page.getByText("배경 상점은 곧 열려요!").isVisible(), "배경 준비 중 문구");
await page.getByRole("tab", { name: "이야기" }).click();
await page.waitForTimeout(200);
ok(await page.getByText("이야기 상점은 곧 열려요!").isVisible(), "이야기 준비 중 문구");
await page.getByRole("tab", { name: "아바타" }).click();
await page.waitForTimeout(200);
ok((await page.locator("ul li").count()) === 4, "아바타 탭으로 되돌리면 그리드 복귀 (상점 4종)");

console.log("\n=== 상점 4종만 진열 — 무료 6종은 안 보임, 잠금/보유 표시 ===");
const cardCount = await page.locator("ul li").count();
ok(cardCount === 4, "카드 4장 — 무료 6종은 살 게 없어 진열하지 않는다", `${cardCount}장`);
ok((await page.getByText("여우", { exact: true }).count()) === 0, "무료 아바타(여우)는 상점에 없음");
ok(
  (await cardFor("판다").getByRole("button", { name: "150" }).count()) === 1,
  "판다(150) — 별가루 아이콘+가격만, '구매' 글자 없음"
);
ok(
  (await cardFor("판다").getByText("구매", { exact: false }).count()) === 0,
  "'구매'라는 글자 자체가 없다"
);
ok(
  (await cardFor("사자").getByRole("button", { name: "200" }).count()) === 1,
  "사자(200) — 딱 맞아서 구매 가능"
);
const owlBtn = cardFor("부엉이").getByRole("button", { name: "250" });
ok((await owlBtn.count()) === 1, "부엉이(250) — 가격은 보이되");
ok(await owlBtn.isDisabled(), "잔액 부족이면 버튼 비활성");

console.log("\n=== 구매 확인 알림창 — 취소하면 안 산다 ===");
await cardFor("사자").getByRole("button", { name: "200" }).click();
await page.getByRole("heading", { name: "사자를 데려올까요?" }).waitFor({ timeout: 6000 }).catch(() => {});
ok(await page.getByRole("dialog").count() === 1, "구매 확인 알림창이 뜬다");
ok(await page.getByText("별가루 200개를 쓸 거예요").isVisible(), "쓸 별가루 양을 미리 보여준다");
await page.getByRole("button", { name: "다음에 할래요" }).click();
await page.waitForTimeout(300);
ok((await page.getByRole("dialog").count()) === 0, "취소하면 알림창만 닫힌다");
ok(
  (await cardFor("사자").getByRole("button", { name: "200" }).count()) === 1,
  "취소했으니 사자는 그대로 구매 대기 상태"
);
ok((await balanceChip().innerText()).includes("별가루 200"), "취소했으니 별가루도 그대로");

console.log("\n=== 구매 확인 → 확정하면 산다 (장착은 안 바뀐다) ===");
await cardFor("판다").getByRole("button", { name: "150" }).click();
await page.getByRole("heading", { name: "판다를 데려올까요?" }).waitFor({ timeout: 6000 }).catch(() => {});
await page.getByRole("button", { name: "네, 데려올래요! 🎉" }).click();
await page.waitForTimeout(500);
ok(
  await page.getByText("판다 아바타의 잠금을 해제했어요!").isVisible(),
  "구매 성공 토스트 (장착이 아니라 '잠금 해제')"
);
ok((await page.getByRole("dialog").count()) === 0, "구매 후 알림창이 닫힌다");
ok(
  (await cardFor("판다").getByRole("button").count()) === 0,
  "구매 즉시 보유 중으로 바뀌고 버튼이 사라진다"
);
ok((await balanceChip().innerText()).includes("별가루 50"), "200 - 150 = 50으로 차감");

await page.goto(`${BASE}/mypage`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "별이" }).waitFor({ timeout: 8000 }).catch(() => {});
const profileAvatarButton = () => page.getByRole("button", { name: "아바타 바꾸기" });
ok(
  (await profileAvatarButton().locator('img[src="/avatars/fox.webp"]').count()) === 1,
  "상점에서 산 것만으로는 프로필 아바타가 안 바뀐다 (여전히 여우)"
);

console.log("\n=== 프로필에서 장착 — 아바타 변경 모달 ===");
await profileAvatarButton().click();
await page.getByRole("heading", { name: "아바타 바꾸기" }).waitFor({ timeout: 6000 }).catch(() => {});
ok(await page.getByRole("dialog").count() === 1, "아바타 변경 모달 열림");
const modalItemCount = await page.getByRole("dialog").locator("ul li").count();
ok(modalItemCount === 7, "모달에는 보유한 것만 (무료 6 + 방금 산 판다)", `${modalItemCount}개`);
ok(
  (await page.getByRole("dialog").getByRole("button", { name: "아바타 사자" }).count()) === 0,
  "아직 안 산 사자·부엉이·알파카는 모달에 없음"
);
await page.getByRole("dialog").getByRole("button", { name: "아바타 판다" }).click();
await page.waitForTimeout(600);
ok((await page.getByRole("dialog").count()) === 0, "선택하면 모달이 닫힌다");
// 판다는 아직 일러스트가 없어 이미지가 404로 실패하고 이니셜 폴백(색상 원)으로
// 바뀐다 — 그 폴백 색상(판다 = PALETTE_CYCLE[0] = bg-primary)으로 전환을 확인한다.
ok(
  (await profileAvatarButton().locator("span[style].bg-primary").count()) === 1,
  "프로필 아바타가 판다로 바뀜 (아직 일러스트가 없어 이니셜 폴백으로 표시)"
);

// 상점 아바타는 아직 일러스트가 없어 이미지 404가 나는 게 정상이다 (ChildAvatar
// 실패 폴백 · lib/shop-catalog.ts). 그 외 에러만 실패 판단에 참고용으로 보여준다.
const realErrs = [...new Set(errs)].filter((e) => !/\/avatars\/shop\d+\.webp/.test(e));
if (realErrs.length) {
  console.log("\n=== 에러 ===");
  realErrs.slice(0, 8).forEach((e) => console.log("  " + e));
}
console.log(`\n${fails === 0 ? "전부 통과" : `실패 ${fails}건`}`);
await page.screenshot({ path: SHOT("shop-shot") });
await browser.close();
process.exit(fails > 0 ? 1 : 0);
