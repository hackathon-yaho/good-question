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
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

const SUITES = [
  ["play", "C-1 도입 · TTS"],
  ["turn", "C-3~C-6 대화 1턴 · 세 모드"],
  ["handoff", "/play 완주 → /activity 인계"],
  ["activity", "D-1~D-7 말하기 후 활동"],
  ["drag", "D-2 카드 드래그 (마우스·터치)"],
  ["account", "A-1~A-5 · B-1 · 라우트 가드"],
  ["system", "I-1 · I-3 · I-4 예외"],
  ["browse", "B-2·B-3·B-4 · C-9 · E · F-1"],
  ["parent", "A-6 · G · H"],
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
