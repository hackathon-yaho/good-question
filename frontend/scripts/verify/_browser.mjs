/**
 * 검증 스크립트 공통 — Chromium 실행 파일 찾기
 *
 * `playwright install`이 내려받아 둔 Chromium을 쓴다. 경로가 OS마다 달라서
 * 하드코딩하면 다른 사람 기계에서 바로 깨진다.
 *
 * 못 찾으면 `GQ_CHROME`으로 직접 지정할 수 있다.
 *   GQ_CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe" node scripts/verify/play.mjs
 */

import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** ms-playwright 캐시 위치 — OS별 */
function cacheRoots() {
  const home = homedir();
  const roots = [];
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) {
    roots.push(process.env.PLAYWRIGHT_BROWSERS_PATH);
  }
  if (process.platform === "win32") {
    if (process.env.LOCALAPPDATA) {
      roots.push(join(process.env.LOCALAPPDATA, "ms-playwright"));
    }
  } else if (process.platform === "darwin") {
    roots.push(join(home, "Library", "Caches", "ms-playwright"));
  } else {
    roots.push(join(home, ".cache", "ms-playwright"));
  }
  return roots;
}

/** chromium-<빌드번호> 안의 실행 파일 후보 */
const BINARIES = [
  join("chrome-win64", "chrome.exe"),
  join("chrome-win", "chrome.exe"),
  join("chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
  join("chrome-linux", "chrome"),
];

export function chromeExecutable() {
  if (process.env.GQ_CHROME) return process.env.GQ_CHROME;

  for (const root of cacheRoots()) {
    if (!existsSync(root)) continue;
    // 빌드 번호가 큰 쪽(최신)을 먼저 본다.
    const dirs = readdirSync(root)
      .filter((name) => name.startsWith("chromium-"))
      .sort((a, b) => Number(b.slice(9)) - Number(a.slice(9)));

    for (const dir of dirs) {
      for (const binary of BINARIES) {
        const candidate = join(root, dir, binary);
        if (existsSync(candidate)) return candidate;
      }
    }
  }

  throw new Error(
    [
      "Chromium을 찾지 못했습니다.",
      "  npx playwright install chromium",
      "또는 GQ_CHROME 환경 변수로 크롬 실행 파일을 직접 지정하세요.",
    ].join("\n")
  );
}

export const BASE = process.env.GQ_BASE ?? "http://localhost:3000";
