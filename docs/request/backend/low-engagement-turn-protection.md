# GUIDED 2회 턴 보호·반복 저정보 발화 복귀 요청

- **요청자**: AI 파트
- **작성일**: 2026-08-15
- **우선순위**: 필수

## 배경

통합 테스트에서 아이가 `싫어`·`닥쳐`만 반복하면, 모든 발화가 `currentChildTurnCount`에 더해지고
`maxTurns` 종료가 GUIDED 판단보다 먼저 실행되어 세 번째에 다음 장면으로 넘어갔다. 주최측 GUIDED
기준은 다음 네 가지다.

1. 짧거나 불명확한 발화가 반복됨
2. 여러 턴 동안 새로운 사고 요소가 확인되지 않음
3. 장면 종료까지 남은 대화 기회가 적음
4. 필수 사고 요소가 아직 충족되지 않음

GUIDED는 이 상황에서 아이를 다음 장면으로 밀어내는 장치가 아니라, 캐릭터가 대화를 다시 이야기
안으로 이끄는 보호 구간이어야 한다. 장면당 **최대 2회**의 GUIDED 턴은 진행·미션 턴을 소모하지
않는다.

AI 서버는 `싫어`·`몰라`·`닥쳐`·STT 오인식 `닥처`를 `SHORT_RESPONSE` + `SHORT`으로 보정한다.
이는 무응답이 아니다. 백엔드는 NORMAL/GUIDED에서 여전히 AI 서버 `/respond`를 호출하고, GUIDED
대사는 캐릭터의 구체적 걱정과 장면 질문으로 아이의 참여를 다시 유도한다.

## 요구사항

1. `missingElements`가 남아 있고 아래 중 하나가 맞으면 GUIDED 후보로 판단한다.
   - 현재 발화가 `SHORT_RESPONSE`·`SHORT`이고 검출 사고 요소가 비어 있는 명백한 0정보 거절·회피·거친 말
     (`싫어`, `몰라`, `모르겠어`, `닥쳐`, `닥처`)이면 **첫 발화부터** 후보
   - `SHORT`·`UNCLEAR`·`OFF_TOPIC` 2회 연속
   - 새 사고 요소 없는 발화 2회 연속
   - 현재 턴 뒤 남은 대화 기회가 2회 이하
2. 현재 장면에서 `guidedTurnProtectionUsed < 2`인 GUIDED는 보호 턴이다.
   - `currentChildTurnCount`를 증가시키지 않는다.
   - `missionEngagedTurns`, 미션 자연·강제 노출의 진행 턴을 증가시키지 않는다.
   - `MAX_TURNS`와 미션 최대 턴 종료보다 먼저 GUIDED를 반환한다.
   - 캐릭터 응답을 위해 `/respond`를 한 번 호출한다. `CLOSING`으로 대체하지 않는다.
3. 보호 턴을 반환할 때 `guidedTurnProtectionUsed`를 1 증가시킨다. 장면 전환 시 0으로 초기화한다.
   두 번째 보호 턴 뒤에는 기존 진행 규칙을 다시 적용해 무한 대화를 만들지 않는다.
4. 명백한 0정보 거절·회피·거친 말은 첫 발화부터 첫 보호 GUIDED로 처리한다. 그 밖의 일반적인
   저정보 발화는 기존처럼 첫 반응을 NORMAL로 둘 수 있고, 두 번째 연속 저정보 발화부터 보호 GUIDED가 된다.
5. 직전 응답이 GUIDED였다는 사실만으로 현재도 정체·저정보인 발화를 NORMAL로 강제 전환하지
   않는다. 보호 횟수 2회를 쓰기 전까지는 GUIDED 흐름을 유지한다.
6. `PLAYFUL`의 기존 처리와 아이의 명시적 "이야기 나가기" 종료 경로는 바꾸지 않는다.

## 데이터 모델

`story_sessions`에 아래 상태를 추가한다. 기존 `missionFreeGuidedTurnsUsed`는 미션 전용 규칙이므로
재사용하지 않는다.

| 필드 | 타입 | 제약 | 설명 |
| --- | --- | --- | --- |
| `guided_turn_protection_used` | `smallint` | NOT NULL, 기본 0, 0~2 | 현재 장면에서 소비한 GUIDED 보호 횟수 |

장면 종료·다음 장면 시작·세션 재시작에서 0으로 초기화한다.

## 구현 제안

