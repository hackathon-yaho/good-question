# API 계약

| 항목 | 내용 |
| --- | --- |
| 작성일 | 2026-08-10 |
| 최종 수정 | 2026-08-13 |
| 기준 문서 | [../product/prd.md](../product/prd.md), [screens.md](screens.md) 5장, [../team/roles.md](../team/roles.md) 4장 |

## 수정 이력

### 2026-08-13 — 메시지 히스토리에 characterDisplayName 추가

근거: [request/backend/message-character.md](../request/backend/message-character.md), [backend/docs/decisions.md D-31](../../backend/docs/decisions.md)

| 절 | 변경 |
| --- | --- |
| 3.4 | `GET /api/sessions/{sessionId}`의 `messages[]` 각 항목에 `characterDisplayName` 신규 — 그 메시지가 속한 장면의 캐릭터 표시명(`child` 발화에도 채움, 대화 상대 의미). 같은 캐릭터가 여러 장면에 재등장해도(며느리 — 장면3·9) 실제 장면 기준으로 채워짐 |

### 2026-08-13 — 미션 체크리스트 항목 단위 진행 필드 추가

근거: [request/backend/mission-progress.md](../request/backend/mission-progress.md), [backend/docs/decisions.md D-30](../../backend/docs/decisions.md)

| 절 | 변경 |
| --- | --- |
| 3.5 | `POST /messages` 응답에 `missionProgress` 신규 — `{ missionId, satisfiedIndexes }`. 체크리스트에 같은 사고 요소가 반복돼도(미션1의 1·2번) 항목 단위로 순서대로 채워진다. 미션 노출 전·`CLOSING`이면 `null` |

### 2026-08-13 — O-12 캐릭터 마음 변화 필드 추가

근거: [request/ai/story-image-assets.md](../request/ai/story-image-assets.md), [backend/docs/decisions.md D-27](../../backend/docs/decisions.md)

| 절 | 변경 |
| --- | --- |
| 3.5 | `POST /messages` 응답에 `characterState` 신규 — 대화 중 캐릭터 이미지 전환용 상태값(5종), AI가 판단해 내려줌. `CLOSING`이면 `null` |

### 2026-08-13 — 프론트 통합 검증 결과 반영 (TTS 계약 정정)

근거: [request/backend/tts-audio-contract.md](../request/backend/tts-audio-contract.md), [backend/docs/decisions.md D-26](../../backend/docs/decisions.md)

| 절 | 변경 |
| --- | --- |
| 3.5 | `POST /messages` 응답 필드명 `characterMessageId` → `messageId` 정정 (프론트가 이미 이 이름으로 구현·검증) |
| 3.5 | `GET /api/tts`에 `?text=` 경로 추가 — `messageId`가 없는 내레이션·단어 발음용 |

### 2026-08-12 — 백엔드 결정 반영

근거: [backend/docs/decisions.md](../../backend/docs/decisions.md)

| 절 | 변경 |
| --- | --- |
| 1 | **STT/TTS 2안 확정** (OpenAI, 백엔드 처리). 선결 과제 해소 (D-01) |
| 2.5 | 타임아웃 확정값 기재 (D-03) |
| 3.2 | `children.avatar_id` 컬럼 추가 확정 (D-08) |
| 3.3 | `stories.situation` · `child_role` 컬럼 추가 확정 (D-07) |
| **3.5** | **발화 전송을 요청 3개로 분리.** `POST /api/stt` · `GET /api/tts` 신규 (D-02) |
| 3.6 | 카드 재시도 3회 제한, 3회째 `correctOrder` 공개 (D-10) |
| 3.7 | `highlightWords`는 장면별 후보 단어가 실제 대사에 있을 때만 채워짐, `wordbook` API 3개 구현 완료 (D-11 · D-22) |
| 3.8 | 보호자 리포트 3개 엔드포인트 응답 형태 확정 (프론트 mock 그대로 반영) |
| 3.9 | 마이페이지 구현 완료 — 문서 전체 점검 중 Phase 추적에서 빠져 있던 걸 발견 (D-25) |
| 4.3 | 타임아웃·재시도·실패 동작 확정 (D-03) |
| 5 | 미결 항목 갱신 |

> ⚠️ **2안 확정으로 이 문서의 "1안 기준" 전제가 바뀌었습니다.** 3.5절을 먼저 읽으세요.
> 프론트 관점 정리는 [request/frontend/stt-tts-integration.md](../request/frontend/stt-tts-integration.md)에 있습니다.

## 0. 이 문서의 신뢰도

항목별로 근거가 다릅니다. 표기를 확인하고 쓰세요.

| 표기 | 의미 |
| --- | --- |
| ✅ **확정** | 팀 문서에 명시된 계약. 그대로 구현 |
| 🟡 **제안** | 팀 문서가 구조는 정했으나 필드명·형태가 미확정. 백엔드↔프론트/AI 합의 필요 |
| ⚪ **초안** | 팀 문서에 없어 PRD에서 역산. 논의 시작점 |

- **프론트↔백엔드**: [화면 명세 5장](screens.md)이 발화 전송·세션 조회·후속 활동을 확정했습니다. 나머지 엔드포인트는 각 화면의 `연동` 항목에서 경로만 나와 있어 요청·응답 스키마는 초안입니다.
- **백엔드↔AI**: [작업 분장 4.1 · 4.2](../team/roles.md)가 두 엔드포인트의 입력·출력을 확정했습니다. 다만 작업분장 스스로 "필드명과 구조는 백엔드와 합의한 뒤 확정한다"고 밝혔으므로, **허용 값 목록만 변경 불가**이고 필드명은 조정 가능합니다. 경로·타임아웃·인증·실패 처리는 [작업 분장 5장](../team/roles.md)이 "정해야 할 것"으로 남겨둔 미결 항목입니다.

---

## 1. STT/TTS 방식 — ✅ 확정 (2안)

**2026-08-12, 2안(OpenAI)으로 재확정되었습니다.** STT는 Whisper, TTS는 OpenAI TTS이며
**둘 다 백엔드가 호출합니다.** ([D-01](../../backend/docs/decisions.md))

| | 1안. Web Speech API | **2안. OpenAI (확정)** |
| --- | --- | --- |
| STT | 브라우저 `SpeechRecognition` | **백엔드** (Whisper) |
| TTS | 브라우저 `SpeechSynthesis` | **백엔드** (OpenAI TTS) |
| iPad (지원 기기 1순위) | ⚠️ iOS Safari 불안정 | ✅ 안정 |
| D-5 키워드 실시간 점등 | 가능 | ❌ **불가 → 최종 결과 일괄 점등 폴백** |

**결정 이유**: MVP 지원 기기 1순위가 iPad인데 1안은 iOS Safari에서 불안정합니다
([PRD 9.3](../product/prd.md)). D-5 폴백을 감수하고 시연 안정성을 택했습니다.

> ⚠️ **본 문서의 나머지 절은 1안 기준으로 쓰였습니다.** 3.5절만 2안으로 갱신되어 있으며,
> 다른 절에 남아 있는 "2안 변경점" 표기는 이제 **본문이 아니라 확정 사항**입니다.

**이 결정으로 해소된 항목**: [open-questions Q-16(=B-1)](../open-questions.md)

> ⚠️ **2026-08-10에는 1안(Web Speech API)으로 결정했었고, 프론트는 그 결정에 따라
> 이미 구현까지 마쳤습니다** (발화 전송 `application/json` 텍스트만, TTS는 프론트
> `SpeechSynthesis` 재생, STT는 프론트 담당, D-5 키워드 실시간 점등을 interim result로
> 완전 구현). **2026-08-12에 iPad 안정성 문제로 2안으로 뒤집혔으며, 프론트의 기존 구현은
> 재작업이 필요합니다.**

---

## 2. 공통 규약

### 2.1 Base URL

| 환경 | 프론트 | 백엔드 | AI 서버 |
| --- | --- | --- | --- |
| 로컬 | `http://localhost:3000` | `http://localhost:8080` | `http://localhost:8000` |
| 배포 | Vercel | Render | (미정) |

- 프론트→백엔드 경로 접두사: `/api`
- 백엔드→AI 서버: 내부 호출, 접두사 없음

### 2.2 인증

```http
Authorization: Bearer <accessToken>
```

