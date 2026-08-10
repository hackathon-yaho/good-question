// 7단계 검증 — I-1 마이크 권한 요청 · I-3 네트워크 오류 · I-4 권한 거부
import { chromium } from "playwright-core";

import { BASE, chromeExecutable } from "./_browser.mjs";

const EXE = chromeExecutable();

const browser = await chromium.launch({ executablePath: EXE, headless: true });

let fails = 0;
const ok = (cond, label, extra = "") => {
  if (!cond) fails += 1;
  console.log(`  ${cond ? "OK  " : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};

/** 아이 1명 등록 + 선택까지 끝낸 컨텍스트를 만든다. */
async function signedInContext(opts = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ...opts,
  });
  const page = await ctx.newPage();
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
  });
  return { ctx, page };
}

// ── I-4 : 권한이 거부된 상태로 /play 직접 진입 ────────────────────────
console.log("=== I-4 마이크 권한 거부 (하드 블록) ===");
{
  // permissions를 주지 않으면 헤드리스 Chromium은 microphone을 denied로 보고한다.
  const { ctx, page } = await signedInContext({ permissions: [] });
  await page.goto(`${BASE}/play/sys1`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "마이크가 꺼져 있어요" }).waitFor({ timeout: 8000 }).catch(() => {});

  ok(await page.getByRole("heading", { name: "마이크가 꺼져 있어요" }).isVisible(), "I-4 전체화면 표시");
  ok(
    (await page.getByRole("listitem").count()) === 3,
    "3단계 해결 안내",
    `${await page.getByRole("listitem").count()}개`
  );
  ok(
    await page.getByText("주소창 왼쪽의 자물쇠 아이콘을 눌러요").isVisible(),
    "1단계 문구 일치"
  );
  ok(
    (await page.getByText("이제 말해 볼까?").count()) === 0,
    "권한 없으면 대화 화면이 그려지지 않음"
  );

  await page.getByRole("button", { name: /권한 다시 확인하기/ }).click();
  await page.getByText("아직 마이크가 꺼져 있어요").waitFor({ timeout: 5000 }).catch(() => {});
  ok(
    await page.getByText("아직 마이크가 꺼져 있어요").isVisible(),
    "재확인 실패 → 토스트, 화면 유지"
  );
  ok(await page.getByRole("heading", { name: "마이크가 꺼져 있어요" }).isVisible(), "여전히 I-4");

  await page.getByRole("button", { name: "나가기" }).click();
  await page.waitForURL("**/home", { timeout: 6000 }).catch(() => {});
  ok(new URL(page.url()).pathname === "/home", "나가기 → /home", new URL(page.url()).pathname);
  await ctx.close();
}

// ── I-1 : 아직 묻지 않은 상태(prompt) ─────────────────────────────────
console.log("\n=== I-1 마이크 권한 요청 ===");
{
  const { ctx, page } = await signedInContext({ permissions: [] });
  // 헤드리스는 prompt 상태를 만들 수 없으므로 조회 결과만 갈아끼운다.
  // getUserMedia는 실제로 거부되게 두고, 아래에서 허용 케이스를 따로 본다.
  await page.addInitScript(() => {
    navigator.permissions.query = async () => ({ state: "prompt", onchange: null });
  });
  await page.goto(`${BASE}/play/sys2`, { waitUntil: "networkidle" });
  await page.getByText("목소리로 이야기할 거예요").waitFor({ timeout: 8000 }).catch(() => {});

  ok(await page.getByText("목소리로 이야기할 거예요").isVisible(), "I-1 모달 표시");
  ok(
    await page.getByText("목소리는 저장되지 않고 글자로만 바뀌어요.").isVisible(),
    "음성 미저장 안내"
  );
  ok(
    await page.getByText("이야기를 시작하려면 마이크 허용이 꼭 필요해요.").isVisible(),
    "헬퍼 텍스트"
  );
  const buttons = await page.getByRole("dialog").getByRole("button").allInnerTexts();
  ok(buttons.length === 1 && buttons[0].includes("마이크 켜기"), "버튼은 '마이크 켜기' 하나", buttons.join("/"));
  ok(
    (await page.getByRole("button", { name: /건너뛰기|나중에|닫기/ }).count()) === 0,
    "건너뛰기·닫기 없음 (마이크 필수 정책)"
  );

  // 거부 → I-4로 전환
  await page.getByRole("button", { name: "마이크 켜기" }).click();
  await page.getByRole("heading", { name: "마이크가 꺼져 있어요" }).waitFor({ timeout: 8000 }).catch(() => {});
  ok(await page.getByRole("heading", { name: "마이크가 꺼져 있어요" }).isVisible(), "거부하면 I-4로 전환");
  await ctx.close();
}

// ── I-1 : 허용하면 통과 ───────────────────────────────────────────────
console.log("\n=== I-1 → 허용하면 C-1로 진행 ===");
{
  const { ctx, page } = await signedInContext({ permissions: ["microphone"] });
  await page.addInitScript(() => {
    navigator.permissions.query = async () => ({ state: "prompt", onchange: null });
  });
  await page.goto(`${BASE}/play/sys3`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "마이크 켜기" }).click({ timeout: 8000 }).catch(() => {});
  await page.getByText("옛날 어느 마을에", { exact: false }).waitFor({ timeout: 8000 }).catch(() => {});
  ok(
    await page.getByText("옛날 어느 마을에", { exact: false }).isVisible(),
    "허용 → C-1 도입 화면"
  );
  await ctx.close();
}

// ── 권한 있으면 게이트가 안 보인다 ────────────────────────────────────
console.log("\n=== 권한 granted면 게이트를 지나친다 ===");
{
  const { ctx, page } = await signedInContext({ permissions: ["microphone"] });
  await page.goto(`${BASE}/play/sys4`, { waitUntil: "networkidle" });
  await page.getByText("옛날 어느 마을에", { exact: false }).waitFor({ timeout: 8000 }).catch(() => {});
  ok(
    (await page.getByText("목소리로 이야기할 거예요").count()) === 0,
    "I-1 모달이 뜨지 않음"
  );
  ok(
    await page.getByText("옛날 어느 마을에", { exact: false }).isVisible(),
    "곧바로 C-1"
  );
  await ctx.close();
}

// ── I-3 : 오프라인 감지 ───────────────────────────────────────────────
console.log("\n=== I-3 네트워크 오류 ===");
{
  const { ctx, page } = await signedInContext({ permissions: ["microphone"] });
  await page.goto(`${BASE}/home`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);

  await ctx.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await page.getByText("잠깐 연결이 끊겼어요").waitFor({ timeout: 5000 }).catch(() => {});

  ok(await page.getByText("잠깐 연결이 끊겼어요").isVisible(), "오프라인 → I-3 전체화면");
  ok(
    await page.getByText("지금까지 한 이야기는 저장했어요.").isVisible(),
    "안내 문구"
  );
  ok(
    (await page.getByRole("button", { name: "다시 시도하기" }).count()) === 1,
    "다시 시도하기 버튼"
  );
  ok(
    (await page.getByRole("button", { name: "홈으로 가기" }).count()) === 1,
    "홈으로 가기 버튼"
  );
  // 금지: 빨간 경고 삼각형·에러 코드
  const body = await page.locator("body").innerText();
  ok(!/error|Error|\b5\d\d\b|⚠/.test(body), "에러 코드·경고 기호 노출 없음");

  await ctx.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForTimeout(400);
  ok(
    (await page.getByText("잠깐 연결이 끊겼어요").count()) === 0,
    "온라인 복귀하면 자동으로 닫힌다"
  );
  await ctx.close();
}

// ── I-3 : 발화 제출 실패 → 재시도로 같은 발화 복구 ────────────────────
console.log("\n=== I-3 재시도가 실패한 요청을 되살리는가 ===");
{
  const { ctx, page } = await signedInContext({ permissions: ["microphone"] });
  await page.addInitScript(() => {
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

  await page.goto(`${BASE}/play/sys5`, { waitUntil: "networkidle" });
  await page.getByText("탭하면 이야기가 시작돼요").click({ timeout: 8000 }).catch(() => {});
  for (let i = 0; i < 6; i++) {
    const b = page.getByRole("button", { name: /다음|이야기 시작하기/ });
    if (await b.count()) { await b.first().click().catch(() => {}); await page.waitForTimeout(200); }
  }
  await page.getByText("이제 말해 볼까?").waitFor({ timeout: 12000 }).catch(() => {});
  ok(await page.getByText("이제 말해 볼까?").isVisible(), "C-4 도달");

  const SPOKEN = "며느리가 창피해서 계속 참았던 것 같아요. 가족들에게 말하면 좋겠어요.";
  await page.evaluate((t) => window.__say(t), SPOKEN);
  await page.getByText("이렇게 말한 게 맞아?").waitFor({ timeout: 8000 }).catch(() => {});

  // 보내기를 누른 **뒤에** 연결이 끊기는 순서여야 한다. 먼저 끊으면 오프라인
  // 자동 감지로 I-3이 떠서 보내기 버튼을 가린다(그건 정상 동작이다).
  const failed = page.waitForEvent("console", {
    predicate: (m) => m.text().includes("[play] 발화 제출 실패"),
    timeout: 10000,
  });
  await page.getByRole("button", { name: "보내기" }).click();
  await ctx.setOffline(true);
  // 목이 실제로 던질 때까지 기다린다. 그전에 온라인으로 돌리면 제출이 성공해 버린다.
  await failed;
  await page.waitForTimeout(300);
  ok(await page.getByText("잠깐 연결이 끊겼어요").isVisible(), "제출 실패 → I-3");

  // 복구 후 재시도하면 그 발화가 되살아나야 한다. (I-3 체크리스트)
  await ctx.setOffline(false);
  await page.getByRole("button", { name: "다시 시도하기" }).click();
  await page.getByText("이렇게 말한 게 맞아?").waitFor({ timeout: 8000 }).catch(() => {});
  ok(
    await page.getByText("이렇게 말한 게 맞아?").isVisible(),
    "재시도 → C-5로 복귀"
  );
  const draft = await page
    .locator("textarea")
    .first()
    .inputValue()
    .catch(() => "");
  ok(draft.includes("며느리가 창피해서"), "아이가 한 말이 그대로 남아 있음", draft.slice(0, 20));

  await page.getByRole("button", { name: "보내기" }).click();
  await page.waitForTimeout(2400);
  ok(
    (await page.getByText("잠깐 연결이 끊겼어요").count()) === 0,
    "복구 후 제출은 정상 진행"
  );
  await ctx.close();
}

console.log(`\n${fails === 0 ? "전부 통과" : `실패 ${fails}건`}`);
await browser.close();
