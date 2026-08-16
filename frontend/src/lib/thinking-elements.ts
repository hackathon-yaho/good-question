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

/**
 * 요소별 아이 화면 이름 — 4그룹으로 **접지 않는다.**
 *
 * 장면마다 목표 요소가 달라서(`scene-elements.ts`) 4그룹으로 접으면 이름이 겹친다.
 * 장면 3의 `REQUEST`·`RESULT`는 위 `KID_LABEL`에서 방법·생각으로 접히는데,
 * 그 장면은 `SOLUTION`(방법)·`REASON`도 함께 요구해서 방법이 중복되고 별 하나가
 * 영영 안 켜진다. 그래서 그 둘은 여기서 자기 이름을 갖는다.
 *
 * 겹치는 것은 뜻이 같은 짝뿐이다 — EMOTION·EMPATHY = 마음, PERSPECTIVE·DECISION = 생각.
 * 한 장면 안에서 이름이 겹치는 조합은 없다.
 */
export const KID_ELEMENT_LABEL: Record<ThinkingElement, string> = {
  EMOTION: "마음",
  EMPATHY: "마음",
  REASON: "이유",
  PERSPECTIVE: "생각",
  DECISION: "생각",
  SOLUTION: "방법",
  REQUEST: "부탁",
  RESULT: "결과",
};

/**
 * 아이가 이 요소를 모았는지.
 *
 * 코드가 정확히 같지 않아도 **아이 화면 이름이 같으면 모은 것으로 친다.**
 * 아이는 EMOTION과 EMPATHY를 구분하지 않는다 — 둘 다 "마음"이다.
 * 여기서 코드를 정확히 비교하면 공감을 말했는데 마음 별이 안 켜진다.
 */
export function hasElement(
  accumulatedElements: readonly string[],
  element: ThinkingElement
): boolean {
  const want = KID_ELEMENT_LABEL[element];
  return accumulatedElements.some(
    (raw) => KID_ELEMENT_LABEL[raw as ThinkingElement] === want
  );
}

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