AI 서버는 백엔드만 호출하므로 공개 노출하지 않습니다. 노출이 불가피하면 공유 시크릿 헤더를 둡니다.

```http
X-Internal-Token: <shared-secret>
```

### 2.3 응답 포맷 ⚪

성공 시 데이터를 그대로 반환합니다. 별도 래퍼를 두지 않습니다.

실패 시:

```json
{
  "code": "CONSENT_REQUIRED",
  "message": "아동 개인정보 처리 동의가 필요합니다."
}
```

| 상태 코드 | `code` | 상황 | 프론트 처리 |
| --- | --- | --- | --- |
| 400 | `INVALID_REQUEST` | 필수 파라미터 누락·형식 오류 | |
| 401 | `UNAUTHORIZED` | 토큰 없음·만료 | `/login` |
| 403 | `FORBIDDEN` | 다른 보호자의 아이·세션 접근 | |
| 403 | `CONSENT_REQUIRED` | 동의 없거나 철회된 아이로 세션 시작 | B-3 진행 불가 안내 |
| 404 | `NOT_FOUND` | 대상 없음 | |
| 409 | `CHILD_LIMIT_EXCEEDED` | 계정당 아이 3명 초과 | A-4 토스트 |
| 409 | `SCENE_ALREADY_CLOSED` | 종료된 장면에 발화 제출 | |
| 422 | `STT_EMPTY` | 확정 텍스트 없음 (메시지 생성하지 않음) | I-2 |
| 5xx / 타임아웃 | — | 서버 오류 | I-3 |

### 2.4 명명 규칙

- JSON 필드는 `camelCase` (DB 컬럼은 `snake_case`)
- 열거값(`NORMAL`, `PERSPECTIVE` 등)은 PRD 정의 그대로 대문자 유지
- 일시는 ISO-8601 (`2026-08-10T13:34:00+09:00`)

### 2.5 타임아웃 ✅ 확정

[D-03](../../backend/docs/decisions.md)에서 확정되었습니다.

| 구간 | 값 | 재시도 |
| --- | --- | --- |
| 프론트 → 백엔드 | 15초 (**실측 후 재검토**) | — |
| 백엔드 → AI `/analyze` | **5초** | 0회 |
| 백엔드 → AI `/respond` | **5초** | 0회 |
| 백엔드 → Whisper | **8초** | 0회 |

재시도를 두지 않는 이유: 한 턴에 AI 호출이 2회라 재시도 여유가 없습니다.

**요청 분리로 15초 예산 안에 들어갑니다.** 3.5절에서 발화 1회를 요청 3개로 나눈 결과,
각 구간이 8초 / 10초로 줄었습니다. 한 요청에 합치면 18초로 초과합니다.

**실패 시 동작** ([D-03](../../backend/docs/decisions.md))

| 실패 지점 | 백엔드 동작 |
| --- | --- |
| `/analyze` | 빈 분석(`detectedElements: []`, `utteranceValidity: UNCLEAR`)으로 **정상 진행** |
| `/respond` | `character_closing`을 조회해 **장면 종료**, 다음 장면으로 |

**어느 쪽도 에러를 프론트로 올리지 않습니다.** AI가 죽어도 아이 화면에서는 이야기가 계속됩니다.

**슬립 방지**: 외부 크론 10분 핑 + 헬스체크에 `SELECT 1` 포함.
Render 콜드 스타트와 Supabase 일시정지를 한 번에 막습니다.

---

## 3. 프론트엔드 ↔ 백엔드

화면 ID는 [screens.md](screens.md)를 참조하세요.

### 3.1 인증·계정 ✅ 확정 (2026-08-12, 리다이렉트 방식으로 변경)

> ⚠️ **`POST /api/auth/{provider}` 계약을 폐기합니다.** 프론트가 카카오 SDK로 code를
> 받아 백엔드에 전달하는 방식이 아니라, **백엔드가 카카오 로그인 전 과정을 처리하는
> 리다이렉트 방식**(Spring Security `oauth2Login`)으로 확정되었습니다.
> 근거·비교는 [backend/docs/decisions.md](../../backend/docs/decisions.md) D-18 참조.

**로그인 흐름**

```
1. 프론트   window.location.href = "{백엔드}/api/oauth2/authorization/kakao"
2. 백엔드   302 → 카카오 로그인 페이지 (Spring Security가 자동 처리)
3. 카카오   302 → {백엔드}/api/login/oauth2/code/kakao?code=...
4. 백엔드   parents 조회/생성 → JWT를 HttpOnly 쿠키로 설정
5. 백엔드   302 → {프론트}/auth/callback?hasCompletedOnboarding=false
6. 프론트   쿠키는 이미 세팅됨. 쿼리의 hasCompletedOnboarding으로 즉시 분기
```

`hasCompletedOnboarding`은 [화면 명세 A-2](screens.md)의 분기 판단에 쓰입니다.
`false` → `/onboarding/consent`, `true` → `/profiles`. **아이 등록 여부(`children` 존재)로 계산**하며
별도 컬럼이 아닙니다.

**프론트가 직접 호출하는 엔드포인트가 없습니다** — 1번의 URL 이동이 전부입니다.
이후 요청은 브라우저가 쿠키를 자동으로 실어 보냅니다(`credentials: 'include'` 필요).

#### `GET /api/auth/me` ✅ · 로그인 확인

```json
{ "id": "uuid", "name": "이혜민", "email": null, "hasCompletedOnboarding": false }
```

- 인증 안 됨 → 401 `UNAUTHORIZED`
- `email`은 **nullable**입니다. 카카오 이메일 동의항목이 선택 동의라 아이 없이도 로그인은 됩니다

`provider`는 **`kakao`만** 구현합니다 (2026-08-10 확정, [Q-02](../open-questions.md)).
프론트는 A-2에 카카오 버튼 하나만 렌더합니다.

#### `POST /api/auth/logout` ✅

쿠키를 삭제합니다. 응답 바디 없음.

#### 개발용 — `POST /api/auth/dev-login` ⚠️ 시연 배포 전 제거

카카오 앱 등록 전에 다른 파트가 인증 때문에 막히지 않도록 만든 우회 경로입니다.
`?name=` 쿼리로 이름을 받고, 없으면 고정된 dev parent를 재사용합니다(호출할 때마다 새로 안 만듦).

```json
{ "parentId": "uuid", "accessToken": "eyJ..." }
```

쿠키도 같이 설정됩니다. Postman/curl 등에서는 `Authorization: Bearer {accessToken}` 헤더로도
인증할 수 있습니다 — 모든 인증 필요 엔드포인트가 쿠키/헤더 둘 다 받습니다.

### 3.2 아이 프로필

#### `GET /api/children` 🟡 · A-5, H-2

```json
{
  "children": [
    {
      "id": "uuid",
      "name": "민준",
      "birthYear": 2018,
      "age": 8,
      "avatarId": "fox",
      "consentGranted": true,
      "lastActivityAt": "2026-08-09T20:11:00+09:00",
      "registeredAt": "2026-08-01T10:00:00+09:00"
    }
  ],
  "limit": 3
}
```

| 필드 | 비고 |
| --- | --- |
| `age` | 서버가 `현재 연도 - birthYear`로 계산. 연도 기준 연령 ([PRD I-11](../product/prd.md)) |
| `avatarId` | ✅ `children.avatar_id varchar` nullable 추가 확정 ([D-08](../../backend/docs/decisions.md)). **백엔드는 값을 검증하지 않습니다** — 아바타 6종 목록이 문서에 없기 때문 |
| `consentGranted` | `false`면 세션 시작 불가. 프론트는 동의 화면으로 유도 |
| `lastActivityAt` | A-5 "최근 활동" 상대 표기용 |
| `registeredAt` | H-2 "YYYY.MM.DD 등록" 표기용 |

#### `POST /api/children` ✅ · A-4

[화면 명세 A-4](screens.md)에 확정된 형태입니다. 동의 값을 아이 등록과 **한 번에** 보냅니다.

```json
{
  "name": "민준",
  "birthYear": 2018,
  "avatarId": "fox",
  "consents": {
    "termsOfService": true,
    "privacyPolicy": true,
    "childDataProcessing": true,
    "marketing": false
  }
}
```

→ `children` 레코드 + `child_consents` 레코드 **동시 생성**
(`consent_version = 'mvp_v1'`, `verification_method = 'authenticated_parent'`)

