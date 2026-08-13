/**
 * 백엔드 음성 경로 검증 — 2안 (docs/request/frontend/stt-tts-integration.md)
 *
 * 다른 스위트는 전부 목 모드(브라우저 Web Speech)를 돌린다. 이 스위트만
 * `?speech=backend`로 **실제로 배포될 경로**를 태운다.
 *
 *   ① POST /api/stt   MediaRecorder로 녹음한 오디오를 올린다
 *   ② POST /messages  텍스트 제출
 *   ③ GET  /api/tts   대사 오디오를 받아 재생한다
 *
 * 백엔드가 아직 두 엔드포인트를 만들지 않았으므로 `page.route`로 가로챈다.
 * 가짜는 **응답뿐**이다 — 녹음·업로드·재생은 브라우저가 실제로 한다.
 *
 * 마이크는 Chromium의 가짜 오디오 장치를 쓴다(`--use-fake-device-for-media-stream`).
 * 계속 소리가 나는 장치라 무음 자동 종료가 걸리지 않으므로 [보내기]로 끝낸다.
 */

import { chromium } from "playwright-core";

import { SHOT, BASE, chromeExecutable, skipIntro } from "./_browser.mjs";

const browser = await chromium.launch({
  executablePath: chromeExecutable(),
  headless: true,
  args: [
    // getUserMedia가 실제 스트림을 준다. 스텁이 아니라 MediaRecorder가 정말 돈다.
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
    "--autoplay-policy=no-user-gesture-required",
  ],
});
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  permissions: ["microphone"],
});
const page = await ctx.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

