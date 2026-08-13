/**
 * 미션 2 — 친구의 다른 점을 좋은 점으로 (C-11 · PRD 7.6)
 *
 * ── 미션 1과 상호작용이 다르다 ──────────────────────────────────────
 *   미션 1  4항목을 **순차로** 하나씩 말한다 (1 → 2 → 3 → 4)
 *   미션 2  4개 중 **하나를 골라** 그 친구에 대해 말한다
 *
 * ── 왜 프론트 상수인가 ──────────────────────────────────────────────
 * 서버는 `mission_2`의 `checklist`를 **항상 빈 배열로** 보낸다
 * (backend/docs/api-spec.md 6.1). 미션 정의는 별도 테이블에 두지 않고
 * **코드 상수로 관리한다**는 팀 결정이기 때문이다 (PRD 7.6 "미션 데이터 처리 방침").
 *
 * 그래서 이 4종은 프론트가 들고 있어야 한다. 지어낸 값이 아니다 —
 * 라벨은 [화면 명세 C-11](../../../../docs/spec/screens.md), 예시 문장은
 * [PRD 7.6](../../../../docs/product/prd.md)에 그대로 적혀 있다.
 *
 * ⚠️ `example`은 **아이에게 처음부터 보여주지 않는다.** 한 번 말해 본 뒤에도 어려울 때
 *    힌트로만 쓴다. 먼저 보여주면 아이가 정해진 답을 찾으려 한다 (PRD 7.6).
 */

export type Mission2Option = {
  /** 카드에 보여줄 이름. 문장 틀의 주어로도 쓴다 */
  label: string;
  /** 힌트로 쓰는 완성 문장 (PRD 7.6 예시) */
  example: string;
};

export const MISSION_2_OPTIONS: readonly Mission2Option[] = [
  { label: "목소리가 큰 친구", example: "멀리 있는 사람을 부를 수 있어요." },
  { label: "질문이 많은 친구", example: "새로운 생각을 찾을 수 있어요." },
  { label: "힘이 센 친구", example: "무거운 물건을 옮길 때 도울 수 있어요." },
  { label: "조용한 친구", example: "다른 사람의 말을 잘 들어 줄 수 있어요." },
];

/**
 * 이 미션이 "택 1" 방식인지.
 *
 * 판단 근거는 **서버가 주는 `id`** 다. `mission_1`·`mission_2`는 UUID가 아니라
 * 고정 문자열이고 계약에 그대로 적혀 있다 (api-spec 6.1 예시 `"mission_1"`).
 * 제목으로 판단하면 문구가 바뀔 때마다 깨진다.
 */
export function isChoiceMission(missionId: string): boolean {
  return missionId === "mission_2";
}

/** 문장 틀의 꼬리 — `"{선택한 친구}는 ______ 할 수 있어요."` (화면 명세 C-11) */
export const MISSION_2_SENTENCE_TAIL = "할 수 있어요.";