**Response 201** — `GET /api/children`의 배열 요소와 동일 형태
**Error** — 409 `CHILD_LIMIT_EXCEEDED` (최대 3명, [PRD I-09](../product/prd.md))

> `child_consents`는 `child_id`가 필요하므로 A-3에서 레코드를 만들 수 없습니다.
> A-3의 동의 값을 클라이언트에 임시 보관했다가 여기서 함께 전송합니다.
>
> 동의는 **아이 한 명당 한 건**입니다. 그래서 A-5 "+ 아이 추가"도 A-3을 먼저 거칩니다.
> 이 엔드포인트는 `consents` 필수 3개가 `true`가 아니면 403 `CONSENT_REQUIRED`로 거절해야 합니다.
> → [Q-21](../open-questions.md)

#### `PATCH /api/children/{childId}` ⚪ · H-2

```json
{ "name": "민준", "avatarId": "rabbit" }
```

#### `DELETE /api/children/{childId}` ✅ · H-6

연관 `story_sessions`, `messages`, `wordbook` 캐스케이드 삭제.

### 3.3 홈·탐색

#### `GET /api/home?childId={childId}` 🟡 · B-1

```json
{
  "child": { "id": "uuid", "name": "민준", "avatarId": "fox" },
  "inProgress": {
    "sessionId": "uuid",
    "storyId": "uuid",
    "storyTitle": "방귀 뀌는 며느리",
    "coverImageUrl": "...",
    "currentSceneOrder": 5,
    "sceneProgress": { "current": 2, "total": 4 },
    "lastActivityAt": "2026-08-09T20:11:00+09:00"
  },
  "recommended": [
    { "id": "uuid", "title": "방귀 뀌는 며느리", "coverImageUrl": "...", "estimatedMinutes": 20, "topics": ["다름"] }
  ]
}
```

- 진행 중 세션이 없으면 `inProgress`는 `null`. 프론트는 그 자리에 "오늘의 이야기" 단일 카드를 대체 배치합니다 (빈 영역 금지)
- 이어하기 세션이 여러 개면 `last_activity_at` 최신 1건만 내려줍니다
- `recommended`는 추천 로직 없이 `status = published` 목록을 그대로 내려줍니다 ([PRD F-02](../product/prd.md))
- `sceneProgress`는 **화면 단위**(4구간) 진행바용입니다. `currentSceneOrder`(DB 1~9)와 분모가 다릅니다 → [Q-10](../open-questions.md)

#### `GET /api/stories?childId={id}&topic={topic}` 🟡 · B-2

```json
{
  "stories": [
    {
      "id": "uuid",
      "title": "방귀 뀌는 며느리",
      "summary": "큰 방귀를 부끄러워하던 며느리가 자신의 다름을 장점으로 바꾸는 이야기",
      "coverImageUrl": "...",
      "estimatedMinutes": 20,
      "difficulty": "보통",
      "topics": ["다름", "자기이해", "장점 발견"],
      "sessionStatus": "in_progress"
    }
  ],
  "availableTopics": ["다름", "자기이해", "장점 발견"]
}
```

`sessionStatus`는 해당 아이의 세션 상태입니다(`null` / `in_progress` / `post_activity` / `completed` / `stopped`). B-2 상태 배지에 씁니다. `childId`가 필요한 이유가 이것입니다.

#### `GET /api/stories/{storyId}?childId={id}` 🟡 · B-3

```json
{
  "id": "uuid",
  "title": "방귀 뀌는 며느리",
  "summary": "...",
  "coverImageUrl": "...",
  "estimatedMinutes": 20,
  "difficulty": "보통",
  "topics": ["다름", "자기이해", "장점 발견"],
  "intro": "옛날 어느 마을에 방귀를 아주 크게 뀌는 며느리가 살았습니다. …",
  "situation": "큰 방귀 때문에 며느리가 집에서 쫓겨날 위기에 놓였어요.",
  "childRole": "며느리의 방귀가 특별한 장점이 될 수 있도록 도와주세요.",
  "characters": [
    { "name": "ch_banggui_daughter_in_law", "displayName": "방귀쟁이 며느리", "imageUrl": "..." }
  ],
  "existingSession": { "sessionId": "uuid", "currentSceneOrder": 5, "status": "in_progress" }
}
```

| 필드 | 근거 |
| --- | --- |
| `intro` | 도입 장면의 `scene_description` |
| `situation` | ✅ `stories.situation varchar` 컬럼 추가 확정 ([D-07](../../backend/docs/decisions.md)). **`conflict`를 쓰지 않습니다** — `conflict`는 장면별 캐릭터 딜레마이고 분석 LLM 입력용입니다 |
| `childRole` | ✅ `stories.child_role varchar` 컬럼 추가 확정. [PRD F-03](../product/prd.md) 문구 저장 |
| `characters` | `story_scenes.character_name` distinct + 표시명 매핑 ([PRD I-13](../product/prd.md)) |
| `existingSession` | 있으면 프론트가 B-4 모달을 띄웁니다. 없으면 `null` |

### 3.4 세션

#### `POST /api/sessions` ✅ · B-3, B-4

```json
{ "childId": "uuid", "storyId": "uuid", "restart": false }
```

`restart: true`면 기존 세션을 `stopped`로 바꾸고 새 세션을 만듭니다 (B-4 "처음부터 하기").
**기존 `messages`는 삭제하지 않습니다.** 기록은 보존하고 세션만 새로 생성합니다.

**Response 201** — `GET /api/sessions/{sessionId}`와 동일 형태
**Error** — 403 `CONSENT_REQUIRED`

#### `GET /api/sessions/{sessionId}` ✅ · C 전체 (이어하기 복원)

[화면 명세 5-2](screens.md)에 확정된 형태입니다.

```json
{
  "sessionId": "ss01...",
  "storyId": "s01...",
  "status": "in_progress",
  "currentSceneId": "sc02...",
  "currentSceneOrder": 2,
  "totalScenes": 4,
  "turnCount": 2,
  "maxTurns": 6,
  "accumulatedElements": ["PERSPECTIVE"],
  "messages": [ /* 지금까지의 대화 */ ]
}
```

프론트가 화면을 복원하려면 아래가 더 필요합니다 (🟡 추가 제안):

```json
{
  "currentScene": {
    "sceneId": "sc02...",
    "sceneOrder": 2,
    "sceneType": "narrative",
    "sceneDescription": "그래서 며느리는 방귀가 나오려고 할 때마다 …",
    "characterName": null,
    "characterDisplayName": null,
    "characterImageUrl": null,
    "backgroundImageUrl": "...",
    "sceneClosed": false,
    "missionRevealed": false
  }
}
```

| 필드 | 이유 |
| --- | --- |
| `sceneType` | `intro` / `narrative` / `dialogue`. C-1 / C-2 / C-3 중 어느 상태로 복원할지 결정 |
| `sceneDescription` | `narrative`일 때 좌측 자막에 필요 |
| `characterDisplayName` | `character_name`은 식별자이므로 표시명이 별도로 필요 ([PRD I-13](../product/prd.md)) |
| `missionRevealed` | 미션을 이미 노출했는지. 재진입 시 중복 노출 방지 |

`messages` 요소 형태 (🟡):

```json
{
  "id": "m01...",
  "sceneId": "sc02...",
  "speakerType": "child",
  "turnOrder": 5,
  "text": "며느리가 창피해서 계속 참았던 것 같아요.",
  "createdAt": "..."
}
```

`speakerType`이 `system`인 메시지는 미션 노출 기록입니다 ([PRD 7.6](../product/prd.md)). 대화 히스토리에 표시하지 않습니다.

> **아이 이름 치환은 백엔드에서 처리해 내려줍니다.** 화면·TTS·AI 입력 텍스트를 일치시키기 위함입니다.
> ([작업 분장 3.10](../team/roles.md))

#### `POST /api/sessions/{sessionId}/scenes/{sceneId}/complete` ⚪ · C-1, C-2 → C-3

> 🟡 **프론트 제안**: `nextScene`에 `highlightWords`를 추가해 주세요.
> 장면의 **첫 대사**가 어려운 낱말이 가장 많이 나오는 자리인데, 지금 계약에는
> 밑줄 단어를 실어 보낼 곳이 `POST .../messages` 응답뿐입니다. 그러면 첫 대사에는
> 밑줄이 붙지 않아 C-9(단어 뜻 팝업)로 갈 통로가 사실상 닫힙니다.

