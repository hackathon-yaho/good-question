# AI 서버 연동 v1 요청

- **요청자**: AI 파트
- **작성일**: 2026-08-12
- **우선순위**: 필수

## 배경

AI 서버는 아이의 최신 확정 발화 한 건을 분석하거나, 백엔드가 이미 결정한 모드에 맞는
캐릭터 한 문장을 제안한다. 세션 상태, 누적 사고 요소, 턴 수, 미션 노출, 장면 종료와
이미지 선택은 AI 서버의 책임이 아니다.

장면·대화·미션 이미지는 실시간 생성하지 않는다. 사전 제작한 정적 에셋을
`backgroundImageUrl`·`characterImageUrl`으로 표시하며, 캐릭터 표정 파일 매핑은 백엔드/프론트가
고정 목록으로 처리한다. AI는 이미지 URL·이미지 프롬프트·파일명을 반환하지 않는다. 단,
`/respond`의 `characterState`는 다섯 상태 중 하나를 고르는 제한된 enum이며, 화면이 그 값으로
이미 준비된 동일 캐릭터의 PNG를 선택한다.

## API 명세

AI 서버 기본 주소는 끝 슬래시 없이 `AI_SERVER_BASE_URL`에 둔다. 모든 AI 호출에는
`X-Internal-Token: ${AI_SERVER_INTERNAL_TOKEN}` 헤더를 넣는다. `OPENAI_API_KEY`는 AI 서버
환경 변수에만 둔다.

### `POST {AI_SERVER_BASE_URL}/analyze`

**Request**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `sceneContext` | string | Y | `scene_description + conflict`를 조합한 현재 장면 문맥 |
| `goal` | string | Y | 장면 학습 목표 |
| `previousCharacterMessage` | string \| null | Y | 직전 캐릭터 대사 |
| `childUtterance` | string | Y | STT 확인을 마친 최신 아이 발화 한 건 |
| `targetElements` | string[] | Y | 이번 장면의 `required_elements` |
| `elementCriteria` | object | Y | 요소별 장면 인정 기준 |

```json
{
  "sceneContext": "장면 설명과 캐릭터 갈등을 합친 텍스트",
  "goal": "장면 학습 목표",
  "previousCharacterMessage": "직전 캐릭터 대사 또는 null",
  "childUtterance": "아이의 최신 확정 발화",
  "targetElements": ["PERSPECTIVE", "REASON", "SOLUTION"],
  "elementCriteria": {
    "PERSPECTIVE": "장면별 관점 인정 기준",
    "REASON": "장면별 이유 인정 기준",
    "SOLUTION": "장면별 해결 방법 인정 기준"
  }
}
```

**Response (200)**

```json
{
  "childIntent": "REASONING",
  "mainPoint": "아이 발화의 핵심 의미 또는 null",
  "detectedElements": [
    { "type": "PERSPECTIVE", "evidence": "아이 발화에 실제 존재하는 연속 문자열" }
  ],
  "utteranceValidity": "VALID"
}
```

- `mainPoint` 키는 항상 포함하되, `SHORT`·`UNCLEAR`·`OFF_TOPIC`·`PLAYFUL`이면 `null`이다.
- 위 네 유효성 값이면 `detectedElements`는 반드시 빈 배열이다.
- 위 네 유효성 값의 `childIntent`는 각각 `SHORT_RESPONSE`, `UNCLEAR`, `OFF_TOPIC`, `PLAYFUL`로
  정규화된다. 백엔드는 의도와 유효성이 엇갈리는 결과를 누적·반응 매핑에 쓰지 않는다.
- 백엔드는 `evidence` 원문 대조, 중복 제거, 허용 요소 확인 후에만 누적한다.
- 이야기 제목, 캐릭터 이름, 누적 요소, 턴 수는 분석 요청에 넣지 않는다.

### `POST {AI_SERVER_BASE_URL}/respond`

