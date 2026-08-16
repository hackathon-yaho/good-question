/**
 * 장면별 목표 사고 요소 — 이야기 "방귀쟁이 며느리" 전용 고정표
 *
 * ── 왜 프론트에 박아두나 ────────────────────────────────────────────
 * 서버 응답(`currentScene`)에 `requiredElements`가 없다. 그런데 화면은
 * 그 값을 알아야 한다. 4그룹(마음·이유·생각·방법)으로 고정해 그리면
 * 장면 3·4에서 **별 하나가 영영 켜지지 않는다** — 그 장면이 요구한 적 없는
 * 것을 못 했다고 표시하는 셈이고, "실패를 지적하지 않는다"(PRD 10.1)에
 * 어긋난다.
 *
 * 서비스에 이야기가 **하나뿐이고** 장면 구성이 고정이라 여기 적어둔다.
 * 값은 백엔드 `ContentSeeder.java`의 `StoryScene.createDialogue(...)`
 * 인자와 **글자 그대로 같다.** 시더가 정본이다.
 *
 * ⚠️ 이야기가 둘 이상이 되는 순간 이 파일은 틀린다. 그때는 서버가
 *    `currentScene.requiredElements`를 내려주고 이 표를 지워야 한다.
 *    (docs/request/backend/scene-required-elements.md)
 *
 * ── 키가 왜 sceneOrder가 아니라 화면 번호인가 ───────────────────────
 * DB `scene_order`는 1~9(도입·전개 포함)이고 아이가 보는 "장면 N"은
 * 대화 장면만 센 1~4다. `toScreenIndex()`가 그 변환이다.
 */

import type { ThinkingElement } from "@/lib/thinking-elements";

/** 화면 번호(1~4) → 그 장면의 목표 사고 요소. 표시 순서도 이 순서다. */
const BY_SCREEN_INDEX: Record<number, readonly ThinkingElement[]> = {
  // 장면 1 · 며느리 — 방귀를 숨기고 싶은 마음을 헤아리기
  1: ["PERSPECTIVE", "EMOTION", "REASON", "SOLUTION"],
  // 장면 2 · 시아버지 — 놀란 마음을 이해시키고 며느리를 변호하기
  2: ["PERSPECTIVE", "EMOTION", "REASON", "SOLUTION"],
  // 장면 3 · 마을 이장 — 배를 떨어뜨릴 방법과 그 결과를 함께 말하기
  3: ["SOLUTION", "REASON", "REQUEST", "RESULT"],
  // 장면 4 · 며느리 — 방귀를 좋은 일에 쓰도록 북돋우기
  4: ["EMOTION", "PERSPECTIVE", "RESULT", "SOLUTION"],
};

/** 표에 없는 장면(도입·전개, 혹은 새 이야기)에서 쓰는 기본값. 지금까지의 4그룹과 같다. */
const FALLBACK: readonly ThinkingElement[] = [
  "EMOTION",
  "REASON",
  "PERSPECTIVE",
  "SOLUTION",
];

/**
 * 이 장면이 요구하는 사고 요소.
 *
 * @param screenIndex `toScreenIndex(scene.sceneOrder)`가 준 1~4
 */
export function requiredElementsOf(
  screenIndex: number | null | undefined
): readonly ThinkingElement[] {
  if (screenIndex == null) return FALLBACK;
  return BY_SCREEN_INDEX[screenIndex] ?? FALLBACK;
}