도입·전개 장면(`intro` / `narrative`) 재생 완료를 알리고 다음 장면으로 진행합니다.

```json
{
  "nextScene": {
    "sceneId": "sc03...",
    "sceneOrder": 3,
    "sceneType": "dialogue",
    "characterName": "ch_banggui_daughter_in_law",
    "characterDisplayName": "방귀쟁이 며느리",
    "characterImageUrl": "...",
    "maxTurns": 4,
    "openingMessage": {
      "id": "m02...",
      "speakerType": "character",
      "turnOrder": 2,
      "text": "민준아, 내 방귀가 너무 크다는 걸 알면 가족들이 나를 이상하게 생각하지 않을까?"
    }
  }
}
```

`dialogue` 장면으로 진입하면 백엔드가 `character_opening`을 `messages`에 저장한 뒤 함께 내려줍니다. ([PRD 6.2](../product/prd.md) 단계 1~2)

#### `PATCH /api/sessions/{sessionId}` ⚪ · C-13 "이야기 나가기"

```json
{ "status": "stopped" }
```

### 3.5 발화 전송 — 핵심 흐름 ✅

**2안 확정으로 발화 1회가 요청 3개로 나뉩니다.** ([D-02](../../backend/docs/decisions.md))

```
1. 캐릭터 대사 재생          ── ③ GET /api/tts 로 받은 오디오
2. 재생 종료 → 마이크 자동 활성화
3. 아이가 말함, 녹음
4. 녹음 종료 → 오디오 업로드  ── ① POST /api/stt          (최대 8초)
5. 변환 텍스트 화면 표시 → 아이가 확인·수정                 ← 요청이 갈리는 지점
6. [보내기] 클릭             ── ② POST /messages          (최대 10초)
7. 캐릭터 대사 말풍선 즉시 표시
8. 대사 오디오 요청·재생     ── ③ GET /api/tts
```

**①과 ②를 합칠 수 없습니다.** [PRD F-05](../product/prd.md)가 *"변환된 텍스트를 화면에 표시"* 하고
*"보내기 버튼을 눌러 제출"* 하도록 요구하므로, 아이의 확인 동작이 중간에 들어갑니다.
합치면 확인 단계가 사라져 요건을 못 맞춥니다.

**부수 효과** — [Q-09(빈 발화)](../open-questions.md)가 해소됩니다. STT 결과가 비면 ①에서 끝나고
②를 호출하지 않으므로, `messages`에 빈 `text`가 들어갈 경로 자체가 없어집니다.

---

#### ① `POST /api/stt` ✅ · C-4 → C-5

`multipart/form-data` — `audio` 파트에 녹음 파일.
브라우저 기본 포맷 그대로 받습니다 (Chrome `webm` / iOS Safari `mp4`).

**Response 200**

```json
{ "text": "며느리가 창피해서 계속 참았던 것 같아요." }
```

- 인식 결과가 없으면 `text`는 빈 문자열입니다. **프론트는 이때 `/messages`를 호출하지 않습니다** → I-2
- **원본 음성은 저장하지 않습니다.** 메모리 처리 후 즉시 폐기 ([PRD 10.3](../product/prd.md))
- 타임아웃 8초

---

#### ② `POST /api/sessions/{sessionId}/messages` · C-5 "보내기"

[화면 명세 5-1](screens.md)에 확정된 형태이며 **텍스트를 받습니다** (오디오 아님).
백엔드는 이 한 번의 요청 안에서
`저장 → 분석 LLM → 후처리 → 진행 판단 → 캐릭터 LLM → 상태 갱신`을 모두 수행합니다.

**Request**

```json
{
  "text": "괜찮아요. 아프면 참지 말고 말하는 게 좋아요.",
  "sttRawText": "괜찮아요 아프면 참지말고 말하는게 좋아요"
}
```

| 필드 | 필수 | 설명 |
| --- | --- | --- |
| `text` | Y | 아이가 화면에서 확인·수정한 **확정 텍스트** |
| `sttRawText` | 선택 | STT 최초 변환 결과. 원문 보존용 |

- C-5에서 편집한 경우 `text`에 편집본, `sttRawText`에 원본이 들어갑니다
- `text`가 비면 메시지를 생성하지 않고 422 `STT_EMPTY` → 프론트는 I-2 → [Q-09](../open-questions.md)
- `sceneId`는 서버가 세션의 `current_scene_id`로 판단합니다 (요청에 없음)

> ~~**2안 변경점**: `multipart/form-data`로 `audio` 파트를 받아 서버에서 STT를 수행합니다.~~
> **2026-08-12 폐기.** 오디오를 이 엔드포인트에 실으면 F-05의 "확인 후 보내기"가 사라집니다.
> STT는 위 ①번 `POST /api/stt`로 분리했습니다. ([D-02](../../backend/docs/decisions.md))

**Response 200**

```json
{
  "responseMode": "GUIDED",
  "characterMessage": "그렇구나… 그런데 내가 말하면 아버님이 어떤 마음이 되실까?",
  "characterName": "며느리",
  "accumulatedElements": ["EMOTION", "REASON"],
  "turnCount": 3,
  "maxTurns": 6,
  "sceneEnded": false,
  "nextSceneId": null,
  "missionTriggered": null,
  "highlightWords": [
    { "word": "구박", "meaning": "누군가를 못마땅해하며 자꾸 나무라는 것" }
  ],
  "messageId": "d82d423b-e4af-43c6-b99c-3b34e1941cfc",
  "characterState": "WORRIED"
}
```

| 필드 | 프론트 용도 |
| --- | --- |
| `responseMode` | `NORMAL`→C-3 / `GUIDED`→C-7 / `CLOSING`→C-12 ([화면 명세 C 공통 매핑표](screens.md)) |
| `characterMessage` | 말풍선 + TTS. `CLOSING`이면 LLM 생성이 아니라 `character_closing` 원문 ([PRD I-01](../product/prd.md)) |
| `characterName` | 표시명 |
| `accumulatedElements` | C-7·C-12 사고 요소 별 뱃지. §1-7 매핑으로 4그룹 변환해 표시 |
| `turnCount` / `maxTurns` | C-3 턴 카운터 "N / M" |
| `sceneEnded` | `true`면 `characterMessage` 재생 후 C-12로 |
| `nextSceneId` | `sceneEnded=true`일 때 채움. 마지막 장면이면 `null` → `/activity`로 |
| `missionTriggered` | 미션 노출 신호. 없으면 `null` |
| `highlightWords` | C-3 자막 밑줄 + C-9 단어 팝업. 장면별 후보 단어가 **이번 턴 `characterMessage`에 실제로 있을 때만** 채워진다. 없는 턴은 빈 배열 `[]` ([D-11](../../backend/docs/decisions.md) · [D-22](../../backend/docs/decisions.md)) |
| `messageId` | **신규.** ③ `GET /api/tts?messageId=` 호출에 사용 ([D-02](../../backend/docs/decisions.md)). 필드명 `characterMessageId`→`messageId` 정정은 [D-26](../../backend/docs/decisions.md) |
| `characterState` | **신규 (O-12).** 대화 중 캐릭터 이미지 전환용 상태값. AI가 대사 내용에 맞춰 판단해 내려줌. `NEUTRAL`/`HAPPY`/`WORRIED`/`SURPRISED`/`MOVED` 중 하나, `CLOSING`이면 항상 `null` ([D-27](../../backend/docs/decisions.md)). 상태별 캐릭터 이미지는 [request/ai/story-image-assets.md](../request/ai/story-image-assets.md) 도착 대기 중 |
| `missionProgress` | **신규.** 미션 체크리스트 항목 단위 진행(`{ missionId, satisfiedIndexes }`). 미션 노출 전이거나 `CLOSING`이면 `null` ([D-30](../../backend/docs/decisions.md), [request/backend/mission-progress.md](../request/backend/mission-progress.md)) |

**프론트가 하지 말아야 할 것**

- `responseMode`를 프론트에서 판단하지 않기
- `missingElements`를 화면에 노출하지 않기 (아이에게 "못한 것"으로 읽힘) — 그래서 응답에 넣지 않습니다
- 영문 사고 요소 코드를 아이 화면에 노출하지 않기

**`missionTriggered` 형태** 🟡

