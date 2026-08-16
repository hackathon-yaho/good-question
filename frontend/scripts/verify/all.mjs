/**
 * 검증 스위트 전체 실행
 *
 *   npm run dev            # 다른 터미널에서 먼저 띄운다
 *   npm run verify
 *
 * 각 스위트는 독립된 브라우저 컨텍스트를 쓰므로 순서에 의존하지 않는다.
 * 다만 같은 개발 서버를 공유하므로 **하나씩 순서대로** 돌린다.
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * 개발 서버가 **목 모드**인지 확인한다.
 *
 * ⚠️ 스위트는 대부분 주소에 `?api=`를 붙이지 않고 개발 서버의 기본 모드를 그대로
 *    따른다(`wiring`·`speech`만 일부러 backend를 지정한다). 그래서 `.env.local`이
 *    `backend`인데 백엔드가 안 떠 있으면 **전 스위트가 통째로 빨간불**이 되고,
 *    그게 코드 문제인지 환경 문제인지 구분할 방법이 없다. 실제로 그렇게 8분을 버렸다.
 *
 * 여기서 미리 알려 주면 그 8분을 아낀다. `.env.local`은 개발 서버가 읽는 파일이므로
 * 대부분의 경우 이 값이 곧 서버 모드다. 환경변수로 덮어쓴 경우까지는 알 수 없어
 * **중단하지 않고 경고만** 한다.
 */
function warnIfNotMockMode() {
  let raw;
  try {
    raw = readFileSync(join(HERE, "..", "..", ".env.local"), "utf8");
  } catch {
    return; // 파일이 없으면 기본값(mock)이다
  }
  const mode = /^NEXT_PUBLIC_API_MODE\s*=\s*(\S+)/m.exec(raw)?.[1];
  if (!mode || mode === "mock") return;

  console.log(
    [
      "",
      `⚠️  .env.local의 NEXT_PUBLIC_API_MODE가 "${mode}"입니다.`,
      "   검증은 목 모드를 전제합니다. 백엔드가 떠 있지 않으면 전 스위트가 실패합니다.",
      "",
      "   목으로 돌리려면 개발 서버를 이렇게 다시 띄우세요:",
      "     NEXT_PUBLIC_API_MODE=mock NEXT_PUBLIC_SPEECH_MODE=mock npm run dev",
      "",
    ].join("\n")
  );
}

warnIfNotMockMode();

const SUITES = [
  ["play", "C-1 도입 · TTS"],
  ["turn", "C-3~C-6 대화 1턴 · 세 모드"],
  // 이 스위트만 ?speech=backend로 2안(백엔드 STT/TTS) 경로를 태운다.
  ["speech", "2안 STT/TTS — 녹음·업로드·오디오 재생"],
  // 미션은 [브리프 → 발화 → 브리프]를 4번 도는 흐름이라 따로 본다.
  ["mission", "C-10·C-11 미션 순차 진행"],
  ["handoff", "/play 완주 → /activity 인계"],
  ["activity", "D-1~D-7 말하기 후 활동"],
  ["drag", "D-2 카드 드래그 (마우스·터치)"],
  ["account", "A-1~A-5 · B-1 · 라우트 가드"],
  ["system", "I-1 · I-3 · I-4 예외"],
  ["browse", "B-2·B-3·B-4 · C-9 · E · F-1"],
  ["parent", "A-6 · G · H"],
  ["shop", "아바타 상점 — 구매·장착·잔액"],
  // ?api=backend로 실 HTTP 클라이언트 경로·본문을 명세와 대조한다.
  ["wiring", "실서버 배선 — 경로·메서드·본문"],
  ["layout", "태블릿 5종 — 버튼 줄바꿈·넘침"],
];

function run(name) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(HERE, `${name}.mjs`)], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (chunk) => (out += chunk));
    child.stderr.on("data", (chunk) => (out += chunk));
    child.on("close", (code) => resolve({ code, out }));
  });
}

let totalOk = 0;
let totalFail = 0;
const broken = [];

for (const [name, label] of SUITES) {
  const { code, out } = await run(name);
  const ok = (out.match(/^\s+OK/gm) ?? []).length;
  const fail = (out.match(/FAIL/g) ?? []).length;
  totalOk += ok;
  totalFail += fail;

  const bad = fail > 0 || code !== 0;
  if (bad) broken.push({ name, out });
  console.log(
    `${bad ? "✖" : "✔"} ${name.padEnd(9)} OK ${String(ok).padStart(3)}  FAIL ${fail}  ${label}`
  );
}

if (broken.length > 0) {
  for (const { name, out } of broken) {
    console.log(`\n───── ${name} 출력 ─────\n${out}`);
  }
}

console.log(`\n총 ${totalOk}건 확인, 실패 ${totalFail}건`);
process.exit(totalFail > 0 || broken.length > 0 ? 1 : 0);
