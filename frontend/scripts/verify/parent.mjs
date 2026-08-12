// 9단계 검증 — A-6 보호자 홈 · G-1~G-4 리포트 · H-1~H-7 설정
import { chromium } from "playwright-core";

import { SHOT, BASE, chromeExecutable } from "./_browser.mjs";

const EXE = chromeExecutable();

const browser = await chromium.launch({ executablePath: EXE, headless: true });

let fails = 0;
const ok = (cond, label, extra = "") => {
  if (!cond) fails += 1;
  console.log(`  ${cond ? "OK  " : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};

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
      seq: 2,
      children: [
        { id: "c_mock_1", name: "민준", birthYear: 2018, avatarId: "color3",
          consents: { termsOfService: true, privacyPolicy: true, childDataProcessing: true, marketing: false },
          registeredAt: "2026-08-01T10:00:00.000Z" },
        { id: "c_mock_2", name: "서연", birthYear: 2019, avatarId: "color1",
          consents: { termsOfService: true, privacyPolicy: true, childDataProcessing: true, marketing: false },
          registeredAt: "2026-08-02T10:00:00.000Z" },
      ],
    })
  );
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

const path = () => new URL(page.url()).pathname;
const bodyText = () => page.locator("body").innerText();
/** 리포트에 절대 나와서는 안 되는 표현 (가이드 8절) */
const FORBIDDEN = /\d+점|100점|등급|A등급|백분위|또래|부족합니다|미달|낮습니다/;

// ── 기록이 없는 상태의 A-6 ────────────────────────────────────────────
console.log("=== A-6 보호자 홈 (기록 없음) ===");
await page.goto(`${BASE}/parent`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: /보호자님/ }).waitFor({ timeout: 8000 }).catch(() => {});
ok(await page.getByRole("heading", { name: "민준 보호자님" }).isVisible(), "선택된 아이 기준");
ok(
  await page.getByText("아직 기록이 없어요.", { exact: false }).isVisible(),
  "기록 없으면 0 대신 안내 문구 (A-6 체크리스트)"
);
const tiles = await page.getByRole("link").allInnerTexts();
for (const label of ["리포트 보기", "아이 프로필 관리", "이용 안내", "설정"]) {
  ok(tiles.some((t) => t.includes(label)), `타일 "${label}"`);
}

// ── 대화를 진행해 리포트 재료를 만든다 ────────────────────────────────
console.log("\n=== 리포트 재료 만들기 (이야기 1편 진행) ===");
await page.goto(`${BASE}/stories/s_banggui_daughter_in_law_001`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "이야기 시작하기" }).click({ timeout: 8000 });
await page.waitForURL("**/play/**", { timeout: 10000 }).catch(() => {});
await page.getByText("탭하면 이야기가 시작돼요").click({ timeout: 8000 }).catch(() => {});

const LONG = "며느리가 창피해서 계속 참았던 것 같아요. 가족들에게 솔직하게 말하면 좋겠어요. 그러면 마음이 편해질 거예요.";
let utterances = 0;
// 대화 장면 4개를 끝까지 간다. handoff 스위트와 같은 예산이 필요하다.
for (let step = 0; step < 120; step++) {
  if (path().startsWith("/activity/")) break;
  const body = await bodyText();
  if (body.includes("계속하기")) await page.getByRole("button", { name: "계속하기" }).click().catch(() => {});
  else if (body.includes("이제 말해 볼까?")) { await page.evaluate((t) => window.__say(t), LONG); utterances += 1; }
  else if (body.includes("이렇게 말한 게 맞아?")) await page.getByRole("button", { name: "보내기" }).click().catch(() => {});
  else if (body.includes("다음") || body.includes("이야기 시작하기")) {
    const b = page.getByRole("button", { name: /다음|이야기 시작하기/ });
    if (await b.count()) await b.first().click().catch(() => {});
  }
  await page.waitForTimeout(320);
}
ok(utterances > 0, "아이 발화 기록 생성", `${utterances}회`);
ok(path().startsWith("/activity/"), "대화 4장면 완주 → /activity", path());

/**
 * 후속 활동까지 끝내 세션을 `completed`로 만든다.
 *
 * 여기서 멈추면 세션이 `in_progress`로 남는데, **리포트 상세는 완료된 세션에만
 * 존재한다** (backend/docs/api-spec.md 10.3 — 미완료 세션 id로 부르면 404).
 * 미완료 세션으로 상세를 검증하면 목에서만 통하는 검사가 된다.
 */
const CARD_ORDER = [
  "며느리는 방귀를 꾹 참고 또 참았어요.",
  "며느리의 큰 방귀에 시아버지의 갓이 날아갔어요.",
  "며느리의 방귀로 높은 배나무의 배가 우수수 떨어졌어요.",
  "시아버지가 며느리에게 미안하다고 말했어요.",
];
await page.getByRole("button", { name: "시작하기" }).click({ timeout: 8000 });
await page.getByText("이야기 순서대로 놓아볼까?").waitFor({ timeout: 8000 });
for (const text of CARD_ORDER) {
  await page.locator("button.touch-none", { hasText: text }).first().click();
  await page.waitForTimeout(100);
}
await page.getByRole("button", { name: "확인하기" }).click();
await page.getByRole("button", { name: "이야기 말하기" }).waitFor({ timeout: 8000 });
await page.getByRole("button", { name: "이야기 말하기" }).click();
await page.getByText("이야기를 처음부터 들려줘").waitFor({ timeout: 8000 });
// D-5는 마이크가 자동 시작되지 않는다.
await page.locator("button[aria-label]").first().click();
await page.waitForTimeout(300);
await page.evaluate(() =>
  window.__say(
    "옛날에 며느리가 방귀를 참았어요. 배나무에서 배가 떨어지고 시아버지가 미안하다고 했어요."
  )
);
await page.getByRole("button", { name: "이야기 완성하기" }).waitFor({ timeout: 8000 });
await page.getByRole("button", { name: "이야기 완성하기" }).click();
await page.getByText("이야기를 끝까지 해냈어!").waitFor({ timeout: 8000 });
ok(true, "세션 완료 → 리포트 생성 가능 상태");

/**
 * 진행 중인 세션 하나를 더 만들어 둔다. 목록의 필터는 "완료 여부"가 아니라
 * **"아이 발화가 1건이라도 있는지"** 이므로 한 번은 말해야 목록에 뜬다.
 * (backend/docs/api-spec.md 10.2)
 */
await page.goto(`${BASE}/stories/s_banggui_daughter_in_law_001`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "이야기 시작하기" }).click({ timeout: 8000 }).catch(() => {});
await page.waitForURL("**/play/**", { timeout: 10000 }).catch(() => {});
await page.getByText("탭하면 이야기가 시작돼요").click({ timeout: 8000 }).catch(() => {});
let submitted = false;
for (let step = 0; step < 40; step++) {
  const body = await bodyText();
  // 제출한 뒤 **응답이 올 때까지 기다린다.** 여기서 바로 페이지를 옮기면 목의
  // 지연(900ms) 중에 JS 컨텍스트가 사라져 발화가 저장되지 않는다.
  if (submitted) {
    if (!body.includes("생각 중이야") && !body.includes("조금만 더 기다려줘")) break;
  } else if (body.includes("이렇게 말한 게 맞아?")) {
    await page.getByRole("button", { name: "보내기" }).click().catch(() => {});
    submitted = true;
  } else if (body.includes("이제 말해 볼까?")) {
    await page.evaluate((t) => window.__say(t), LONG);
  } else if (body.includes("다음") || body.includes("이야기 시작하기")) {
    const b = page.getByRole("button", { name: /다음|이야기 시작하기/ });
    if (await b.count()) await b.first().click().catch(() => {});
  }
  await page.waitForTimeout(300);
}
ok(submitted, "진행 중 세션에 발화 1건 남김");

// ── G-1 리포트 목록 ───────────────────────────────────────────────────
console.log("\n=== G-1 리포트 목록 ===");
await page.goto(`${BASE}/parent/reports`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "리포트" }).waitFor({ timeout: 8000 }).catch(() => {});
ok(await page.getByRole("heading", { name: "리포트" }).isVisible(), "제목");
ok(await page.getByText("최근 4주").isVisible(), "최근 4주 요약");
ok((await page.getByRole("tab").count()) === 2, "아이 전환 칩 2개", `${await page.getByRole("tab").count()}개`);
ok(
  (await page.getByRole("listitem").count()) >= 4,
  "주별 막대 4개 + 리포트 카드"
);
const listBody = await bodyText();
ok(!FORBIDDEN.test(listBody), "점수·등급·백분위 표현 없음");

/**
 * 목록에는 완료되지 않은 세션도 함께 온다 — 필터 기준이 "완료 여부"가 아니라
 * "아이 발화가 있는지"다. 그런데 상세는 완료된 세션에만 있어서 미완료 행을 열면
 * 404다. 그래서 **완료된 행만 링크여야 한다.**
 * (backend/docs/api-spec.md 10.2)
 */
const reportLink = page.getByRole("link", { name: /방귀 뀌는 며느리/ });
const reportRows = await page.getByText("방귀 뀌는 며느리").count();
ok((await reportLink.count()) >= 1, "완료된 리포트는 링크");
ok(reportRows > (await reportLink.count()), "미완료 세션 행은 링크가 아님", `행 ${reportRows} / 링크 ${await reportLink.count()}`);
ok(
  (await page.getByText("이야기를 마치면 리포트가 만들어져요").count()) >= 1,
  "미완료 행에 이유를 적어 둠"
);
await reportLink.first().click();
await page.waitForURL("**/parent/reports/**", { timeout: 8000 }).catch(() => {});

// ── G-2 말하기 역량 분석 ──────────────────────────────────────────────
console.log("\n=== G-2 말하기 역량 분석 ===");
await page.getByText("어휘", { exact: true }).waitFor({ timeout: 8000 }).catch(() => {});
ok(new URL(page.url()).searchParams.get("tab") === "analysis", "기본 탭 = analysis");
ok(await page.getByText("어휘", { exact: true }).isVisible(), "어휘 영역");
for (const name of ["관점과 공감", "감정 표현", "상호작용", "생각과 이유", "결과와 해결"]) {
  ok(await page.getByRole("heading", { name }).isVisible(), `역량 카드 "${name}"`);
}
ok((await page.getByText("잘한 점").count()) === 5, "카드마다 '잘한 점'");
ok(
  (await page.getByText("이렇게 더 해볼 수 있어요").count()) === 5,
  "카드마다 보완 안내"
);
const analysisBody = await bodyText();
ok(!FORBIDDEN.test(analysisBody), "점수·등급·단정 표현 없음");
ok(
  !/DECISION|REASON|PERSPECTIVE|EMOTION|SOLUTION|RESULT|EMPATHY|REQUEST/.test(analysisBody),
  "내부 태그명 노출 없음 (가이드 4절)"
);
for (const label of ["마음", "이유", "생각", "방법"]) {
  ok(analysisBody.includes(label), `사고 요소 집계 "${label}"`);
}
ok(
  analysisBody.includes("많고 적음이 잘함과 못함을 뜻하지 않아요"),
  "집계 해석 주의 문구"
);

// ── G-3 대표 발화 ─────────────────────────────────────────────────────
console.log("\n=== G-3 대표 발화 ===");
await page.getByRole("tab", { name: "대표 발화" }).click();
await page.waitForTimeout(500);
ok(
  new URL(page.url()).searchParams.get("tab") === "quotes",
  "탭 쿼리 = quotes",
  new URL(page.url()).search
);
ok(await page.getByText("이 발화를 고른 이유").isVisible(), "선정 이유 (가이드 5절)");
const quoteBody = await bodyText();
ok(
  (quoteBody.match(/이 발화를 고른 이유/g) ?? []).length === 1,
  "대표 발화는 1개 (Q-08 — 가이드 기준)"
);
ok(quoteBody.includes("며느리가 창피해서"), "실제 아이 발화 원문");
ok(/장면 \d/.test(quoteBody), "맥락(장면) 표시");

// ── G-4 가정 학습 가이드 ──────────────────────────────────────────────
console.log("\n=== G-4 가정 학습 가이드 ===");
await page.getByRole("tab", { name: "가정 가이드" }).click();
await page.waitForTimeout(500);
ok(new URL(page.url()).searchParams.get("tab") === "guide", "탭 쿼리 = guide");
ok(await page.getByText("이렇게 물어보세요", { exact: false }).isVisible(), "질문 섹션");
ok(await page.getByText("함께 해보세요", { exact: false }).isVisible(), "활동 섹션");
const guideBody = await bodyText();
ok(
  guideBody.includes("학습 과제가 아니라"),
  "학습 과제가 아님을 명시 (가이드 6절)"
);
ok((await page.getByRole("button", { name: "리포트 공유하기" }).count()) === 1, "공유 버튼");

// ── H-1 설정 ──────────────────────────────────────────────────────────
console.log("\n=== H-1 설정 ===");
await page.goto(`${BASE}/parent/settings`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "설정" }).waitFor({ timeout: 8000 }).catch(() => {});
ok(await page.getByText("parent@example.com").isVisible(), "이메일 표시");
ok(await page.getByText("카카오", { exact: true }).isVisible(), "연결된 로그인");
ok(await page.getByText("동의함").isVisible(), "아동 개인정보 동의 상태 칩");
ok((await page.getByRole("switch", { name: "알림 받기" }).count()) === 1, "알림 토글");
for (const label of ["아이 프로필 관리", "공지사항", "고객센터", "이용 안내"]) {
  ok((await page.getByRole("link", { name: label }).count()) === 1, `링크 "${label}"`);
}

// H-7 회원 탈퇴
await page.getByRole("button", { name: "회원 탈퇴" }).click();
await page.getByRole("heading", { name: "정말 탈퇴하시겠어요?" }).waitFor({ timeout: 5000 }).catch(() => {});
ok(await page.getByRole("heading", { name: "정말 탈퇴하시겠어요?" }).isVisible(), "H-7 모달");
const confirmBtn = page.getByRole("button", { name: "정말 탈퇴할게요" });
ok(await confirmBtn.isDisabled(), "입력 전에는 비활성");
await page.getByLabel(/탈퇴합니다.*입력/).fill("탈퇴");
await page.waitForTimeout(200);
ok(await confirmBtn.isDisabled(), "문구가 정확하지 않으면 비활성");
await page.getByLabel(/탈퇴합니다.*입력/).fill("탈퇴합니다");
await page.waitForTimeout(200);
ok(await confirmBtn.isEnabled(), "정확히 입력하면 활성");
await page.getByRole("button", { name: "취소" }).click();
await page.waitForTimeout(300);
ok((await page.getByRole("heading", { name: "정말 탈퇴하시겠어요?" }).count()) === 0, "취소로 닫힘");

// ── H-2 아이 프로필 관리 + H-6 삭제 확인 ─────────────────────────────
console.log("\n=== H-2 아이 프로필 관리 ===");
await page.getByRole("link", { name: "아이 프로필 관리" }).click();
await page.waitForURL("**/parent/settings/children", { timeout: 8000 }).catch(() => {});
await page.getByText("민준", { exact: true }).waitFor({ timeout: 8000 }).catch(() => {});
ok(await page.getByText("민준", { exact: true }).isVisible(), "아이 행 1");
ok(await page.getByText("서연", { exact: true }).isVisible(), "아이 행 2");
ok(/\d+세 · \d{4}\.\d{2}\.\d{2} 등록/.test(await bodyText()), "'N세 · YYYY.MM.DD 등록'");
ok(
  (await page.getByRole("button", { name: "+ 아이 추가하기" }).count()) === 1,
  "추가 행"
);

// 인라인 편집
await page.getByRole("button", { name: "민준 프로필 수정" }).click();
await page.getByLabel("이름").waitFor({ timeout: 5000 }).catch(() => {});
await page.getByLabel("이름").fill("민준이");
await page.getByRole("button", { name: "캐릭터 color5" }).click();
await page.getByRole("button", { name: "저장" }).click();
await page.waitForTimeout(900);
ok(await page.getByText("민준이", { exact: true }).isVisible(), "이름 수정 반영");

// H-6 삭제 — 선택된 아이가 아닌 쪽을 지운다
await page.getByRole("button", { name: "서연 프로필 삭제" }).click();
await page.getByText(/프로필을 삭제할까요\?/).waitFor({ timeout: 5000 }).catch(() => {});
ok(await page.getByText(/서연이 프로필을 삭제할까요\?/).isVisible(), "H-6 모달 (이름 조사)");
ok(
  await page.getByText("되돌릴 수 없어요", { exact: false }).isVisible(),
  "되돌릴 수 없음 경고"
);
await page.getByRole("button", { name: "삭제하기" }).click();
await page.waitForTimeout(1000);
ok((await page.getByText("서연", { exact: true }).count()) === 0, "삭제 반영");

// 선택된 아이를 지우면 /profiles로
await page.getByRole("button", { name: "민준이 프로필 삭제" }).click();
await page.getByRole("button", { name: "삭제하기" }).waitFor({ timeout: 5000 });
await page.getByRole("button", { name: "삭제하기" }).click();
await page.waitForURL("**/profiles", { timeout: 8000 }).catch(() => {});
ok(path() === "/profiles", "선택된 아이 삭제 → /profiles (H-6 체크리스트)", path());

// ── H-3 / H-4 / H-5 ──────────────────────────────────────────────────
console.log("\n=== H-3 공지사항 ===");
await page.goto(`${BASE}/parent/notices`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "공지사항" }).waitFor({ timeout: 8000 }).catch(() => {});
ok((await page.getByRole("listitem").count()) === 2, "공지 2건");
ok(await page.getByText("안내", { exact: true }).isVisible(), "분류 칩 '안내'");
ok(await page.getByText("업데이트", { exact: true }).isVisible(), "분류 칩 '업데이트'");
const firstNotice = page.getByRole("button").first();
ok((await page.getByLabel("읽지 않음").count()) === 1, "미읽음 점");
await firstNotice.click();
await page.waitForTimeout(400);
ok(
  await page.getByText("밑줄 그어진 낱말을 누르면", { exact: false }).isVisible(),
  "아코디언으로 본문 표시 (상세 화면 미설계 대응)"
);
ok((await page.getByLabel("읽지 않음").count()) === 0, "펼치면 미읽음 해제");

console.log("\n=== H-4 고객센터 ===");
await page.goto(`${BASE}/parent/support`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "고객센터" }).waitFor({ timeout: 8000 }).catch(() => {});
ok((await page.getByRole("listitem").count()) === 5, "FAQ 5문항");
ok(
  await page.getByText("주소창 왼쪽의 자물쇠 아이콘", { exact: false }).isVisible(),
  "첫 항목이 펼쳐진 상태"
);
ok(
  await page.getByText("1:1 문의 창구는 준비 중이에요", { exact: false }).isVisible(),
  "연결 대상 미정 → 안내로 대체"
);

console.log("\n=== H-5 이용 안내 ===");
await page.goto(`${BASE}/parent/guide`, { waitUntil: "networkidle" });
await page.getByRole("heading", { name: "이용 안내" }).waitFor({ timeout: 8000 }).catch(() => {});
ok((await page.getByRole("listitem").count()) === 3, "3카드");
ok(
  await page.getByText("화면 테두리가 주황색으로 반짝일 때", { exact: false }).isVisible(),
  "PRD O-17 3줄 안내 수용"
);
await page.getByRole("button", { name: "다시 보지 않기" }).click();
await page.waitForTimeout(300);
const hidden = await page.evaluate(() => window.localStorage.getItem("gq.hideGuide"));
ok(hidden === "1", "'다시 보지 않기' 로컬 저장");

if (errs.length) {
  console.log("\n=== 에러 ===");
  [...new Set(errs)].slice(0, 6).forEach((e) => console.log("  " + e));
}
console.log(`\n${fails === 0 ? "전부 통과" : `실패 ${fails}건`}`);
await page.screenshot({ path: SHOT("parent-shot") });
await browser.close();