```json
{
  "missionTriggered": {
    "id": "mission_1",
    "title": "높은 배를 어떻게 딸까?",
    "checklist": [
      { "label": "무엇을 사용할까?", "element": "SOLUTION" },
      { "label": "사람들은 어디로 피할까?", "element": "SOLUTION" },
      { "label": "며느리에게 어떻게 부탁할까?", "element": "REQUEST" },
      { "label": "그러면 어떤 일이 생길까?", "element": "RESULT" }
    ]
  }
}
```

- 노출 판단은 **백엔드**가 합니다 ([작업 분장 3.7](../team/roles.md)). 프론트는 신호를 받아 표시만 합니다
- 중복 노출은 백엔드가 `speaker_type = system` 메시지로 막습니다
- `element`는 C-10 체크리스트 진행 표시용입니다. 아이 화면에 영문 코드를 노출하지 않습니다

> `maxTurns: 6`은 화면 명세의 예시값입니다. 실제 콘텐츠의 `max_turns`는 장면별로 4·5·5·4입니다.
> ([PRD 7.2](../product/prd.md))

---

#### ③ `GET /api/tts?messageId={id}` (또는 `?text={text}`) ✅ · C-3 음성 재생

캐릭터 대사·내레이션의 오디오를 반환합니다. 응답은 `audio/mpeg` 바이트입니다.

- **`messageId`**: `messages` 행으로 저장된 대사(캐릭터 응답, opening 등)
- **`text`**: `messages` 행이 없는 텍스트(도입·전개 내레이션, 단어 발음 등)에 사용. 캐시는
  어느 경로든 텍스트 해시 기준이라 동일 문장이면 같은 캐시를 씁니다 ([D-26](../../backend/docs/decisions.md))
- 둘 다 없으면 400 `INVALID_REQUEST`
- 캐시에 있으면 즉시, 없으면 생성 후 반환합니다
- **고정 대사 11건은 애플리케이션 기동 시 미리 생성**되어 거의 즉시 옵니다 ([D-05](../../backend/docs/decisions.md))
- 캐시는 `tts_cache` 테이블에 저장합니다. **파일시스템에 두지 않습니다** — Render 무료 티어는 재배포 시 초기화됩니다
- "다시 듣기"는 재요청 없이 프론트가 받은 오디오를 다시 재생하면 됩니다

**프리워밍 대상이 13건이 아니라 11건인 이유**

| 종류 | 건수 | 프리워밍 |
| --- | --- | --- |
| 도입·전개 내레이션 (`scene_description`) | 5 | ✅ |
| `character_closing` | 4 | ✅ |
| `character_opening` — 대화2·대화3 | 2 | ✅ |
| `character_opening` — 대화1·대화4 | 2 | ❌ 아이 이름이 들어가 아이마다 다름 |

제외된 2건은 첫 재생 시 생성해 캐시에 추가합니다.

> **프론트는 브라우저 `SpeechSynthesis`를 쓰지 않습니다.** 백엔드가 준 오디오를 재생합니다.

### 3.6 말하기 후 활동 ✅

#### `GET /api/sessions/{sessionId}/activity` 🟡 · D-2

카드를 무작위 순서로 내려줍니다. **`correctOrder`는 내려주지 않습니다.**

```json
{
  "cards": [
    { "id": "card_3", "text": "며느리의 방귀로 높은 배나무의 배가 우수수 떨어졌어요.", "imageUrl": "..." },
    { "id": "card_1", "text": "며느리는 방귀를 꾹 참고 또 참았어요.", "imageUrl": "..." },
    { "id": "card_4", "text": "시아버지가 며느리에게 미안하다고 말했어요.", "imageUrl": "..." },
    { "id": "card_2", "text": "며느리의 큰 방귀에 시아버지의 갓이 날아갔어요.", "imageUrl": "..." }
  ],
  "attemptCount": 0
}
```

> 셔플 순서를 서버가 고정해 내려줘야 합니다. 매 시도마다 다시 셔플하면 아이가 혼란스럽습니다.
> ([화면 명세 D-2 체크리스트](screens.md))

#### `POST /api/sessions/{sessionId}/activity/order` ✅ · D-2

```json
{ "submittedOrder": ["card_2", "card_1", "card_3", "card_4"] }
```

**Response 200**

```json
{ "isCorrect": false, "attemptCount": 2 }
```

정답일 때 🟡:

```json
{ "isCorrect": true, "attemptCount": 3, "retellingKeywords": ["며느리", "방귀", "배나무", "시아버지"] }
```

- **정답 판정은 서버가 합니다.** 프론트 판정을 허용하지 않습니다 ([PRD 8.11](../product/prd.md))
- ✅ **재시도 3회 제한 확정** ([D-10](../../backend/docs/decisions.md))

3회째 응답에는 `correctOrder`가 함께 실립니다.

```json
{
  "isCorrect": false,
  "attemptCount": 3,
  "correctOrder": ["card_1", "card_2", "card_3", "card_4"],
  "retellingKeywords": ["며느리", "방귀", "배나무", "시아버지"]
}
```

- 프론트는 정답 배치를 보여주고 **다음 단계로 넘깁니다.** 실패를 지적하지 않습니다 (D-3 원칙)
- 3회로 통과시켜도 서버는 `is_order_correct = false`로 저장합니다. 기록은 사실대로 남깁니다
- `GET /activity`의 "`correctOrder`를 내려주지 않는다"는 **처음에** 주지 말라는 뜻입니다

#### `POST /api/sessions/{sessionId}/activity/retelling` ✅ · D-6

```json
{ "retellingText": "옛날에 며느리가 방귀를 참았어요. ..." }
```

**Response 200** 🟡

```json
{
  "sessionStatus": "completed",
  "completedAt": "...",
  "stats": { "childUtteranceCount": 12, "characterCount": 3, "newWordCount": 2 },
  "reportAvailable": false
}
```

`stats`는 D-7 통계 카드 3개("말한 횟수 / 함께한 친구 / 새 단어")용입니다.
`reportAvailable`은 보호자 리포트(O-01) 구현 여부에 따릅니다.

### 3.7 단어장 (선택 · A-02) ✅ 백엔드 구현 완료 (2026-08-12)

| 엔드포인트 | 화면 | 비고 |
| --- | --- | --- |
| `GET /api/wordbook?childId={id}&filter={filter}` | E-1 | `filter`: `all` / `liked` / `story:{storyId}` |
| `POST /api/wordbook` | C-9 | `{ childId, word, meaning, sourceSceneId, contextSentence? }` |
| `PATCH /api/wordbook/{id}` | C-9, E-1 | `{ liked: true }` |

> ✅ **범위 확정 → 구현 완료** ([D-11](../../backend/docs/decisions.md) · [D-22](../../backend/docs/decisions.md)):
> `wordbook` 테이블 + API 3개를 후순위로 미뤘다가, `highlightWords`가 채워지게 되면서
> 진입점이 생겨 함께 구현했습니다.
>
> `highlightWords`(3.5 응답)는 **더 이상 항상 빈 배열이 아닙니다.** 장면별 후보 단어(팀
> 창작, 코드 상수)가 **그 턴 `characterMessage`에 실제로 포함될 때만** 채워집니다 — 안
> 나오는 턴은 여전히 빈 배열입니다. 위 표의 ①(장면별 고정 목록) 방식을 택했습니다.
>
> `POST /api/wordbook`의 `contextSentence`는 원안에 없던 **선택 필드**입니다. 저장 시점에
> 화면에 떠 있던 대사 원문을 서버가 역산할 방법이 없어(같은 장면도 세션·턴마다 캐릭터
> 대사가 다름) 프론트가 함께 보내야 합니다. 안 보내면 `null`로 저장됩니다.

**응답 형태 — 아래 그대로 구현했습니다** ✅

E-1·E-2·C-9를 그리려면 아래 필드가 필요합니다. 프론트가 2026-08-10에 목으로 먼저 구현해둔
형태이며, 타입은 `frontend/src/lib/api/types.ts`의 `WordEntry`입니다.

```json
{
  "words": [
    {
      "id": "uuid",
      "word": "창피한",
      "meaning": "남이 볼까 봐 부끄럽고 얼굴이 뜨거워지는 마음",
      "storyId": "uuid",
      "storyTitle": "방귀 뀌는 며느리",
      "sceneIndex": 2,
      "contextSentence": "아이고 이게 무슨 일이냐! … 이렇게 창피한 며느리와 함께 못살겠다!",
      "liked": false,
      "savedAt": "...",
      "isNew": true
    }
  ],
  "total": 1,
  "storyFilters": [{ "storyId": "uuid", "title": "방귀 뀌는 며느리" }]
}
```