**Request**

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `characterName` | string | Y | 화면에 표시할 캐릭터 이름 |
| `characterPersona` | string | Y | 해당 장면의 고정 말투·걱정 설명 |
| `sceneContext` | string | Y | 현재 장면 문맥 |
| `previousCharacterMessage` | string | Y | 직전 캐릭터 대사 |
| `childUtterance` | string | Y | 최신 아이 발화 |
| `analysis` | object | Y | `childIntent`, `mainPoint`만 포함 |
| `responseMode` | `NORMAL` \| `GUIDED` | Y | 백엔드 규칙 엔진이 결정 |
| `reactionKey` | string | Y | 백엔드 반응 원칙 키 |
| `guidanceTarget` | string \| null | 조건부 | `GUIDED`일 때 필수 |
| `remainingWorry` | string \| null | 조건부 | `GUIDED`일 때 필수 |

```json
{
  "characterName": "며느리",
  "characterPersona": "조심스럽고 걱정이 많은 말투",
  "sceneContext": "현재 장면 설명과 갈등",
  "previousCharacterMessage": "직전 캐릭터 대사",
  "childUtterance": "아이 최신 발화",
  "analysis": { "childIntent": "OPINION", "mainPoint": null },
  "responseMode": "NORMAL",
  "reactionKey": "directResponse",
  "guidanceTarget": null,
  "remainingWorry": null
}
```

**Response (200)**

```json
{ "text": "캐릭터의 짧은 한 문장.", "characterState": "MOVED" }
```

- `CLOSING`은 이 엔드포인트로 보내지 않는다. 백엔드가 검수된 `character_closing`을 저장·재생한다.
- `detectedElements`, 누적 요소, 턴 수는 이 요청에 넣지 않는다.
- `mainPoint: null`이어도 호출 가능하며, AI는 아이 원문에 직접 반응한다.
- `characterState`는 `NEUTRAL`·`HAPPY`·`WORRIED`·`SURPRISED`·`MOVED` 중 하나를 항상 포함한다.
  이는 생성된 한 문장의 캐릭터 정서이며, 아이 발화의 채점·진행 상태가 아니다.

- `text`는 공백을 포함해 최대 100자이며, 줄바꿈 없이 마침표(`.`)·물음표(`?`)·느낌표(`!`)로 끝나는 완결된 한국어 한 문장이다. AI 생성 목표는 32~36자다. 백엔드는 이 값을 자르지 않고 그대로 저장·전달한다.

### `GET {AI_SERVER_BASE_URL}/health`

인증 없이 상태 확인에만 사용한다.

```json
{
  "status": "ok",
  "model": "gpt-5-mini",
  "promptVersions": { "analyze": "analyze_v3", "respond": "respond_v5" }
}
```

## 데이터 모델

새 테이블이나 AI 서버의 DB 접근은 필요 없다. 기존 `story_scenes`의
`scene_description`, `conflict`, `scene_goal`, `required_elements`, `element_criteria`,
`character_closing`과 세션 상태를 백엔드가 사용한다.

## 제약 조건

- 인증: 내부 토큰 필수(`/health` 제외). API 키는 브라우저·프론트·Git에 넣지 않는다.
- 응답 시간: `/analyze`, `/respond` 각각 최대 5초. SDK·백엔드 재시도는 각각 0회.
- 모델: `gpt-5-mini`, Responses API 구조화 출력, `store=false`.
- 실패: 분석 실패는 빈 분석으로 진행한다. 응답 실패 시 백엔드는 현재 운영 규칙(D-03)에 따라 검수된 `character_closing`으로 장면을 이어서 종료한다. AI 서버는 장면 종료나 재시도를 수행하지 않는다.
- 이미지: 서버는 정적 이미지 URL만 내려준다. AI 서버는 이미지 생성·업로드·파일 경로 선택을 하지 않으며,
  `/respond`의 `characterState` enum만 반환한다.

## 완료 조건

- [ ] 백엔드가 위 두 엔드포인트를 내부 토큰으로 호출한다.
- [ ] `mainPoint: null`과 저정보 발화의 빈 요소 배열을 수용한다.
- [ ] evidence 검증·누적·턴/모드/미션/종료 판단이 백엔드 규칙 엔진에만 있다.
- [ ] `CLOSING`에서 `/respond`를 호출하지 않고 고정 마지막 대사를 사용한다.
- [ ] AI 5xx·504에도 백엔드가 검수된 폴백 대사로 무한 로딩 없이 진행한다.