let fails = 0;
const ok = (cond, label, extra = "") => {
  if (!cond) fails += 1;
  console.log(`  ${cond ? "OK  " : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};

/* ── 백엔드 가로채기 ─────────────────────────────────────────────── */

const STT_TEXT = "며느리가 창피해서 참았던 것 같아요";
/**
 * 1.2초 무음 WAV. <audio>가 실제로 재생하고 ended를 발생시킨다.
 *
 * 길이가 필요한 이유: 재생이 끝나면 곧바로 아이 차례로 넘어간다. 0.2초짜리를 쓰면
 * C-3이 순식간에 지나가 화면을 확인할 틈이 없다. 실제 대사 길이에 가깝게 둔다.
 */
const SILENT_WAV = silentWav(1.2);

const calls = { stt: [], tts: [] };

await page.route("**/api/stt", async (route) => {
  const request = route.request();
  calls.stt.push({
    method: request.method(),
    contentType: request.headers()["content-type"] ?? "",
    bytes: (request.postDataBuffer() ?? Buffer.alloc(0)).length,
  });
  // 실제 Whisper는 수 초가 걸린다. 즉시 응답하면 "변환 중" 구간이 관찰되지 않는다.
  await new Promise((resolve) => setTimeout(resolve, 1200));
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ text: STT_TEXT }),
  });
});

await page.route("**/api/tts**", async (route) => {
  calls.tts.push(new URL(route.request().url()).search);
  await route.fulfill({
    status: 200,
    contentType: "audio/wav",
    body: SILENT_WAV,
  });
});

/**
 * 브라우저 음성 API를 감시한다. 백엔드 모드에서 **한 번도 불리면 안 된다.**
 * 요청 문서 완료 조건: "SpeechRecognition·SpeechSynthesis 호출이 남아 있지 않다"
 */
await page.addInitScript(() => {
  window.__browserSpeechUsed = [];
  if (window.speechSynthesis) {
    const real = window.speechSynthesis.speak.bind(window.speechSynthesis);
    window.speechSynthesis.speak = (u) => {
      window.__browserSpeechUsed.push(`speak:${u.text.slice(0, 20)}`);
      return real(u);
    };
  }
  for (const key of ["SpeechRecognition", "webkitSpeechRecognition"]) {
    const Real = window[key];
    if (!Real) continue;
    window[key] = class {
      constructor() {
        window.__browserSpeechUsed.push(`recognition:${key}`);
        return new Real();
      }
    };
  }
});

/* ── C-1 도입 통과 ───────────────────────────────────────────────── */

console.log("=== 백엔드 모드 진입 ===");
await page.goto(`${BASE}/play/demo?speech=backend`, {
  waitUntil: "networkidle",
});

await page.getByText("탭하면 이야기가 시작돼요").click();
// 도입 자막도 ③으로 음성을 받는다. messageId가 없어 text 파라미터로 간다.
await page.waitForTimeout(600);
ok(calls.tts.length > 0, "도입 자막이 GET /api/tts를 부른다", `${calls.tts.length}건`);
ok(
  calls.tts.some((search) => search.includes("text=")),
  "messageId 없는 대사는 text로 요청한다",
  calls.tts[0]?.slice(0, 40)
);

await skipIntro(page);

/* ── C-4 녹음 → ① 변환 중 → C-5 ────────────────────────────────── */

console.log("\n=== ① 녹음 → POST /api/stt ===");
await page.getByText("이제 말해 볼까?").waitFor({ timeout: 20000 });
ok(true, "C-4 도달");

// 녹음이 실제로 시작될 시간을 준다. getUserMedia가 비동기다.
await page.waitForTimeout(1200);
const submitButton = page.getByRole("button", { name: "보내기" });
ok(await submitButton.isEnabled(), "녹음 중이면 [보내기] 활성");

await submitButton.click();

// 변환 중 문구. 업로드가 끝나기 전에 잡아야 하므로 대기 없이 바로 본다.
const transcribing = page.getByText("네 말을 글로 옮기고 있어…");
const sawTranscribing = await transcribing
  .waitFor({ timeout: 4000 })
  .then(() => true)
  .catch(() => false);
ok(sawTranscribing, "① 변환 중 문구가 뜬다 (응답 대기와 구분)");

await page.getByLabel("변환된 내 말").waitFor({ timeout: 15000 });
const draft = await page.getByLabel("변환된 내 말").inputValue();
ok(draft === STT_TEXT, "STT 결과가 C-5에 들어온다", draft);
ok(calls.stt.length === 1, "POST /api/stt 1회", `${calls.stt.length}회`);
ok(
  calls.stt[0]?.contentType.startsWith("multipart/form-data"),
  "multipart/form-data로 올린다",
  calls.stt[0]?.contentType.slice(0, 30)
);
// 헤더만 있는 빈 녹음이면 올리지 않는 하한(1024B)을 넘겨야 진짜 녹음이다.
ok(
  (calls.stt[0]?.bytes ?? 0) > 1024,
  "실제 오디오 바이트가 실려 간다",
  `${calls.stt[0]?.bytes}B`
);

/* ── ② 제출 → 응답 대기 → ③ 대사 오디오 ───────────────────────── */

console.log("\n=== ② 제출 → ③ GET /api/tts?messageId= ===");
const ttsBefore = calls.tts.length;
await page.getByRole("button", { name: "보내기" }).click();

const thinking = await page
  .getByText(/생각 중이야|조금만 더 기다려줘/)
  .waitFor({ timeout: 4000 })
  .then(() => true)
  .catch(() => false);
ok(thinking, "② 응답 대기 화면이 뜬다");

const answered = page.getByRole("button", { name: /다시 듣기|계속하기/ });
await answered.first().waitFor({ timeout: 20000 });
ok(true, "캐릭터 응답 도착");
ok(calls.tts.length > ttsBefore, "응답 대사가 ③을 부른다");
ok(
  calls.tts.slice(ttsBefore).some((search) => search.includes("messageId=")),
  "새 대사는 messageId로 요청한다",
  calls.tts.at(-1)?.slice(0, 40)
);

// "다시 듣기"는 같은 오디오를 다시 재생한다. 재요청하지 않는다. (요청 문서)
const replay = page.getByRole("button", { name: "다시 듣기" });
const ttsBeforeReplay = calls.tts.length;
if (await replay.count()) await replay.first().click();
await page.waitForTimeout(700);
ok(
  calls.tts.length === ttsBeforeReplay,
  "같은 대사를 다시 재생할 때 ③을 재요청하지 않는다",
  `${calls.tts.length - ttsBeforeReplay}건 추가`
);

/* ── 브라우저 음성 API를 쓰지 않는다 ───────────────────────────── */

console.log("\n=== 브라우저 음성 API 미사용 ===");
const used = await page.evaluate(() => window.__browserSpeechUsed ?? []);
ok(
  used.length === 0,
  "SpeechSynthesis·SpeechRecognition 호출 0회 (iPad 안전)",
  used.slice(0, 3).join(", ")
);

/* ── 빈 결과면 ②를 부르지 않는다 ───────────────────────────────── */

console.log("\n=== STT 결과 없음 → I-2, ② 호출 안 함 ===");
await page.unroute("**/api/stt");
await page.route("**/api/stt", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ text: "" }),
  })
);
let messagesCalled = 0;
await page.route("**/api/sessions/**/messages", async (route) => {
  messagesCalled += 1;
  await route.fulfill({ status: 500, body: "{}" });
});

await page.getByText("이제 말해 볼까?").waitFor({ timeout: 20000 });
await page.waitForTimeout(1200);
await page.getByRole("button", { name: "보내기" }).click();
await page
  .getByText(/잘 안 들렸어|다시 말해/)
  .first()
  .waitFor({ timeout: 15000 })
  .catch(() => {});
ok(
  await page.getByText(/잘 안 들렸어|다시 말해/).first().isVisible(),
  "빈 결과 → I-2 인식 실패"
);
ok(messagesCalled === 0, "빈 결과에 ②를 부르지 않는다", `${messagesCalled}회`);

if (errors.length) {
  console.log("\n=== 에러 ===");
  [...new Set(errors)].slice(0, 8).forEach((e) => console.log("  " + e));
}
console.log(`\n${fails === 0 ? "전부 통과" : `실패 ${fails}건`}`);
await page.screenshot({ path: SHOT("speech-backend") });
await browser.close();

/** 무음 WAV 한 개. 재생 자체가 목적이라 내용은 필요 없다. */
function silentWav(seconds) {
  const rate = 8000;
  const samples = Math.floor(rate * seconds);
  const dataSize = samples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16); // fmt 청크 길이
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // 모노
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28); // 초당 바이트
  buffer.writeUInt16LE(2, 32); // 블록 정렬
  buffer.writeUInt16LE(16, 34); // 비트 깊이
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}