| 필드 | 비고 |
| --- | --- |
| `sceneIndex` | 서버가 `sourceSceneId` → **화면 단위**(1~4) 인덱스로 변환. E-2 "장면 N에서 만났어요" |
| `contextSentence` | E-2·C-9 "이야기 속에서는" 카드. 담을 때의 대사 원문 |
| `isNew` | E-1 "새 단어" 칩. 서버가 기준(예: 24시간)을 정합니다 |
| `total` | 필터와 무관한 전체 개수. E-1 제목 옆 "N개" 칩 |

발음은 저장된 오디오가 아니라 **TTS**입니다. 오디오 URL을 내려줄 필요가 없습니다.

### 3.9 마이페이지 (선택) ✅ 구현 완료 (2026-08-12) · F-1

| 엔드포인트 | 화면 | 비고 |
| --- | --- | --- |
| `GET /api/mypage?childId={id}` | F-1 | 프로필 + 통계 3개 + 완료 이야기 + 재구성 발화 목록 |

```json
{
  "child": { "id": "uuid", "name": "민준", "avatarId": "fox", "age": 8 },
  "stats": { "completedStories": 1, "savedWords": 3, "activeDays": 2 },
  "completedStories": [
    { "sessionId": "uuid", "storyId": "uuid", "title": "방귀 뀌는 며느리", "coverImageUrl": "...", "completedAt": "..." }
  ],
  "retellings": [
    { "sessionId": "uuid", "storyTitle": "방귀 뀌는 며느리", "text": "며느리가 방귀를 참다가…", "createdAt": "..." }
  ]
}
```

- `retellings[].text`는 `post_activity_results.retelling_text`입니다. **오디오가 아닙니다.**
  F-1 "내 이야기 들어보기"는 이 텍스트를 TTS로 읽습니다 → [Q-07](../open-questions.md)
- `stats`에 점수·등급을 넣지 않습니다. 활동량만입니다 ([PRD 10.1](../product/prd.md))
- "별가루" 필드는 만들지 않습니다 → [Q-12](../open-questions.md)

### 3.8 보호자 (선택) ✅ 응답 형태 확정 (2026-08-12)

| 엔드포인트 | 화면 | 비고 |
| --- | --- | --- |
| `GET /api/parent/summary?childId={id}` | A-6 | 이번 주 횟수 / 완료 편수 / 평균 문장 수 |
| `GET /api/parent/reports?childId={id}` | G-1 | 리포트 목록 + 최근 4주 추이 |
| `GET /api/parent/reports/{sessionId}` | G-2~G-4 | 역량 분석 / 대표 발화 / 가정 가이드 |

> 아래 응답 형태는 프론트가 [리포트 가이드](../reference/guardian-report-guide.md) 기준으로 이미
> mock 구현해 둔 `frontend/src/lib/api/{types.ts, mock-parent.ts}`를 그대로 옮긴 것입니다.
> 필드명·구조를 새로 정의하지 않았습니다 — 백엔드는 이 mock의 계산 로직을 실제 DB
> (`messages`·`utterance_analyses`) 기준으로 옮기기만 하면 됩니다.

리포트 응답 설계 시 주의:

- **내부 분석 태그(`DECISION`, `REASON` 등)를 보호자 화면에 노출하지 않습니다.** API 레벨에서 사람이 읽는 문구로 변환해 내려줍니다 ([리포트 가이드 4절](../reference/guardian-report-guide.md))
- 점수·등급·백분위를 만들지 않습니다 ([리포트 가이드 8절](../reference/guardian-report-guide.md))
- **4점 dot 인디케이터는 넣지 않습니다.** 산출 기준이 없어 프론트가 2026-08-10에 스스로 뺐습니다 ([화면 명세 §7-2 #14](screens.md)). 대신 리포트 가이드 4절의 5단(역량명→특징→근거 발화→잘한 점→보완할 부분) 구조를 그대로 씁니다
- `trendMessage`는 **근거 없는 추세를 말하지 않습니다.** 실제로 발화 수가 늘었을 때만 문구를 채우고, 판단할 데이터가 없으면 `null`

#### `GET /api/parent/summary?childId={id}` · A-6

**Response 200**

```json
{
  "child": { "id": "uuid", "name": "민준", "avatarId": "fox", "age": 8 },
  "thisWeekCount": 2,
  "completedStories": 1,
  "avgChildSentences": 1.4,
  "hasRecords": true
}
```

| 필드 | 설명 |
| --- | --- |
| `thisWeekCount` | 최근 7일 이내 완료된 세션 수 |
| `avgChildSentences` | 아이 발화 1건당 평균 문장 수 (전체 세션 합산) |
| `hasRecords` | `false`면 화면은 "0" 대신 "아직 기록이 없어요"를 보여줍니다. 기록이 아예 없을 때 `0`을 늘어놓지 않기 위한 필드입니다 |

#### `GET /api/parent/reports?childId={id}` · G-1

**Response 200**

```json
{
  "children": [{ "id": "uuid", "name": "민준" }],
  "weeklyTrend": [
    { "weekLabel": "3주 전", "utteranceCount": 0 },
    { "weekLabel": "2주 전", "utteranceCount": 0 },
    { "weekLabel": "1주 전", "utteranceCount": 5 },
    { "weekLabel": "이번 주", "utteranceCount": 8 }
  ],
  "trendMessage": "말하기 문장 수가 늘고 있어요",
  "reports": [
    { "sessionId": "uuid", "storyTitle": "방귀 뀌는 며느리", "coverImageUrl": "...", "date": "2026.08.12", "status": "completed" }
  ]
}
```

| 필드 | 설명 |
| --- | --- |
| `children` | 이 보호자의 아이 전환 칩 목록 (`childId` 파라미터와 무관하게 전체) |
| `weeklyTrend` | 최근 4주, 주별 아이 발화 수. 오늘부터 7일 단위로 역산 |
| `trendMessage` | 직전 주보다 발화 수가 늘었을 때만 문구 제공. 판단 근거가 없으면 `null` |
| `reports` | 발화가 1건 이상 있는 세션만 (빈 세션은 목록에서 제외) |

#### `GET /api/parent/reports/{sessionId}` · G-2~G-4

**Response 200**

```json
{
  "sessionId": "uuid",
  "storyTitle": "방귀 뀌는 며느리",
  "date": "2026.08.12",
  "summary": "이번 이야기에서 아이가 18번 말했어요. 아래는 그 말들을 바탕으로 정리한 내용입니다.",
  "vocabulary": {
    "mainWords": ["며느리", "방귀", "창피해서", "배나무", "시아버지"],
    "repeated": ["방귀", "창피해서"],
    "feedback": "자주 쓴 말이 있어요. 비슷한 뜻의 다른 낱말도 함께 알려주면 표현이 넓어져요."
  },
  "competencies": [
    {
      "name": "관점과 공감",
      "feature": "다른 인물의 처지를 헤아려 말한 부분이 있었어요.",
      "evidence": "며느리가 속상했을 것 같아.",
      "strength": "상대가 왜 그렇게 느꼈을지 먼저 생각해 본 점이 좋았어요.",
      "next": "\"그 사람은 어떤 마음이었을까?\"처럼 상대의 입장을 묻는 질문을 해보세요."
    }
  ],
  "elementCounts": [
    { "label": "마음", "count": 3 },
    { "label": "이유", "count": 2 },
    { "label": "생각", "count": 4 },
    { "label": "방법", "count": 1 }
  ],
  "representative": {
    "text": "며느리가 속상했을 것 같아. 시아버지가 먼저 미안하다고 해야 해.",
    "sceneLabel": "장면 2",
    "reason": "생각과 그 까닭이 한 번에 이어져, 아이의 말하기 강점이 가장 잘 드러난 발화예요."
  },
  "guide": {
    "intro": "학습 과제가 아니라, 오늘 나눈 이야기를 자연스럽게 이어가기 위한 질문이에요.",
    "storyQuestions": [
      "시아버지는 처음에 왜 며느리를 집에서 내보내려고 했을까?",
      "시아버지는 며느리에게 어떤 말을 해주면 좋을까?"
    ],
    "dailyQuestions": [
      "친구가 자신의 특징 때문에 부끄러워한다면 어떤 기분일까?",
      "그 친구에게 어떤 말을 해주고 싶어?"
    ]
  }
}
```

| 필드 | 설명 |
| --- | --- |
| `vocabulary` | 리포트 가이드 3-1. `mainWords`(주요 어휘)·`repeated`(반복 표현)는 발화 원문에서 집계. 특징이 뚜렷하지 않아도 `feedback`은 항상 긍정적으로 |
| `competencies` | 리포트 가이드 3-2·3-3의 5개 역량(관점과 공감·감정 표현·상호작용·생각과 이유·결과와 해결)을 **항상 5개 모두** 반환 — 위 예시는 1개만 표기. `evidence`는 그 역량에 해당하는 사고 요소가 이번 세션에 있으면 실제 발화, 없으면 `null` |
| `elementCounts` | `accumulatedElements`를 §1-7과 같은 4그룹(마음/이유/생각/방법)으로 집계 |
| `representative` | 리포트 가이드 5절 — **1개만.** 화면 명세 G-3의 "카드 3개" 초안과 다릅니다 ([Q-08](../open-questions.md), 프론트가 가이드 기준으로 확정) |
| `guide.storyQuestions` / `dailyQuestions` | 리포트 가이드 6·7절의 질문 세트 중 이번 세션의 강점·보완점에 맞는 세트 1개를 선택해 반환 |
- 대표 발화는 가이드상 **1개**입니다. 화면 명세 G-3의 3개 카드와 다릅니다 → [Q-08](../open-questions.md)

---

## 4. 백엔드 ↔ AI 서버

설계 원칙 ([작업 분장 0장](../team/roles.md)):

- **AI 서버는 상태를 갖지 않고 DB에 접근하지 않습니다.**
- 백엔드가 매 호출마다 필요한 값을 전부 실어 보냅니다.
- AI 서버는 판단하지 않고 **제안만** 합니다. 모드·종료 확정은 백엔드 규칙 엔진이 합니다.

### 4.1 `POST /analyze` — 발화 분석 ✅

[작업 분장 4.1](../team/roles.md)에 확정된 형태입니다.

**Request**

```json
{
  "sceneContext": "그래서 며느리는 방귀가 나오려고 할 때마다 꾹꾹 참았습니다. … 참으면 몸이 점점 힘들어지지만, 사실을 말하면 가족들이 자신을 이상하게 볼까 봐 말하지 못하고 있다.",
  "goal": "방귀를 숨기고 싶어하는 며느리의 입장을 이해하고, 공감해주며 문제를 숨기지 않고 솔직하게 말할 수 있는 용기를 준다",
  "previousCharacterMessage": "민준아, 내 방귀가 너무 크다는 걸 알면 가족들이 나를 이상하게 생각하지 않을까?",
  "childUtterance": "며느리가 창피해서 계속 참았던 것 같아요.",
  "targetElements": ["PERSPECTIVE", "EMOTION", "REASON", "SOLUTION"],
  "elementCriteria": {
    "PERSPECTIVE": "며느리가 처한 상황이나 가족이 받아들일 방식을 며느리·가족 중 한쪽의 입장에서 헤아려 말한 경우",
    "EMOTION": "며느리 또는 아이 자신의 감정을 직접 가리키는 말을 한 경우. 감정어가 발화에 실제로 나타나야 함",
    "REASON": "말해야 한다 또는 말하지 않아도 된다는 판단의 까닭을 말한 경우. 당위만으로는 인정하지 않음",
    "SOLUTION": "며느리가 실제로 해볼 수 있는 행동을 말한 경우. 대상과 방법이 함께 드러나야 함"
  }
}
```

- `sceneContext` = `scene_description` + `conflict`
- **넣지 않는 값**: 이야기 제목, 캐릭터 이름, 누적 요소, 턴 카운트. 분석이 "지금 이 발화"만 보게 하는 의도적 설계입니다

**Response 200**

```json
{
  "childIntent": "PERSPECTIVE",
  "mainPoint": "며느리가 창피해서 참았던 것 같다",
  "detectedElements": [
    { "type": "PERSPECTIVE", "evidence": "창피해서 계속 참았던 것 같아요" }
  ],
  "utteranceValidity": "VALID"
}
```

**허용 값** (PRD 확정 — 변경 불가)

| 필드 | 허용 값 |
| --- | --- |
| `childIntent` | `QUESTION`, `OPINION`, `REASONING`, `SOLUTION`, `DECISION`, `PERSPECTIVE`, `EMOTION`, `REQUEST`, `CHALLENGE`, `PLAYFUL`, `OFF_TOPIC`, `SHORT_RESPONSE`, `UNCLEAR` |
| `detectedElements[].type` | `DECISION`, `REASON`, `PERSPECTIVE`, `SOLUTION`, `RESULT`, `EMOTION`, `EMPATHY`, `REQUEST` — 8개뿐 |
| `utteranceValidity` | `VALID`, `SHORT`, `UNCLEAR`, `OFF_TOPIC`, `PLAYFUL` |

**AI 측 필수 준수사항**

- `evidence`는 아이 발화에 **실제로 존재하는 문자열**이어야 합니다. 백엔드가 원문 대조하며 불일치 시 해당 요소를 폐기합니다. **요약하거나 다듬으면 결과가 통째로 사라집니다**
- 아이가 말하지 않은 이유·감정·의도를 추론해 추가하지 않습니다
- `targetElements`는 정답 목록이 아닙니다
- `elementCriteria`를 판정에 반드시 반영합니다
- 막연한 당위 표현("잘해줘야 해요", "그러면 안 돼요")은 요소로 인정하지 않습니다
- **JSON만 출력합니다.** 코드펜스나 설명 문장을 포함하지 않습니다

**백엔드 후처리** (LLM 미사용, [작업 분장 3.5 ②](../team/roles.md))

1. `evidence` 원문 대조 → 없으면 삭제
2. 같은 `type` 중복 → 하나로 정리
3. 8개 스키마에 없는 `type` → 제거

### 4.2 `POST /respond` — 캐릭터 대사 생성 ✅

[작업 분장 4.2](../team/roles.md)에 확정된 형태입니다.

> **`CLOSING` 모드에서는 이 엔드포인트를 호출하지 않습니다.** 백엔드가 `character_closing`을 그대로 씁니다.
> 즉 `responseMode`로 `CLOSING`이 전달되는 일은 없습니다.

**Request**

```json
{
  "characterName": "며느리",
  "characterPersona": "조심스럽고 걱정이 많은 말투",
  "sceneContext": "장면 설명 + conflict",
  "previousCharacterMessage": "직전 캐릭터 발화",
  "childUtterance": "아이 최신 발화",
  "analysis": { "childIntent": "...", "mainPoint": "..." },
  "responseMode": "GUIDED",
  "reactionKey": "proposalFromChild",
  "guidanceTarget": "REASON",
  "remainingWorry": "왜 꼭 말해야 하는지 나는 아직 잘 모르겠어."
}
```

| 필드 | 설명 |
| --- | --- |
| `characterPersona` | **말투 서술**이다. [PRD 7.5.3](../product/prd.md)의 `guidanceStyle`이 이 필드에 들어간다. 별도 `guidanceStyle` 필드는 없음 |
| `analysis` | **`childIntent`와 `mainPoint`만** 전달한다. `detectedElements`·`utteranceValidity`는 넣지 않음 |
| `responseMode` | `NORMAL` 또는 `GUIDED` |
| `reactionKey` | 백엔드가 매핑한 반응 원칙 키 ([작업 분장 3.5](../team/roles.md)) |
| `guidanceTarget` | `GUIDED`일 때만. 사고 요소 이름 하나 |
| `remainingWorry` | `GUIDED`의 유도 재료 = `remainingWorries[guidanceTarget]` |

> `detectedElements`를 넘기지 않는 이유: 그 정보가 이미 `reactionKey`로 압축돼 있고, AI가 요소 목록을
> 보면 "요소를 채우게 만드는 질문"을 하려 들 위험이 있습니다. `/analyze` 입력에서 누적 요소를 뺀 것과 같은 설계입니다.
>
> 캐릭터 세부 성격은 [PRD 7.5.3](../product/prd.md)의 `guidanceStyle` 한 줄로 압축됩니다.
> [캐릭터 성격 원문](../reference/characters.md)의 5~6개 특성을 다 넣으면 4.3절 토큰 예산을 압박합니다.

**Response 200**

```json
{ "text": "캐릭터 대사" }
```

**responseMode별 동작**

| 모드 | 동작 |
| --- | --- |
| `NORMAL` | 아이 말에 자연스럽게 반응한다. **장면을 닫지 않는다** |
| `GUIDED` | `remainingWorry`를 대사에 녹여 부족한 요소를 유도한다 |

**reactionKey별 반응 원칙**

| `reactionKey` | 반응 방식 |
| --- | --- |
| `playfulUtterance` | 장난을 실제 사건으로 단정하지 않고 받아친다 |
| `questionFromChild` | 질문에 먼저 답한다 |
| `proposalFromChild` | 제안의 좋은 점을 인정하고 걱정을 하나만 제시한다 |
| `unclearUtterance` | 필요할 때만 짧게 되묻는다 |
| `empathyFromChild` | 공감으로 반응한다 |
| `disagreement` | 무조건 부정하지 않고 걱정을 하나 제시한다 |
| `directResponse` | 최신 말에 직접 반응한다 |

**생성 제약**

- 캐릭터를 유지한다. 안내자나 교사처럼 말하지 않는다
- **평가하지 않는다.** "잘했어요", "정답이에요" 금지
- 7세~초2 수준 어휘, 짧은 문장
- `NORMAL`에서 장면을 닫지 않는다
- `remainingWorry`가 없으면 **교육용 문구를 생성하지 않는다.** 일반 반응으로 처리
- 아이 이름은 백엔드가 이미 치환해 전달한다
- 학습 질문("해결 방법을 말해 봐")을 쓰지 않고 캐릭터의 **걱정**으로 드러낸다 ([PRD 6.15](../product/prd.md))
- 한 번에 한 문장. 줄당 22자 기준으로 아이 화면 말풍선에 들어갑니다 ([화면 명세 1-3](screens.md))

> ⚠️ **soft-cue를 구현할 때** ([PRD 6.14](../product/prd.md), O-13): `responseMode = NORMAL`인데도
> `remainingWorry`를 실어 보내면 됩니다. 새 필드는 필요 없습니다. 다만 위 responseMode 표의
> `NORMAL` 항목이 `remainingWorry` 사용을 언급하지 않으므로, 구현 시 프롬프트에서
> "NORMAL + remainingWorry가 있으면 약하게만 드러낸다"를 명시해야 합니다.

### 4.3 계약 확정 시 정해야 할 것

[작업 분장 5장](../team/roles.md)이 지정한 항목입니다. **백엔드 담당이 주도하고 코딩 착수 전에 합의합니다.**

| 항목 | 상태 |
| --- | --- |
| 프로토콜 | ✅ REST / JSON |
| 엔드포인트 경로 | 🟡 `POST /analyze`, `POST /respond` 가정. **AI 담당 명세 수령 후 확정** |
| 인증 | 🟡 `X-Internal-Token` 고정 토큰. 값 미정 |
| 타임아웃 | ✅ **각 5초** ([D-03](../../backend/docs/decisions.md)) |
| 재시도 | ✅ **0회.** 한 턴에 2회 호출이라 여유 없음 |
| 실패 시 백엔드 동작 | ✅ `/analyze` → 빈 분석으로 진행 / `/respond` → `character_closing`으로 장면 종료 |
| 배포 주소 | ⚪ 미정. **mock 스텁으로 선행 진행 중** |

> 백엔드는 AI 서버 완성을 기다리지 않고 **고정 JSON 스텁**으로 먼저 연결해 전체 흐름을 검증합니다.
> 주소가 확정되면 환경변수만 교체합니다.

### 4.4 비용·성능 제약

[PRD 10.4](../product/prd.md) · [작업 분장 4.3](../team/roles.md) — 세션 8턴 기준 약 **1.5만~2만 토큰**을 넘기지 않습니다. 시스템 프롬프트를 간결하게 유지하는 것이 예산 관리의 핵심입니다.

| 턴 유형 | LLM 호출 |
| --- | --- |
| `NORMAL` / `GUIDED` | `/analyze` 1회 + `/respond` 1회 = **2회** |
| `CLOSING` | `/analyze` 1회 = **1회** |

**응답 시간 예산** — 요청 분리로 해소되었습니다 ([D-02](../../backend/docs/decisions.md)).

```
[분리 전]  Whisper 8초 + AI 분석 5초 + AI 응답 5초 = 18초  ← 15초 초과

[분리 후]  ① POST /api/stt     Whisper 8초              ← 15초 이내
           ② POST /messages    분석 5초 + 응답 5초 = 10초 ← 15초 이내
           ③ GET  /api/tts     캐시 히트 시 즉시
```

각 구간이 예산 안에 들어갑니다. 남은 변수는 **Render 콜드 스타트**이며, 외부 크론 10분 핑으로
슬립 진입 자체를 막습니다 (2.5절).

> ⚠️ **실측이 필요합니다.** 배포 후 각 구간을 측정해 프론트에 공유하고, 그때 15초를 유지할지 정합니다.
> ([Q-14](../open-questions.md))

**OpenAI 키는 파트별로 분리합니다** ([D-16](../../backend/docs/decisions.md)).

| 용도 | 키 소유 |
| --- | --- |
| Whisper (STT) · OpenAI TTS | 백엔드 담당 |
| `gpt-5-mini` (분석 · 캐릭터 응답) | AI 담당 |

위 1.5만~2만 토큰 상한은 **AI 담당 쪽에만** 걸립니다. 음성 비용 상한은 아직 정해지지 않았습니다.

### 4.5 계약 확정 전에도 진행 가능한 작업

| 담당 | 작업 |
| --- | --- |
| 백엔드 | 스키마 구축, 콘텐츠 적재, 인증, 계정 관리, 후처리·진행판단 규칙 엔진 |
| AI | 프롬프트 초안, 로컬에서 샘플 발화로 분석 품질 확인 |
| 프론트 | 정적 화면, UI 컴포넌트, 상태 전이 로직 |

계약 확정 후 백엔드가 **AI 서버를 목(mock)으로 먼저 연결**할 것을 권장합니다. 고정 JSON 스텁이면 충분하고, AI 서버 완성을 기다리지 않고 전체 흐름을 검증할 수 있습니다. ([작업 분장 5장](../team/roles.md))

---

## 5. 미결 항목

### 해소됨 (2026-08-12)

| 항목 | 결정 |
| --- | --- |
| ~~STT 방식~~ | ✅ **2안 (Whisper, 백엔드)** — 1절 · D-01 |
| ~~TTS 방식~~ | ✅ **2안 (OpenAI TTS, 백엔드)** + `tts_cache` DB 저장 + 기동 시 11건 프리워밍 — 3.5③ · D-05 |
| ~~백엔드→AI 타임아웃·재시도·실패 응답~~ | ✅ 5초 / 0회 / 폴백 확정 — 2.5절 · D-03 |
| ~~카드 순서 재시도 횟수 제한~~ | ✅ **3회** — 3.6절 · D-10 |
| ~~`children.avatar_id` 스키마 추가~~ | ✅ 추가. 값 검증 없음 — 3.2절 · D-08 |
| ~~`highlightWords` 데이터 출처~~ | ✅ 장면별 고정 목록(팀 창작) 채택. 대사에 실제로 있을 때만 채움 — 3.7절 · D-22 |

### 남은 것

| 항목 | 결정 주체 | 상태 |
| --- | --- | --- |
| AI 서버 배포 주소 · 경로 · 내부 토큰 | 백엔드·AI | AI 담당 명세 대기. **mock 스텁으로 우회 중** |
| 프론트 15초 예산 유지 여부 | 프론트·백엔드 | 배포 후 **실측** 필요 |
| 이미지 URL 제공 방식 | 3인 | Supabase Storage 우선. **에셋 수령 시 확정.** 컬럼(`cover_image_url`·`background_image_url`)은 미리 추가 |
| 음성(Whisper·TTS) 비용 상한 | 백엔드 | 문서에 예산 없음 |
| 리포트 응답 스키마 | 3인 | O-01 착수 시 |

전체 미결·충돌 목록은 [../open-questions.md](../open-questions.md)를 참조하세요.
