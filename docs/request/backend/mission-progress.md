# 미션 체크리스트 항목 단위 진행 신호

- **요청자**: 프론트엔드 (eungbin)
- **작성일**: 2026-08-13
- **우선순위**: 선택 (없어도 화면은 동작합니다. 아래 임시 동작 참조)

## 배경

미션을 **한 항목씩 순차로** 진행하도록 화면을 바꿨습니다.

```
① 브리프  미션 카드를 보여준다 (마이크 없음)
② 말해볼래요  아이가 읽고 생각한 뒤 스스로 시작
③ 발화  카드를 감추고 마이크만
④ 서버 응답  남은 항목이 있으면 다음 항목으로 ①로 돌아간다
```

이 흐름에서 **"몇 번째 항목까지 끝났는지"** 를 알아야 현재 항목을 하이라이트하고
다음으로 넘길 수 있습니다.

## 문제 — `accumulatedElements`로는 표현이 안 됩니다

미션 1의 체크리스트입니다.

| # | label | element |
| --- | --- | --- |
| 1 | 무엇을 사용할까? | `SOLUTION` |
| 2 | 사람들은 어디로 피할까? | **`SOLUTION`** |
| 3 | 며느리에게 어떻게 부탁할까? | `REQUEST` |
| 4 | 그러면 어떤 일이 생길까? | `RESULT` |

1번과 2번이 **같은 요소**입니다. 완료 판정을
`accumulatedElements.includes(item.element)`로 하면 서버가 `SOLUTION`을 확정하는
순간 **1번과 2번이 동시에 완료**됩니다. `accumulatedElements`는 누적 **집합**이라
"SOLUTION을 두 번 채웠다"를 표현할 수 없습니다.

미션 2도 `PERSPECTIVE`가 2개로 같습니다.

## API 명세

### `POST /api/sessions/{sessionId}/messages`

응답에 필드 1개를 **추가**합니다. 기존 필드는 그대로입니다.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `missionProgress` | object | 선택 | 미션 진행 중일 때만 |
| `missionProgress.missionId` | string | 선택 | 어느 미션인지 |
| `missionProgress.satisfiedIndexes` | integer[] | 선택 | 충족된 체크리스트 **인덱스** (0-based) |

```json
{
  "messageId": "msg_01H...",
  "responseMode": "NORMAL",
  "characterMessage": "그래, 긴 막대기가 있으면 좋겠구나!",
  "accumulatedElements": ["SOLUTION"],
  "missionProgress": {
    "missionId": "mission_1",
    "satisfiedIndexes": [0]
  }
}
```

위 예에서 `accumulatedElements`는 `SOLUTION` 하나뿐이지만
`satisfiedIndexes`가 `[0]`이므로 프론트는 **1번만** 완료로 표시하고 2번을
현재 항목으로 하이라이트합니다.

## 프론트가 이 값으로 하는 일

| 값 | 화면 |
| --- | --- |
| `satisfiedIndexes`에 포함된 항목 | 완료 — 초록 배경 + ✓ |
| 그다음 미완료 항목 | **현재** — 흰 배경 + 주색 링 + bold. "지금 말해볼 것" 칩도 이 항목 기준 |
| 그 뒤 항목 | 대기 — 흐린 배경 |
| 전부 포함 | 미션 종료. 브리프를 다시 열지 않고 일반 대화로 돌아간다 |

## 없을 때의 임시 동작 (지금 구현되어 있음)

**미션 중 아이 발화 1회 = 항목 1개 진행**으로 포인터를 옮깁니다.
(`frontend/src/features/play/machine.ts`의 `missionDoneCount()`)

- 서버의 `accumulatedElements`로 계산한 값과 **더 많이 진행된 쪽**을 씁니다.
  미션 전에 이미 채운 요소가 있으면 그 항목은 발화 없이도 완료로 올라갑니다
- **완료를 되돌리지 않습니다.** 채웠던 항목이 사라지면 아이가 혼란스럽습니다
- 이건 **채점이 아닙니다.** 완료 표시의 뜻은 "맞았어요"가 아니라 **"말했어요"** 이고
  (스크린리더 문구도 그렇습니다), 아이가 그 항목에 대해 말한 것은 사실입니다

즉 **약한 답변도 다음 항목으로 넘어갑니다.** 그게 이 필드가 필요한 이유입니다.

## 확인 방법

`frontend`에서 `npm run verify`의 `turn` 스위트가 미션 브리프 → 말해볼래요 →
발화 → 브리프 복귀 흐름과 현재 항목 하이라이트를 확인합니다.
