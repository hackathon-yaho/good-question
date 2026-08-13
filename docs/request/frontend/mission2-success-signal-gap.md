# 미션2 성공 판정 — 자연 발동 시 항상 실패하는 구조적 문제

- **요청자**: 백엔드 담당
- **작성일**: 2026-08-13
- **우선순위**: 선택 (진행을 막지는 않지만, 아이가 이미 성공했는데도 성공 표시를 못 받는 문제)

## 배경

`machine.ts`의 `mission2Satisfied`를 보고 발견했습니다 — 프론트도 이미 코드 주석에 이 한계를
적어뒀던 부분이라, "원인·영향 범위·백엔드 쪽에서 뭘 바꿀 수 있는지"를 정리해서 남깁니다.

미션2(`sc_banggui_09`, "친구의 단점을 장점으로 바꾸기")는 아이 발화에서 `PERSPECTIVE` 요소가
확정되면 성공입니다. 뜨는 경로가 두 가지입니다(`MissionTrigger.shouldRevealMission2`, 백엔드).

1. **자연 발동** — 아이가 이미 관점을 바꿔 말해서 `accumulatedElements`에 `PERSPECTIVE`가
   들어간 순간 바로 뜬다
2. **강제 발동** (D-29) — 내용과 무관하게, 장면이 끝나기 한 턴 전(`maxTurns - 1`)엔 무조건 뜬다

## 문제

`mission2Satisfied(before, after)`는 "미션이 뜨기 **직전** 상태엔 `PERSPECTIVE`가 없었는데,
그다음 대답에서 **새로** 생겼는지"로 성공을 판정합니다.

```ts
export function mission2Satisfied(before, after) {
  const PERSPECTIVE = "PERSPECTIVE";
  return !before.includes(PERSPECTIVE) && after.includes(PERSPECTIVE);
}
```

그런데 **자연 발동 경로는 정의상 이미 `PERSPECTIVE`가 있어서 뜬 것**입니다. 미션이 뜨는 그
순간의 `accumulatedElements`(= 다음 턴의 `before`)에 `PERSPECTIVE`가 이미 포함돼 있으니,
그 뒤로 아이가 뭐라고 답하든 "새로 생긴 게 아니다"로 판정돼 `mission2Satisfied`가
**절대 `true`가 될 수 없습니다.** `MISSION2_MAX_ATTEMPTS`(2회)까지 반복되다 조용히 브리프가
닫힙니다.

**강제 발동 경로는 문제없습니다** — 이땐 `PERSPECTIVE`가 아직 없는 상태에서 뜨는 거라, 첫
대답에서 새로 잡히면 정상적으로 성공 판정이 됩니다.

즉 **아이가 미션이 뜨기 전에 이미 관점을 잘 얘기해서 미션이 자연스럽게 뜨는, 오히려 잘하고
있는 경우일수록** 성공 표시를 못 받고 재시도만 반복하다 넘어갑니다.

## 영향 범위

- 장면 진행 자체는 안 막힙니다 — `GOAL_MET`/`MAX_TURNS`은 `missionProgress`나
  `mission2Satisfied`와 무관하게 `missingElements`만 보고 판단합니다(`ProgressJudge`).
- 순수하게 **미션2의 성공 피드백(카드가 "잘했어" 없이 조용히 닫힘)** 문제입니다.
- 자연 발동 비율이 높을수록(=아이들이 잘할수록) 더 자주 발생합니다.

## 원인 — 프론트가 이 판정을 직접 할 수 없는 구조

프론트는 "이번 발화가 관점을 바꿔 말한 것인지"를 스스로 판단할 방법이 없습니다(그건 AI 분석
영역). 그래서 `accumulatedElements`의 직전/직후 차이로 우회 추정하고 있는데, 이 우회 방법 자체가
자연 발동 경로에서 성립하지 않는 게 근본 원인입니다. 프론트 쪽 코드만으로는 고칠 수 없습니다.

## 백엔드 쪽에서 고려 중인 방향

아직 구현하지 않았고, 여기 적어두는 건 방향 공유입니다.

- `Missions.MISSION_2`의 `checklist`가 지금 빈 배열인데, 여기에 최소 1항목(`PERSPECTIVE`)만
  채우면 `missionProgress.satisfiedIndexes`(D-30)가 자동으로 채워집니다
- 프론트는 `mission2Satisfied`(직전/직후 diff)를 버리고
  `missionProgress.satisfiedIndexes.length > 0`을 그대로 성공 신호로 쓰면 됩니다 — 발동 경로가
  자연이든 강제든 상관없이 정확합니다

## 확인 요청

- 이 방향(체크리스트 1항목 + `missionProgress.satisfiedIndexes` 사용)으로 가도 괜찮을지
- `missionProgress`는 지금 `sceneEnded`면 `null`이 나가는데, 미션2 성공 직후 바로 장면이 끝나는
  케이스(성공 판정 == `PERSPECTIVE` == 장면 필수 요소 중 하나라 `missingElements`도 같이 비워질
  수 있음)에서 `missionProgress`가 `null`로 오면 프론트가 "성공"을 어떻게 표시할지 — 이 부분은
  백엔드가 구현 전에 같이 확인이 필요합니다

백엔드가 구현할 때 다시 문서를 갱신하겠습니다.

## 참고

- 백엔드: `MissionTrigger.java`(`shouldRevealMission2`), `Missions.java`(`MISSION_2`),
  `MessageServiceImpl.java`(`missionProgress()`)
- 프론트: `machine.ts`(`mission2Satisfied`, `shouldOpenMissionBrief`), `mission2.ts`,
  `Mission2Card.tsx`