1. `MessageServiceImpl`에서 분석 후 GUIDED 후보·보호 가능 여부를 계산하고, 보호 턴이면 유효
   `turnCount`·미션 진행 수를 이전 값으로 유지한다.
2. `ProgressInput`에 현재 저정보 여부와 `guidedTurnProtectionUsed`를 전달한다.
3. `ProgressJudge`의 순서를 아래처럼 바꾼다.

```text
목표 충족 종료
→ missing + GUIDED 후보 + 보호 잔여 확인
→ 보호 GUIDED 반환
→ MAX_TURNS / 미션 최대 턴 종료
→ NORMAL 또는 일반 GUIDED 판단
```

4. 보호 GUIDED에서도 기존 `GuidanceSelector`로 `guidanceTarget`·`remainingWorry`를 만들고,
   `/respond`를 호출한다. AI 서버가 장면 종료를 결정하지 않는다.

## 검증 시나리오

필수 요소가 남아 있고 `maxTurns=3`인 대화 장면의 통합 테스트를 추가한다.

| 순서 | 입력 | 기대 모드 | 진행 턴 | 보호 횟수 | 장면 |
| --- | --- | --- | --- | --- | --- |
| 1 | `싫어` | GUIDED | 0 | 1 | 미종료, `/respond` 호출 |
| 2 | `싫어` | GUIDED | 0 | 2 | 미종료, `/respond` 호출 |
| 3 | `싫어` | GUIDED(보호 소진) | 1 | 2 | 미종료, 다음 장면 이동 없음 |
| 1~3 | `닥쳐` 또는 `닥처` 반복 | 위와 동일 | 위와 동일 | 위와 동일 | AI의 `SHORT_RESPONSE` 사용 |
| 보호 뒤 | 장면 맥락의 VALID 발화 | 기존 규칙 | 증가 | 2 유지 | 정상 NORMAL/GUIDED/종료 판단 |

추가로, 이미 `turnCount = maxTurns - 1`인 상태에서 처음 `모르겠어`가 들어와도 남은 기회 부족
조건으로 보호 GUIDED가 먼저 선택되고 `MAX_TURNS`로 닫히지 않는지 검증한다.

미션이 열린 장면에서도 두 보호 GUIDED가 `missionEngagedTurns`·미션 종료를 소모하지 않는 테스트를
추가한다.

## 제약 조건

- `CLOSING`은 여전히 백엔드만 결정하며 AI 서버는 마지막 대사를 만들지 않는다.
- 보호 횟수는 장면당 2회다. 단순히 `maxTurns`만 늘리거나 무한 대화를 허용하지 않는다.
- 아이 발화 원문과 분석 기록은 기존처럼 저장한다.
- 새 프론트 API·새 enum은 만들지 않는다. DB 마이그레이션은 이 상태를 정확히 보존하기 위한 최소 변경이다.

## 완료 조건

- [x] DB 마이그레이션·세션 상태 갱신·초기화가 구현됐다. `guided_turn_protection_used`
      컬럼 추가(DEFAULT 0), 장면 전환·세션 생성 시 초기화 (2026-08-15).
- [x] `싫어`·`닥쳐`·`닥처` 3회가 `sceneEnded=true`나 `nextSceneId`를 만들지 않는다. 로컬
      mock AI로 대화3(maxTurns=4)에서 "싫어" 3회 연속 실호출 확인 — 진행턴 0,0,1 /
      GUIDED,GUIDED,GUIDED, 세 번 다 `sceneEnded:false`. 4~6번째도 계속 "싫어"를 보내
      진행턴 2,3,4로 정상 소모되며 6번째(턴4=maxTurns)에서만 정상 CLOSING/MAX_TURNS로
      닫힘을 확인 (2026-08-15).
- [x] GUIDED 보호 2회에서 `/respond`가 호출되고 진행·미션 턴은 소모되지 않는다. 위 실호출
      로그에서 매 턴 캐릭터 응답이 실제로 내려옴을 확인, DB로 `guided_turn_protection_used=2`에서
      멈추고 `mission_engaged_turns=0` 유지 확인. 미션 활성 중 보호 GUIDED가 미션 최대 턴
      종료보다 우선하는 것은 `ProgressJudgeTest`로 검증.
- [x] 보호 소진 뒤 유효 발화·기존 종료·명시적 나가기 흐름이 회귀하지 않는다. 기존
      `ProgressJudgeTest` 23건 전부 통과(회귀 없음), 신규 6건 추가로 보호 시나리오 커버.
