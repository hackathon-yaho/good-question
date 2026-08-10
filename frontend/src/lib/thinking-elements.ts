/**
 * 사고 요소(Thinking Element) 표기 매핑 — docs/spec/screens.md §1-7
 *
 * 서버는 영문 코드로 내려준다. 아이 화면에는 절대 영문 코드를 노출하지 않는다.
 * 아이 화면에서는 8종을 4개 그룹(마음/이유/생각/방법)으로 묶어 별 뱃지로 표시한다.
 * 8개를 다 보여주면 아이에게 과부하다.
 */

/** PRD 6.3 — 허용 값은 이 8개로 한정한다. */
export const THINKING_ELEMENTS = [
  "DECISION",
  "REASON",
  "PERSPECTIVE",
  "SOLUTION",
  "RESULT",
  "EMOTION",
  "EMPATHY",
  "REQUEST",
] as const;

export type ThinkingElement = (typeof THINKING_ELEMENTS)[number];

/** 아이 화면에 노출되는 4개 그룹. 표시 순서도 이 순서를 따른다. */
export const KID_GROUPS = ["마음", "이유", "생각", "방법"] as const;

export type KidGroup = (typeof KID_GROUPS)[number];

const KID_LABEL: Record<ThinkingElement, KidGroup> = {
  EMOTION: "마음",
  EMPATHY: "마음",
  REASON: "이유",
  PERSPECTIVE: "생각",
  DECISION: "생각",
  RESULT: "생각",
  SOLUTION: "방법",
  REQUEST: "방법",
};

/** 보호자 화면 표기. 내부 태그명을 그대로 쓰지 않는다. (리포트 가이드 4절) */
const PARENT_LABEL: Record<ThinkingElement, string> = {
  EMOTION: "감정 표현",
  EMPATHY: "공감",
  REASON: "이유 말하기",
  PERSPECTIVE: "다른 사람 입장",
  SOLUTION: "해결 방법",
  DECISION: "판단·선택",
  RESULT: "결과 예상",
  REQUEST: "요청하기",
};

export function toKidGroup(element: ThinkingElement): KidGroup {
  return KID_LABEL[element];
}

export function toParentLabel(element: ThinkingElement): string {
  return PARENT_LABEL[element];
}

/**
 * 누적 사고 요소를 4그룹 달성 여부로 변환한다.
 * C-7·C-12의 별 뱃지가 이 결과를 그린다.
 *
 * 서버가 스키마에 없는 값을 보내도 조용히 무시한다. 아이 화면이 깨지는 것보다 낫다.
 */
export function toKidGroupFlags(
  accumulatedElements: readonly string[]
): Record<KidGroup, boolean> {
  const flags: Record<KidGroup, boolean> = {
    마음: false,
    이유: false,
    생각: false,
    방법: false,
  };

  for (const raw of accumulatedElements) {
    const group = KID_LABEL[raw as ThinkingElement];
    if (group) flags[group] = true;
  }

  return flags;
}
