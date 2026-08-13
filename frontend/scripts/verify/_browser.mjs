/**
 * 검증 스크립트 공통 — Chromium 실행 파일 찾기
 *
 * `playwright install`이 내려받아 둔 Chromium을 쓴다. 경로가 OS마다 달라서
 * 하드코딩하면 다른 사람 기계에서 바로 깨진다.
 *
 * 못 찾으면 `GQ_CHROME`으로 직접 지정할 수 있다.
 *   GQ_CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe" node scripts/verify/play.mjs
 */

import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

/**
 * 스크린샷 저장 위치. `.shots/`는 git에서 무시한다.
 * 저장소 루트에 PNG가 쌓이면 커밋에 섞여 들어간다.
 */
export function SHOT(name) {
  const dir = join(dirname(fileURLToPath(import.meta.url)), ".shots");
  mkdirSync(dir, { recursive: true });
  return join(dir, `${name}.png`);
}

/**
 * C-1 도입을 끝까지 넘긴다.
 *
 * ⚠️ **횟수를 세지 않는다.** 예전에는 `for (let i = 0; i < 4; i++)`로 "다음"을 네 번
 *    눌렀는데, 도입 자막 문장 수가 3개에서 6개로 늘자 스위트 세 개가 한꺼번에
 *    깨졌다. 자막 개수는 콘텐츠(`story_scenes.scene_description`)라 언제든 바뀐다.
 *    **버튼이 사라질 때까지** 누르는 쪽이 콘텐츠 변화에 견딘다.
 *
 * 자동재생 게이트("탭하면 이야기가 시작돼요")도 함께 처리한다.
 */
export async function skipIntro(page, { max = 40 } = {}) {
  await page
    .getByText("탭하면 이야기가 시작돼요")
    .click({ timeout: 8000 })
    .catch(() => {});

  for (let i = 0; i < max; i += 1) {
    const next = page.getByRole("button", { name: /다음|이야기 시작하기/ });
    if ((await next.count()) === 0) return true;
    await next.first().click().catch(() => {});
    await page.waitForTimeout(250);
  }
  return false;
}

/**
 * 미션 브리프가 열려 있으면 "말해볼래요"를 눌러 발화 차례로 넘긴다.
 *
 * ⚠️ 미션이 뜬 뒤에는 TTS가 끝나도 **자동으로 아이 차례가 되지 않는다.** 아이가
 *    미션을 읽고 스스로 시작하는 흐름이기 때문이다(계획 D16). 그래서 이야기를
 *    완주하는 스위트는 이 단계를 반드시 통과해야 한다. 안 부르면
 *    "이제 말해 볼까?"를 기다리다 타임아웃한다.
 *
 * 미션은 4항목을 도는 동안 여러 번 돌아오므로, 진행 루프 **안에서** 매번 부른다.
 *
 * @returns 눌렀으면 true
 */
export async function passMissionBrief(page) {
  const button = page.getByRole("button", { name: "말해볼래요" });
  if ((await button.count()) === 0) return false;

  /**
   * 미션 2는 **택 1**이라 친구를 고르기 전에는 버튼이 비활성이다 (화면 명세 C-11).
   * 안 고르고 누르면 아무 일도 일어나지 않아 이야기가 그 자리에서 멈춘다.
   * 완주 스위트는 무엇을 고르는지가 중요하지 않으므로 첫 번째를 고른다.
   */
  const options = page.getByRole("radio");
  if ((await options.count()) > 0 && (await button.first().isDisabled())) {
    await options.first().click().catch(() => {});
    await page.waitForTimeout(150);
  }

  await button.first().click().catch(() => {});
  await page.waitForTimeout(200);
  return true;
}
