# 굿퀘스천 백엔드 API 명세서

- 작성일: 2026-08-12
- 대상: 프론트엔드 개발자
- 기준: 실제 구현된 백엔드 코드 (`backend/src/main/java`) — 팀 공용 문서인 [`../../docs/spec/api.md`](../../docs/spec/api.md)의 최종 확정본이자 상세 구현판입니다. 두 문서가 다르면 **이 문서가 더 최신입니다.**
- 이 문서는 `docs/apiSample.md` 템플릿을 따르되, 각 API가 "무엇을 하고 어떻게 동작하는지"와 "사용하기 전에 무엇이 준비돼 있어야 하는지"를 추가로 설명합니다. 이 문서만 보고 추가 문의 없이 프론트 작업을 시작할 수 있도록 작성했습니다.

---

## 0. 공통 사항 (반드시 먼저 읽어주세요)

### 0.1 Base URL

로컬: `http://localhost:8080/api`
배포: 배포 확정 시 이 문서에 갱신합니다 (현재 미배포).

**모든 엔드포인트 경로에 `/api`가 붙습니다.** 아래 각 API 설명에서는 `/api`를 생략하고 씁니다 (예: `GET /children`은 실제로 `GET /api/children`입니다).

### 0.2 인증 방식

이 서비스는 보호자(부모) 계정 하나로 로그인하고, 그 보호자가 등록한 아이(자녀) 여러 명을 다루는 구조입니다. **로그인 주체는 언제나 보호자**이고, 대부분의 API는 `childId`를 파라미터로 받아 "이 보호자의 아이가 맞는지"를 검사합니다.

**로그인 흐름 (카카오, 배포/실사용)**

1. 프론트에서 `GET /oauth2/authorization/kakao`로 이동시킵니다 (버튼 클릭 시 `location.href` 이동, fetch 아님).
2. 카카오 로그인 화면 → 사용자 동의 → 백엔드가 자동으로 `GET /login/oauth2/code/kakao`를 처리합니다. **이 두 경로는 Spring Security가 자동으로 처리하며, 백엔드에 커스텀 컨트롤러가 없습니다.**
3. 로그인이 끝나면 백엔드가 `accessToken`을 **httpOnly 쿠키**로 심고, `{FRONTEND_URL}/auth/callback?hasCompletedOnboarding=true|false`로 리다이렉트합니다. `hasCompletedOnboarding`은 이 보호자가 아이를 1명 이상 등록했는지 여부입니다 — 프론트는 이 값으로 온보딩(아이 등록) 화면으로 보낼지, 홈으로 보낼지 결정하면 됩니다.
4. 이후 모든 요청은 브라우저가 쿠키를 자동으로 실어 보내므로, **프론트가 토큰을 직접 관리하거나 헤더에 실을 필요가 없습니다.** `fetch`에 `credentials: "include"`만 설정하면 됩니다.

**로그인 흐름 (로컬 개발 — 카카오 앱 등록 없이 테스트)**

`POST /auth/dev-login`을 호출하면 즉시 `accessToken` 쿠키가 발급됩니다. 실제 카카오 계정이 없어도 프론트 개발을 시작할 수 있습니다. **이 엔드포인트는 시연/배포 전 제거될 예정이므로 실사용 플로우에 의존하지 마세요.**

**인증이 필요 없는 경로** (아래만 예외, 나머지는 전부 로그인 필요)

- `/oauth2/authorization/**`, `/login/oauth2/code/**` (카카오 로그인 자체)
- `/auth/dev-login`, `/auth/logout`
- `/health` (운영용 헬스체크, 프론트는 호출할 일 없음)
- `/mock-ai/**` (백엔드 내부 AI mock, 프론트가 호출할 일 없음)

**인증 실패 시**: 쿠키가 없거나 만료되면 401 `UNAUTHORIZED`가 내려갑니다. 프론트는 이때 로그인 화면으로 보내면 됩니다.

**참고 — Postman/curl로 테스트할 때**: 쿠키 대신 `Authorization: Bearer {accessToken}` 헤더도 동일하게 동작합니다. 브라우저 프론트 코드에서는 쿠키 방식만 쓰면 됩니다.

### 0.3 요청 / 응답 공통 규칙

- **JSON 필드는 전부 camelCase**입니다 (`childId`, `createdAt` 등).
- **성공 응답에는 래퍼가 없습니다.** 데이터를 그대로 반환합니다. (`{ "data": ... }` 같은 감싸기 없음)
- **실패 응답은 항상 아래 형태입니다:**

```json
{ "code": "CONSENT_REQUIRED", "message": "아동 개인정보 처리 동의가 필요합니다." }
```

- 날짜/시간 필드는 별도 표기가 없는 한 **ISO-8601 UTC 문자열**(`Instant`, 예: `"2026-08-12T10:58:29.018091Z"`)입니다. 예외적으로 보호자 리포트 목록(10.2)의 `date` 필드만 `"2026.08.12"` 형태로 이미 가공되어 내려갑니다 — 해당 절에 명시했습니다.
- id 값은 전부 UUID 문자열입니다.

### 0.4 공통 에러 코드

아래 8개 코드(+ 예외 상황을 위한 fallback 1개)는 여러 API에서 공통으로 씁니다. 각 API의 "Status" 표에는 그 API에서 실제로 발생하는 것만 다시 적었습니다.

| HTTP 상태 | `code` | 의미 | 프론트 처리 권장 |
| --- | --- | --- | --- |
| 400 | `INVALID_REQUEST` | 필수 파라미터 누락, 형식 오류, 허용되지 않는 값 | 요청 값을 다시 확인 |
| 401 | `UNAUTHORIZED` | 로그인 안 됨 / 토큰 만료 | 로그인 화면으로 이동 |
| 403 | `FORBIDDEN` | 다른 보호자의 아이·세션·데이터에 접근 시도 | 정상 사용 흐름에서는 발생하지 않아야 함(버그로 취급) |
| 403 | `CONSENT_REQUIRED` | 아동 개인정보 처리 동의가 없는 아이로 세션을 시작하려 함 | 동의 화면으로 유도 |
| 404 | `NOT_FOUND` | 대상이 존재하지 않음 (삭제됐거나 잘못된 id) | 목록으로 복귀 |
| 409 | `CHILD_LIMIT_EXCEEDED` | 보호자 1명당 아이 3명 초과 등록 시도 | "최대 3명까지 등록 가능해요" 안내 |
| 409 | `SCENE_ALREADY_CLOSED` | 이미 지나간 장면을 다시 종료하려 함 | 화면을 최신 상태로 새로고침 |
| 422 | `STT_EMPTY` | 발화 텍스트가 비어 있음 | "다시 말해볼까요?" 같은 안내 후 재녹음 |
| 500 | `INTERNAL_ERROR` | 서버 내부 오류 | 일반 오류 안내, 재시도 유도 |

### 0.5 소유권 검사 패턴 (반복되는 규칙)

거의 모든 API가 `childId`(또는 `sessionId`를 통해 간접적으로) 그 아이/세션이 **로그인한 보호자 소유인지** 검사합니다. 다른 보호자의 데이터에 접근하면 404가 아니라 **403 `FORBIDDEN`**이 납니다(존재는 하지만 권한이 없다는 뜻 — 아예 없는 id는 404). 이 패턴은 API마다 따로 적지 않고 여기서 한 번만 설명합니다.

---

## 1. 인증

### 1.1 카카오 로그인 (Spring Security 자동 처리 — 백엔드 코드 없음)

**설명**: `GET /oauth2/authorization/kakao`로 이동하면 카카오 로그인 → 동의 → 콜백(`GET /login/oauth2/code/kakao`)까지 전부 Spring Security가 처리합니다. 성공하면 `accessToken` httpOnly 쿠키를 심고 `{FRONTEND_URL}/auth/callback?hasCompletedOnboarding=true|false`로 302 리다이렉트합니다. 실패하면 `{FRONTEND_URL}/auth/callback?error=...`로 리다이렉트합니다(구체 에러 형식은 필요 시 별도 확인 요청 주세요 — 배포 전 확정 예정).

**사전 조건**: 없음 (로그인 자체이므로).

**프론트 구현 방법**: 버튼 클릭 시 `window.location.href = "http://localhost:8080/api/oauth2/authorization/kakao"`로 이동. fetch/axios로 호출하지 않습니다(리다이렉트 체인이라 브라우저 이동이어야 함).

---

### 1.2 `GET /auth/me` — 로그인 확인 + 온보딩 여부

**설명**: 현재 쿠키/헤더의 토큰이 유효한 보호자 정보를 반환합니다. 앱 진입 시 "로그인이 유지되고 있는지" 확인하는 용도로 씁니다.

**사전 조건**: 로그인(쿠키 또는 헤더) 필요.

**Request**

Path/Query parameter 없음. 인증 정보만 필요합니다.

**Request Example**

```
GET /auth/me
Cookie: accessToken=eyJ...
```

**Response**

| key | 설명 | value 타입 | Nullable | 예시 |
| --- | --- | --- | --- | --- |
| id | 보호자 id | UUID(string) | N | "2f42506f-85e8-4b3d-a35a-0bd931b2517b" |
| name | 보호자 이름 (카카오 닉네임) | String | N | "보호자" |
| email | 보호자 이메일 | String | Y | "parent@example.com" |
| hasCompletedOnboarding | 아이를 1명 이상 등록했는지 | boolean | N | true |

**Example**

```json
{
  "id": "2f42506f-85e8-4b3d-a35a-0bd931b2517b",
  "name": "보호자",
  "email": "parent@example.com",
  "hasCompletedOnboarding": true
}
```

**Status**

| status | response content |
| --- | --- |
| 200 | 조회 성공 |
| 401 | 토큰 없음/만료 |

---

### 1.3 `POST /auth/logout` — 로그아웃

**설명**: `accessToken` 쿠키를 만료시킵니다(서버가 `Set-Cookie`로 즉시 만료값을 내려줌). 별도 서버 측 세션/토큰 저장소가 없으므로(JWT 무상태) 이 호출은 사실상 "쿠키 지우기"입니다.

**사전 조건**: 없음. 로그인 안 된 상태로 호출해도 에러 없이 200이 납니다.

**Request**

```
POST /auth/logout
```

Body 없음.

**Response**

빈 본문(200 OK, body 없음). 프론트는 응답 후 로그인 화면으로 이동하면 됩니다.

**Status**

| status | response content |
| --- | --- |
| 200 | 로그아웃 처리 완료 (쿠키 삭제됨) |

---

### 1.4 `POST /auth/dev-login` — 개발용 즉시 로그인 ⚠️ 배포 전 제거 예정

**설명**: 카카오 계정 없이 고정된 개발용 보호자로 즉시 로그인합니다. 최초 호출 시 `provider_id = "dev-user"`인 보호자를 자동 생성하고, 이후 호출은 같은 계정을 재사용합니다.

**사전 조건**: 없음.

**Request**

**Query parameter**

| key | 설명 | value 타입 | 필수 | 예시 |
| --- | --- | --- | --- | --- |
| name | 보호자 표시 이름 | String | N (기본값 "개발용 보호자") | "테스트보호자" |

**Request Example**

```
POST /auth/dev-login?name=테스트보호자
```

**Response**

| key | 설명 | value 타입 | Nullable | 예시 |
| --- | --- | --- | --- | --- |
| parentId | 발급된 보호자 id | UUID(string) | N | "2f42506f-85e8-4b3d-a35a-0bd931b2517b" |
| accessToken | JWT 토큰 문자열. 쿠키로도 동시에 내려감 | String | N | "eyJhbGciOiJIUzI1NiJ9..." |

**Example**

```json
{
  "parentId": "2f42506f-85e8-4b3d-a35a-0bd931b2517b",
  "accessToken": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIy..."
}
```

**Status**

| status | response content |
| --- | --- |
| 200 | 로그인 성공(쿠키 발급됨) |

---

## 2. 아이 프로필

### 2.1 `GET /children` — 내 아이 목록

**설명**: 로그인한 보호자가 등록한 아이 전체 목록을 반환합니다. 프로필 선택 화면, 설정 화면 등에서 씁니다.

**사전 조건**: 로그인 필요. (아이가 0명이어도 에러 없이 빈 배열)

**Request**

Path/Query parameter 없음.

```
GET /children
```

**Response**

| key | 설명 | value 타입 | Nullable | 예시 |
| --- | --- | --- | --- | --- |
| children[].id | 아이 id | UUID(string) | N | "3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5" |
| children[].name | 아이 이름 | String | N | "민준" |
| children[].birthYear | 출생연도 | Integer | N | 2018 |
| children[].age | 나이. `현재 연도 - birthYear`로 매 요청마다 계산(저장 안 함) | Integer | N | 8 |
| children[].avatarId | 아바타 식별자. **서버는 값을 검증하지 않는다** — 프론트가 정의한 아바타 목록 문자열을 그대로 저장/반환 | String | Y | "fox" |
| children[].consentGranted | 아동 개인정보 처리 동의가 유효한지. `false`면 세션 시작 불가 | boolean | N | true |
| children[].lastActivityAt | 가장 최근 세션 활동 시각. 활동한 세션이 없으면 null | Instant(string) | Y | "2026-08-12T10:58:29.018091Z" |
| children[].registeredAt | 아이 등록 시각 | Instant(string) | N | "2026-08-01T10:00:00Z" |
| limit | 아이 등록 가능 최대 인원(고정값 3) | Integer | N | 3 |

**Example**

```json
{
  "children": [
    {
      "id": "3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5",
      "name": "민준",
      "birthYear": 2018,
      "age": 8,
      "avatarId": "fox",
      "consentGranted": true,
      "lastActivityAt": "2026-08-12T10:58:29.018091Z",
      "registeredAt": "2026-08-01T10:00:00Z"
    }
  ],
  "limit": 3
}
```

**Status**

| status | response content |
| --- | --- |
| 200 | 조회 성공 (0명이어도 200 + 빈 배열) |
| 401 | 로그인 안 됨 |

---

### 2.2 `POST /children` — 아이 등록 (+ 동의 동시 처리)

**설명**: 아이 프로필을 새로 만듭니다. **아동 개인정보 처리 동의를 이 요청 한 번에 함께 제출**합니다 — 별도의 "동의 API"는 없습니다. 서버가 `children` 레코드와 `child_consents` 레코드를 같은 트랜잭션 안에서 동시에 생성합니다.

**사전 조건**: 로그인 필요. 이 보호자가 이미 아이 3명을 등록했으면 실패합니다(409). **동의 화면에서 필수 동의 3종을 전부 체크한 뒤에만 이 API를 호출하세요** — 서버도 다시 검증하지만, 미리 막아두는 것이 UX상 자연스럽습니다.

**Request**

**Request Body**

| key | 설명 | value 타입 | 필수 | 예시 |
| --- | --- | --- | --- | --- |
| name | 아이 이름 | String | Y (공백 불가) | "민준" |
| birthYear | 출생연도 | Integer | Y | 2018 |
| avatarId | 아바타 식별자. 값 검증 없음 | String | N | "fox" |
| consents.termsOfService | 이용약관 동의 | boolean | Y | true |
| consents.privacyPolicy | 개인정보처리방침 동의 | boolean | Y | true |
| consents.childDataProcessing | 아동 개인정보 처리 동의 | boolean | Y | true |
| consents.marketing | 마케팅 수신 동의 (선택) | boolean | N | false |

**주의**: `termsOfService`·`privacyPolicy`·`childDataProcessing` 셋 중 **하나라도 `true`가 아니면** 403 `CONSENT_REQUIRED`로 거절됩니다. `marketing`은 필수가 아닙니다.

**Request Example**

```
POST /children
Content-Type: application/json

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

**Response**

`GET /children`의 `children[]` 원소 하나와 동일한 형태입니다 (id/name/birthYear/age/avatarId/consentGranted/lastActivityAt/registeredAt). 방금 만든 아이이므로 `consentGranted: true`, `lastActivityAt: null`로 옵니다.

**Example**

```json
{
  "id": "3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5",
  "name": "민준",
  "birthYear": 2018,
  "age": 8,
  "avatarId": "fox",
  "consentGranted": true,
  "lastActivityAt": null,
  "registeredAt": "2026-08-12T10:58:29.018091Z"
}
```

**Status**

| status | response content |
| --- | --- |
| 201 | 등록 성공 |
| 400 | 필수 필드 누락(`name` 공백, `birthYear`/필수 동의값 없음 등) |
| 401 | 로그인 안 됨 |
| 403 | `CONSENT_REQUIRED` — 필수 동의 3종 중 하나라도 `false`/누락 |
| 409 | `CHILD_LIMIT_EXCEEDED` — 이미 3명 등록됨 |

---

### 2.3 `PATCH /children/{childId}` — 아이 프로필 수정

**설명**: 이름/아바타를 부분 수정합니다. **요청 본문에 없는 필드(또는 값이 `null`인 필드)는 변경하지 않습니다** — 전체 필드를 다시 보낼 필요 없이 바꾸고 싶은 것만 보내면 됩니다.

**사전 조건**: 로그인 필요, 본인 소유의 아이여야 함.

**Request**

**Path parameter**

| key | 설명 | value 타입 | 예시 |
| --- | --- | --- | --- |
| childId | 수정할 아이 id | UUID(string) | "3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5" |

**Request Body** (전부 선택. 보낸 필드만 반영)

| key | 설명 | value 타입 | 필수 | 예시 |
| --- | --- | --- | --- | --- |
| name | 새 이름 | String | N | "민준" |
| avatarId | 새 아바타 id | String | N | "rabbit" |

**Request Example**

```
PATCH /children/3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5
Content-Type: application/json

{ "avatarId": "rabbit" }
```

**Response**

`GET /children`의 원소와 동일한 형태(수정된 값이 반영된 전체 프로필).

**Status**

| status | response content |
| --- | --- |
| 200 | 수정 성공 |
| 401 | 로그인 안 됨 |
| 403 | 다른 보호자의 아이 |
| 404 | 존재하지 않는 `childId` |

---

### 2.4 `DELETE /children/{childId}` — 아이 프로필 삭제

**설명**: 아이 프로필을 삭제합니다. **연관된 모든 데이터가 DB 외래키 캐스케이드로 함께 삭제됩니다** — 동의 기록, 세션, 대화 메시지, 발화 분석, 후속활동 결과, 리포트, 단어장까지 전부 지워지며 되돌릴 수 없습니다.

**사전 조건**: 로그인 필요, 본인 소유의 아이여야 함. **프론트는 반드시 "정말 삭제하시겠습니까? 모든 기록이 사라집니다" 같은 확인 절차를 거쳐야 합니다** — 백엔드에 실행 취소(undo)나 휴지통 기능이 없습니다.

**Request**

**Path parameter**

| key | 설명 | value 타입 | 예시 |
| --- | --- | --- | --- |
| childId | 삭제할 아이 id | UUID(string) | "3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5" |

```
DELETE /children/3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5
```

**Response**

빈 본문(204 No Content).

**Status**

| status | response content |
| --- | --- |
| 204 | 삭제 성공 |
| 401 | 로그인 안 됨 |
| 403 | 다른 보호자의 아이 |
| 404 | 존재하지 않는 `childId` |

---

## 3. 홈

### 3.1 `GET /home` — 홈 화면 (이어하기 + 추천)

**설명**: 홈 화면 하나에 필요한 데이터를 한 번에 내려줍니다 — 아이 정보, 진행 중인 이야기(있으면), 추천 이야기 목록.

**사전 조건**: 로그인 필요, `childId`는 본인 소유 아이여야 함.

**Request**

**Query parameter**

| key | 설명 | value 타입 | 필수 | 예시 |
| --- | --- | --- | --- | --- |
| childId | 조회할 아이 id | UUID(string) | Y | "3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5" |

```
GET /home?childId=3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5
```

**Response**

| key | 설명 | value 타입 | Nullable | 예시 |
| --- | --- | --- | --- | --- |
| child.id | 아이 id | UUID(string) | N | "3ba024ff-..." |
| child.name | 아이 이름 | String | N | "민준" |
| child.avatarId | 아바타 id | String | Y | "fox" |
| inProgress | 진행 중(또는 후속활동 중)인 세션 1건. **없으면 `null`** — 이때 프론트는 "오늘의 이야기" 단일 카드로 빈 영역을 대체해야 합니다 | object | Y | 아래 참조 |
| inProgress.sessionId | 세션 id | UUID(string) | N | "58291471-..." |
| inProgress.storyId | 이야기 id | UUID(string) | N | "c1143ded-..." |
| inProgress.storyTitle | 이야기 제목 | String | N | "방귀 뀌는 며느리" |
| inProgress.coverImageUrl | 표지 이미지 URL. **에셋 미수령으로 현재 항상 `null`** | String | Y | null |
| inProgress.currentSceneOrder | DB 기준 장면 번호(1~9) | Integer | N | 5 |
| inProgress.sceneProgress.current | 화면 단위 진행(1~4). `currentSceneOrder / 2`(소수점 버림) | Integer | N | 2 |
| inProgress.sceneProgress.total | 화면 단위 전체 구간 수(대화 장면 개수, 고정 4) | Integer | N | 4 |
| inProgress.lastActivityAt | 마지막 활동 시각 | Instant(string) | N | "2026-08-12T10:58:29Z" |
| recommended[] | 추천 이야기 목록. **추천 로직 없음** — `status=published` 이야기를 그대로 나열 | array | N | 아래 참조 |
| recommended[].id | 이야기 id | UUID(string) | N | "c1143ded-..." |
| recommended[].title | 제목 | String | N | "방귀 뀌는 며느리" |
| recommended[].coverImageUrl | 표지 이미지. 현재 항상 `null` | String | Y | null |
| recommended[].estimatedMinutes | 예상 소요 시간(분) | Integer | N | 20 |
| recommended[].topics | 주제 태그 목록 | String[] | N | ["다름", "자기이해", "장점 발견"] |

**진행 중 세션 판정 기준**: `status`가 `in_progress` 또는 `post_activity`인 세션 중 가장 최근에 활동한 1건. 여러 개 진행 중이어도 최신 1건만 옵니다. `completed`/`stopped`는 "진행 중"에 포함되지 않습니다.

**Example (진행 중 세션 있음)**

```json
{
  "child": { "id": "3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5", "name": "민준", "avatarId": "fox" },
  "inProgress": {
    "sessionId": "58291471-0cc9-4f21-b80d-b576901ab1ae",
    "storyId": "c1143ded-ed81-4b79-b4c0-c12c2694d5ab",
    "storyTitle": "방귀 뀌는 며느리",
    "coverImageUrl": null,
    "currentSceneOrder": 5,
    "sceneProgress": { "current": 2, "total": 4 },
    "lastActivityAt": "2026-08-12T10:58:29Z"
  },
  "recommended": [
    { "id": "c1143ded-ed81-4b79-b4c0-c12c2694d5ab", "title": "방귀 뀌는 며느리", "coverImageUrl": null, "estimatedMinutes": 20, "topics": ["다름", "자기이해", "장점 발견"] }
  ]
}
```

**Example (진행 중 세션 없음)**

```json
{
  "child": { "id": "3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5", "name": "민준", "avatarId": "fox" },
  "inProgress": null,
  "recommended": [ /* 위와 동일 */ ]
}
```

**Status**

| status | response content |
| --- | --- |
| 200 | 조회 성공 |
| 401 | 로그인 안 됨 |
| 403 | 다른 보호자의 아이 |
| 404 | 존재하지 않는 `childId` |

---

## 4. 이야기

### 4.1 `GET /stories` — 이야기 목록 (+ 주제 필터)

**설명**: 발행된(`published`) 이야기 목록을 반환합니다. 현재 콘텐츠가 1편("방귀 뀌는 며느리")뿐이라 실질적으로는 배열 길이가 1이지만, 여러 이야기가 생겨도 같은 구조로 동작합니다.

**사전 조건**: 로그인 필요, `childId`는 본인 소유 아이.

**Request**

**Query parameter**

| key | 설명 | value 타입 | 필수 | 예시 |
| --- | --- | --- | --- | --- |
| childId | 조회 기준 아이 id. **이 아이의 세션 상태(`sessionStatus`)를 함께 계산하기 위해 필요** | UUID(string) | Y | "3ba024ff-..." |
| topic | 주제로 필터링. 생략하면 전체 | String | N | "다름" |

```
GET /stories?childId=3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5&topic=다름
```

**Response**

| key | 설명 | value 타입 | Nullable | 예시 |
| --- | --- | --- | --- | --- |
| stories[].id | 이야기 id | UUID(string) | N | "c1143ded-..." |
| stories[].title | 제목 | String | N | "방귀 뀌는 며느리" |
| stories[].summary | 한 줄 요약 | String | N | "큰 방귀를 부끄러워하던 며느리가…" |
| stories[].coverImageUrl | 표지. 현재 항상 `null` | String | Y | null |
| stories[].estimatedMinutes | 예상 소요 시간(분) | Integer | N | 20 |
| stories[].difficulty | 난이도 표기 | String | N | "보통" |
| stories[].topics | 주제 태그 목록 | String[] | N | ["다름", "자기이해", "장점 발견"] |
| stories[].sessionStatus | **이 `childId` 아이의** 이 이야기에 대한 세션 상태. 세션이 아예 없으면 `null` | String | Y | "in_progress" |
| availableTopics | **`topic` 필터와 무관하게** 전체 이야기에 존재하는 주제 목록(중복 제거). 필터 UI(칩)를 그리는 용도 | String[] | N | ["다름", "자기이해", "장점 발견"] |

`sessionStatus`로 가능한 값: `null`(세션 없음) / `"in_progress"` / `"post_activity"` / `"completed"` / `"stopped"`.

**Example**

```json
{
  "stories": [
    {
      "id": "c1143ded-ed81-4b79-b4c0-c12c2694d5ab",
      "title": "방귀 뀌는 며느리",
      "summary": "큰 방귀를 부끄러워하던 며느리가 자신의 다름을 장점으로 바꾸는 이야기",
      "coverImageUrl": null,
      "estimatedMinutes": 20,
      "difficulty": "보통",
      "topics": ["다름", "자기이해", "장점 발견"],
      "sessionStatus": "in_progress"
    }
  ],
  "availableTopics": ["다름", "자기이해", "장점 발견"]
}
```

**Status**

| status | response content |
| --- | --- |
| 200 | 조회 성공 (결과 없어도 200 + 빈 배열) |
| 401 | 로그인 안 됨 |
| 403 | 다른 보호자의 아이 |
| 404 | 존재하지 않는 `childId` |

---

### 4.2 `GET /stories/{storyId}` — 이야기 상세

**설명**: 이야기 상세 화면(표지, 소개, 등장인물, 이어할 세션 여부)에 필요한 데이터를 반환합니다.

**사전 조건**: 로그인 필요, `childId`는 본인 소유 아이.

**Request**

**Path parameter**

| key | 설명 | value 타입 | 예시 |
| --- | --- | --- | --- |
| storyId | 이야기 id | UUID(string) | "c1143ded-ed81-4b79-b4c0-c12c2694d5ab" |

**Query parameter**

| key | 설명 | value 타입 | 필수 | 예시 |
| --- | --- | --- | --- | --- |
| childId | 조회 기준 아이 id | UUID(string) | Y | "3ba024ff-..." |

```
GET /stories/c1143ded-ed81-4b79-b4c0-c12c2694d5ab?childId=3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5
```

**Response**

| key | 설명 | value 타입 | Nullable | 예시 |
| --- | --- | --- | --- | --- |
| id | 이야기 id | UUID(string) | N | "c1143ded-..." |
| title | 제목 | String | N | "방귀 뀌는 며느리" |
| summary | 요약 | String | N | "..." |
| coverImageUrl | 표지. 현재 항상 `null` | String | Y | null |
| estimatedMinutes | 예상 소요 시간(분) | Integer | N | 20 |
| difficulty | 난이도 | String | N | "보통" |
| topics | 주제 태그 | String[] | N | ["다름", "자기이해", "장점 발견"] |
| intro | 도입부 본문(첫 장면의 서술문). 상세 화면 소개 텍스트로 씀 | String | Y | "옛날 어느 마을에…" |
| situation | 이야기 상황 한 줄 소개 | String | Y | "큰 방귀 때문에 며느리가…" |
| childRole | 이 이야기에서 아이의 역할 안내 문구 | String | Y | "며느리의 방귀가 특별한…" |
| characters[] | 등장인물 목록(대화 장면에 나오는 캐릭터, 중복 제거) | array | N | 아래 참조 |
| characters[].name | 캐릭터 식별자(표시하지 말 것) | String | N | "ch_banggui_daughter_in_law" |
| characters[].displayName | 캐릭터 표시명 | String | N | "방귀쟁이 며느리" |
| characters[].imageUrl | 캐릭터 이미지. 현재 항상 `null` | String | Y | null |
| existingSession | 이 아이가 이 이야기에 대해 이미 만든 세션이 있으면 그 정보, 없으면 `null` | object | Y | 아래 참조 |
| existingSession.sessionId | 세션 id | UUID(string) | N | "58291471-..." |
| existingSession.currentSceneOrder | 현재 장면(DB 단위 1~9) | Integer | Y | 5 |
| existingSession.status | 세션 상태 | String | N | "in_progress" |

**`existingSession`이 있을 때 프론트 동작**: "이어하기 / 처음부터 하기" 선택 모달을 띄우는 데 씁니다. 이어하기를 누르면 `POST /sessions`를 `restart:false`로, 처음부터 하기를 누르면 `restart:true`로 호출하세요 (5.1 참조).

**Example**

```json
{
  "id": "c1143ded-ed81-4b79-b4c0-c12c2694d5ab",
  "title": "방귀 뀌는 며느리",
  "summary": "큰 방귀를 부끄러워하던 며느리가 자신의 다름을 장점으로 바꾸는 이야기",
  "coverImageUrl": null,
  "estimatedMinutes": 20,
  "difficulty": "보통",
  "topics": ["다름", "자기이해", "장점 발견"],
  "intro": "옛날 어느 마을에 방귀를 아주 크게 뀌는 며느리가 살았습니다. ...",
  "situation": "큰 방귀 때문에 며느리가 집에서 쫓겨날 위기에 놓였어요.",
  "childRole": "며느리의 방귀가 특별한 장점이 될 수 있도록 도와주세요.",
  "characters": [
    { "name": "ch_banggui_daughter_in_law", "displayName": "방귀쟁이 며느리", "imageUrl": null },
    { "name": "ch_banggui_father_in_law", "displayName": "시아버지", "imageUrl": null },
    { "name": "ch_banggui_village_chief", "displayName": "마을 이장", "imageUrl": null }
  ],
  "existingSession": {
    "sessionId": "58291471-0cc9-4f21-b80d-b576901ab1ae",
    "currentSceneOrder": 5,
    "status": "in_progress"
  }
}
```

**Status**

| status | response content |
| --- | --- |
| 200 | 조회 성공 |
| 401 | 로그인 안 됨 |
| 403 | 다른 보호자의 아이 |
| 404 | 존재하지 않는 `storyId`/`childId` |

---

## 5. 세션 (이야기 진행)

세션은 "아이가 이 이야기를 진행하고 있는 상태" 한 덩어리입니다. 장면(scene)은 DB 기준 1~9번이 순서대로 있고, 화면에서는 이걸 4개 구간(도입+전개1+대화1, 전개2+대화2, …)으로 묶어 보여줍니다. 장면 종류는 3가지입니다.

- `intro`(1번), `narrative`(2,4,6,8번): 서술만 있는 장면. 다 보여준 뒤 `POST .../scenes/{sceneId}/complete`로 다음 장면으로 넘어갑니다.
- `dialogue`(3,5,7,9번): 아이가 캐릭터와 대화하는 장면. `POST .../messages`로 발화를 보내고, 서버가 대화를 이어가다가 스스로 판단해 장면을 종료합니다(6장 참조). **`.../complete`로 dialogue 장면을 종료하려 하면 400 에러입니다.**

### 5.1 `POST /sessions` — 세션 생성 / 이어하기 / 새로 시작

**설명**: 이야기를 시작합니다. 이미 진행 중인 세션이 있으면 그걸 반환하거나(이어하기), 기존 걸 중단시키고 새로 만듭니다(`restart:true`, "처음부터 하기").

**동작 규칙**:
- 이 아이가 이 이야기에 대해 `in_progress`/`post_activity` 상태인 세션이 **없으면**: 새 세션을 만듭니다(1번 장면부터 시작).
- 있고 `restart: false`(또는 생략)면: **새로 만들지 않고 기존 세션을 그대로 반환**합니다. (같은 요청이 중복으로 와도 세션이 두 개 생기지 않도록 하는 안전장치입니다.)
- 있고 `restart: true`면: 기존 세션을 `stopped`로 바꾸고 **새 세션을 만듭니다.** 기존 세션의 `messages`(대화 기록)는 삭제되지 않고 그대로 보존됩니다 — 나중에 리포트 등에서 참조될 수 있습니다.

**사전 조건**: 로그인 필요. **이 아이의 아동 개인정보 처리 동의가 활성 상태여야 합니다** — 동의가 없으면 403 `CONSENT_REQUIRED`가 나므로, 프론트는 `GET /children`의 `consentGranted`를 미리 확인해 동의 없는 아이는 세션 시작 버튼을 막거나 동의 화면으로 유도하는 것이 좋습니다.

**Request**

**Request Body**

| key | 설명 | value 타입 | 필수 | 예시 |
| --- | --- | --- | --- | --- |
| childId | 세션을 만들 아이 id | UUID(string) | Y | "3ba024ff-..." |
| storyId | 이야기 id | UUID(string) | Y | "c1143ded-..." |
| restart | true면 기존 세션을 정지하고 새로 시작 | boolean | N (기본 false) | false |

**Request Example**

```
POST /sessions
Content-Type: application/json

{ "childId": "3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5", "storyId": "c1143ded-ed81-4b79-b4c0-c12c2694d5ab", "restart": false }
```

**Response**

`GET /sessions/{sessionId}`(5.2)와 **완전히 동일한 형태**입니다. 아래 5.2의 Response 표를 참고하세요.

**Status**

| status | response content |
| --- | --- |
| 201 | 세션 생성됨 (새로 만든 경우) |
| 201 | 기존 세션 반환 (`restart:false`이고 이미 진행 중일 때 — 상태 코드는 동일하게 201입니다) |
| 400 | `childId`/`storyId` 누락 |
| 401 | 로그인 안 됨 |
| 403 | `FORBIDDEN`(다른 보호자의 아이) 또는 `CONSENT_REQUIRED`(동의 없음) |
| 404 | 존재하지 않는 `childId`/`storyId` |

---

### 5.2 `GET /sessions/{sessionId}` — 세션 조회 (이어하기 복원)

**설명**: 세션의 현재 상태 전체를 반환합니다. 앱을 새로고침하거나 다시 들어왔을 때 화면을 복원하는 데 씁니다.

**사전 조건**: 로그인 필요, 본인 소유의 세션.

**Request**

**Path parameter**

| key | 설명 | value 타입 | 예시 |
| --- | --- | --- | --- |
| sessionId | 세션 id | UUID(string) | "58291471-0cc9-4f21-b80d-b576901ab1ae" |

```
GET /sessions/58291471-0cc9-4f21-b80d-b576901ab1ae
```

**Response**

| key | 설명 | value 타입 | Nullable | 예시 |
| --- | --- | --- | --- | --- |
| sessionId | 세션 id | UUID(string) | N | "58291471-..." |
| storyId | 이야기 id | UUID(string) | N | "c1143ded-..." |
| status | 세션 상태: `in_progress`/`post_activity`/`completed`/`stopped` | String | N | "in_progress" |
| currentSceneId | 현재 장면 id | UUID(string) | N | "39a666d8-..." |
| currentSceneOrder | 현재 장면 번호(DB 단위 1~9) | Integer | N | 7 |
| totalScenes | 전체 대화 장면 수(고정 4) | Integer | N | 4 |
| turnCount | 현재 장면에서 아이가 발화한 횟수. **장면이 바뀌면 0으로 초기화됨** | Integer | N | 2 |
| maxTurns | 현재 장면의 최대 턴 수. `dialogue` 장면이 아니면 `null` | Integer | Y | 5 |
| accumulatedElements | 현재 장면에서 지금까지 확인된 "사고 요소" 목록(중복 제거). **장면이 바뀌면 빈 배열로 초기화됨.** 값 종류는 6장 참고 | String[] | N | ["PERSPECTIVE"] |
| messages[] | 이 세션의 전체 대화 기록(시간 순). **`speakerType: "system"`(미션 노출 기록)은 이 목록에서 제외됨** | array | N | 아래 참조 |
| messages[].id | 메시지 id | UUID(string) | N | "3aa173ca-..." |
| messages[].sceneId | 이 메시지가 속한 장면 id | UUID(string) | N | "05ed0e76-..." |
| messages[].speakerType | `"child"` 또는 `"character"` | String | N | "character" |
| messages[].turnOrder | 세션 전체 기준 연속 번호(장면별로 리셋되지 않음, 1부터 시작) | Integer | N | 1 |
| messages[].text | 발화/대사 원문. 캐릭터 대사는 아이 이름이 이미 치환된 상태 | String | N | "\"민준아, 내 방귀가…\"" |
| messages[].createdAt | 저장 시각 | Instant(string) | N | "2026-08-12T10:20:00Z" |
| currentScene | 현재 장면 상세 (화면 복원용) | object | N | 아래 참조 |
| currentScene.sceneId | 장면 id | UUID(string) | N | "39a666d8-..." |
| currentScene.sceneOrder | 장면 번호(1~9) | Integer | N | 7 |
| currentScene.sceneType | `"intro"` / `"narrative"` / `"dialogue"` | String | N | "dialogue" |
| currentScene.sceneDescription | 서술 텍스트. `narrative`/`intro`일 때 자막으로 사용 | String | N | "그래서 며느리는…" |
| currentScene.characterName | 캐릭터 식별자(표시 금지). `dialogue`가 아니면 `null` | String | Y | "ch_banggui_village_chief" |
| currentScene.characterDisplayName | 캐릭터 표시명. `dialogue`가 아니면 `null` | String | Y | "마을 이장" |
| currentScene.characterImageUrl | 캐릭터 이미지. 현재 항상 `null` | String | Y | null |
| currentScene.backgroundImageUrl | 배경 이미지. 현재 항상 `null`(에셋 미수령) | String | Y | null |
| currentScene.sceneClosed | 현재 `dialogue` 장면이 이미 종료 판정을 받았는지 | boolean | N | false |
| currentScene.missionRevealed | 현재 장면에서 미션이 이미 노출됐는지(재진입 시 중복 노출 방지 판단용) | boolean | N | false |

**Example**

```json
{
  "sessionId": "58291471-0cc9-4f21-b80d-b576901ab1ae",
  "storyId": "c1143ded-ed81-4b79-b4c0-c12c2694d5ab",
  "status": "in_progress",
  "currentSceneId": "39a666d8-0a5f-49ee-bfc2-9d827077a8b9",
  "currentSceneOrder": 7,
  "totalScenes": 4,
  "turnCount": 2,
  "maxTurns": 5,
  "accumulatedElements": ["PERSPECTIVE"],
  "messages": [
    { "id": "f579b987-...", "sceneId": "39a666d8-...", "speakerType": "character", "turnOrder": 21, "text": "\"이 배나무는...무슨 뾰족한 방법이 없겠는가?\"", "createdAt": "2026-08-12T10:20:00Z" },
    { "id": "9524008f-...", "sceneId": "39a666d8-...", "speakerType": "child", "turnOrder": 22, "text": "장대를 쓰면 될 것 같아요", "createdAt": "2026-08-12T10:20:30Z" }
  ],
  "currentScene": {
    "sceneId": "39a666d8-0a5f-49ee-bfc2-9d827077a8b9",
    "sceneOrder": 7,
    "sceneType": "dialogue",
    "sceneDescription": "마을 이장이 높은 배나무의 배를 딸 방법을 아이와 함께 궁리합니다.",
    "characterName": "ch_banggui_village_chief",
    "characterDisplayName": "마을 이장",
    "characterImageUrl": null,
    "backgroundImageUrl": null,
    "sceneClosed": false,
    "missionRevealed": false
  }
}
```

**Status**

| status | response content |
| --- | --- |
| 200 | 조회 성공 |
| 401 | 로그인 안 됨 |
| 403 | 다른 보호자의 세션 |
| 404 | 존재하지 않는 `sessionId` |

---

### 5.3 `POST /sessions/{sessionId}/scenes/{sceneId}/complete` — 장면 넘기기 (도입/전개 전용)

**설명**: `intro`/`narrative` 장면(서술만 있는 장면)을 다 보여준 뒤 호출해 다음 장면으로 넘깁니다. **`dialogue` 장면에는 쓸 수 없습니다** — 대화 장면의 종료는 `POST .../messages`(6장)가 알아서 판단합니다.

다음 장면이 `dialogue`면, 서버가 그 장면의 첫 캐릭터 대사(`character_opening`, 아이 이름이 치환된 상태)를 자동으로 `messages`에 저장하고 함께 내려줍니다 — 프론트가 별도로 "대화 시작" API를 호출할 필요가 없습니다.

**사전 조건**: 로그인 필요, 본인 소유 세션. `sceneId`는 **세션의 현재 장면과 정확히 일치**해야 합니다(이미 지나간 장면이면 409).

**Request**

**Path parameter**

| key | 설명 | value 타입 | 예시 |
| --- | --- | --- | --- |
| sessionId | 세션 id | UUID(string) | "58291471-..." |
| sceneId | 지금 완료할(=현재) 장면 id. `GET /sessions/{sessionId}`의 `currentSceneId`와 같아야 함 | UUID(string) | "046b0b3e-..." |

```
POST /sessions/58291471-0cc9-4f21-b80d-b576901ab1ae/scenes/046b0b3e-5107-446f-8321-fec8f76972c0/complete
```

Body 없음.

**Response**

| key | 설명 | value 타입 | Nullable | 예시 |
| --- | --- | --- | --- | --- |
| nextScene.sceneId | 다음 장면 id | UUID(string) | N | "ff6a05ea-..." |
| nextScene.sceneOrder | 다음 장면 번호(1~9) | Integer | N | 2 |
| nextScene.sceneType | `"intro"` / `"narrative"` / `"dialogue"` | String | N | "narrative" |
| nextScene.characterName | 캐릭터 식별자. `dialogue`가 아니면 `null` | String | Y | null |
| nextScene.characterDisplayName | 캐릭터 표시명. `dialogue`가 아니면 `null` | String | Y | null |
| nextScene.characterImageUrl | 캐릭터 이미지. 현재 항상 `null` | String | Y | null |
| nextScene.maxTurns | 다음 장면 최대 턴 수. `dialogue`가 아니면 `null` | Integer | Y | null |
| nextScene.openingMessage | 다음 장면이 `dialogue`일 때만 값 있음. 아니면 `null` | object | Y | 아래 참조 |
| nextScene.openingMessage.id | 저장된 오프닝 메시지 id. **`GET /tts?messageId=`로 음성 재생 시 사용** | UUID(string) | N | "3aa173ca-..." |
| nextScene.openingMessage.speakerType | 항상 `"character"` | String | N | "character" |
| nextScene.openingMessage.turnOrder | 세션 전체 기준 순번 | Integer | N | 10 |
| nextScene.openingMessage.text | 오프닝 대사(아이 이름 치환 완료) | String | N | "\"민준아, 내 방귀가…\"" |

**Example (다음 장면이 dialogue일 때)**

```json
{
  "nextScene": {
    "sceneId": "05ed0e76-5955-49e4-a2ed-b58e1750dfdc",
    "sceneOrder": 3,
    "sceneType": "dialogue",
    "characterName": "ch_banggui_daughter_in_law",
    "characterDisplayName": "방귀쟁이 며느리",
    "characterImageUrl": null,
    "maxTurns": 4,
    "openingMessage": {
      "id": "3aa173ca-18d6-4495-bdc1-de72620ce597",
      "speakerType": "character",
      "turnOrder": 1,
      "text": "\"민준아, 내 방귀가 너무 크다는 걸 알면 가족들이 나를 이상하게 생각하지 않을까?\""
    }
  }
}
```

**Example (다음 장면이 narrative일 때)**

```json
{
  "nextScene": {
    "sceneId": "ff6a05ea-6467-45c3-852c-1f1eeb7c5bc5",
    "sceneOrder": 2,
    "sceneType": "narrative",
    "characterName": null,
    "characterDisplayName": null,
    "characterImageUrl": null,
    "maxTurns": null,
    "openingMessage": null
  }
}
```

**Status**

| status | response content |
| --- | --- |
| 200 | 다음 장면으로 이동 성공 |
| 400 | `INVALID_REQUEST` — 현재 장면이 `dialogue`인데 이 엔드포인트를 호출함 |
| 401 | 로그인 안 됨 |
| 403 | 다른 보호자의 세션 |
| 404 | 존재하지 않는 `sessionId`, 또는 다음 장면이 없음(마지막 장면 이후) |
| 409 | `SCENE_ALREADY_CLOSED` — `sceneId`가 이미 지나간 장면(현재 장면과 불일치) |

---

### 5.4 `PATCH /sessions/{sessionId}` — 이야기 나가기

**설명**: 세션을 강제로 `stopped` 상태로 바꿉니다. 일시정지 화면의 "이야기 나가기" 버튼에서 씁니다. 대화 기록은 삭제되지 않습니다.

**사전 조건**: 로그인 필요, 본인 소유 세션. 세션이 어떤 상태(`in_progress`/`post_activity`/이미 `completed`/이미 `stopped`)여도 에러 없이 동작합니다(멱등).

**Request**

**Path parameter**

| key | 설명 | value 타입 | 예시 |
| --- | --- | --- | --- |
| sessionId | 세션 id | UUID(string) | "58291471-..." |

**Request Body**

| key | 설명 | value 타입 | 필수 | 예시 |
| --- | --- | --- | --- | --- |
| status | **반드시 `"stopped"` 고정값**. 다른 값을 보내면 400 | String | Y | "stopped" |

**Request Example**

```
PATCH /sessions/58291471-0cc9-4f21-b80d-b576901ab1ae
Content-Type: application/json

{ "status": "stopped" }
```

**Response**

| key | 설명 | value 타입 | Nullable | 예시 |
| --- | --- | --- | --- | --- |
| status | 처리 후 상태(항상 `"stopped"`) | String | N | "stopped" |

**Example**

```json
{ "status": "stopped" }
```

**Status**

| status | response content |
| --- | --- |
| 200 | 처리 성공 |
| 400 | `INVALID_REQUEST` — `status`가 `"stopped"`가 아님 |
| 401 | 로그인 안 됨 |
| 403 | 다른 보호자의 세션 |
| 404 | 존재하지 않는 `sessionId` |

---

## 6. 대화 (발화 전송) — 핵심 API

이 API 하나가 "아이 발화 저장 → AI 분석 → 진행 판단 → 캐릭터 응답 생성 → 세션 상태 갱신"을 **한 번의 요청으로 전부 처리**합니다. `dialogue` 장면에서만 호출할 수 있습니다.

### 6.1 `POST /sessions/{sessionId}/messages` — 발화 전송

**설명**: 아이의 확정된 발화 텍스트를 보내면, 서버가

1. 발화를 `messages`에 저장
2. AI에게 발화를 분석시켜(의도, 사고 요소 등) 결과를 검증·저장
3. 규칙 엔진으로 이번 턴의 응답 모드(`normal`/`guided`/`closing`)를 확정
4. 캐릭터의 다음 대사를 생성(또는 장면 종료 시 고정 마무리 대사 사용)해 반환

까지 한 번에 처리합니다. **프론트는 이 응답 하나로 캐릭터 말풍선, 턴 카운터, 사고 요소 뱃지, 장면 종료 여부, 미션 노출까지 전부 그릴 수 있습니다.**

**사전 조건**:
- 로그인 필요, 본인 소유 세션.
- 세션의 **현재 장면이 `dialogue`**여야 합니다. 아니면 400.
- 아이 발화는 **STT(7.1)로 텍스트 변환 후 아이가 확인/수정한 최종 텍스트**를 보내야 합니다. 빈 문자열이면 저장하지 않고 422 `STT_EMPTY`가 납니다(빈 문자열이 예상되는 경우 애초에 이 API를 호출하지 마세요 — STT 결과가 비었으면 호출 자체를 생략하는 것이 정상 흐름입니다).

**Request**

**Path parameter**

| key | 설명 | value 타입 | 예시 |
| --- | --- | --- | --- |
| sessionId | 세션 id | UUID(string) | "58291471-..." |

**Request Body**

| key | 설명 | value 타입 | 필수 | 예시 |
| --- | --- | --- | --- | --- |
| text | 아이가 화면에서 확인·수정한 **확정 발화 텍스트** | String | Y (공백/빈 문자열이면 422) | "장대를 쓰면 될 것 같아요" |
| sttRawText | STT 최초 변환 결과(수정 전 원문). 기록 보존용, 없어도 됨 | String | N | "장대를 쓰면 될것같아요" |

**Request Example**

```
POST /sessions/58291471-0cc9-4f21-b80d-b576901ab1ae/messages
Content-Type: application/json

{ "text": "장대를 쓰면 될 것 같아요", "sttRawText": "장대를 쓰면 될것같아요" }
```

**Response**

| key | 설명 | value 타입 | Nullable | 예시 |
| --- | --- | --- | --- | --- |
| responseMode | 이번 턴 확정된 모드. `"normal"` / `"guided"` / `"closing"` — 화면 상태 전환 기준 | String | N | "guided" |
| characterMessage | 캐릭터 말풍선 텍스트(+TTS 재생 대상). `closing`이면 AI가 생성한 게 아니라 **미리 정해진 마무리 대사 원문**입니다 | String | N | "그랬구나, 네 말을 들으니…" |
| characterName | 캐릭터 표시명 | String | N | "마을 이장" |
| accumulatedElements | 이번 턴까지 **현재 장면**에서 누적된 사고 요소 목록(중복 제거). 아래 "사고 요소" 설명 참고 | String[] | N | ["PERSPECTIVE"] |
| turnCount | 현재 장면에서 아이가 발화한 누적 횟수(이번 턴 포함) | Integer | N | 2 |
| maxTurns | 현재 장면의 최대 턴 수 | Integer | Y | 5 |
| sceneEnded | 이번 응답으로 장면이 종료됐는지. `true`면 `characterMessage` 재생 후 다음 장면(또는 후속활동)으로 넘어가야 함 | boolean | N | false |
| nextSceneId | `sceneEnded:true`일 때 다음 장면 id. 다음 장면이 없으면(마지막 대화 장면 종료) `null`(이때는 후속 활동 화면 `GET /sessions/{id}/activity`로 이동) | UUID(string) | Y | null |
| missionTriggered | 이번 턴에 미션이 새로 노출됐으면 그 정보, 아니면 `null`. **한 장면에서 한 번만** 옵니다(재노출 없음) | object | Y | 아래 참조 |
| missionTriggered.id | 미션 식별자 | String | N | "mission_1" |
| missionTriggered.title | 미션 제목 | String | N | "높이 있는 배 따기" |
| missionTriggered.checklist[] | 미션 확인 항목 목록. `mission_2`는 항상 빈 배열 | array | N | 아래 참조 |
| missionTriggered.checklist[].label | 화면에 보여줄 문구 | String | N | "무엇을 사용할 것인지" |
| missionTriggered.checklist[].element | 내부 사고 요소 코드. **화면에 그대로 노출 금지**(내부용) | String | N | "SOLUTION" |
| highlightWords[] | 이번 턴 `characterMessage`에 **실제로 등장한** 밑줄 단어 후보. 없으면 빈 배열 | array | N | [] |
| highlightWords[].word | 밑줄 칠 단어 | String | N | "부끄러워" |
| highlightWords[].meaning | 아이 눈높이 뜻풀이 | String | N | "남에게 보이기 부끄럽고 수줍은 마음" |
| messageId | 방금 저장된 캐릭터 메시지의 id. **`GET /tts?messageId=`로 이 대사를 음성 재생할 때 사용**. (필드명 `characterMessageId`→`messageId` 정정: D-26) | UUID(string) | N | "d82d423b-..." |
| characterState | 대화 중 캐릭터 이미지를 바꾸는 데 쓰는 상태값(O-12, D-27). AI가 그때그때 생성한 대사에 맞춰 판단해서 내려줌. `NEUTRAL`/`HAPPY`/`WORRIED`/`SURPRISED`/`MOVED` 중 하나. **`closing`이면 AI를 호출하지 않으므로 항상 `null`** | String | Y | "MOVED" |
| missionProgress | 미션 체크리스트 **항목 단위** 진행(D-30). 미션 노출 전이거나 `closing`이면 `null` | object | Y | 아래 참조 |
| missionProgress.missionId | 진행 중인 미션 id | String | N | "mission_1" |
| missionProgress.satisfiedIndexes[] | 채워진 체크리스트 인덱스(0-based), **채워진 순서대로**. 같은 사고 요소가 체크리스트에 반복돼도(미션1의 1·2번이 둘 다 SOLUTION) 항목별로 순서대로 채워짐 — `accumulatedElements`(집합)로는 이 구분이 안 돼서 별도 필드로 뺐습니다 | Integer[] | N | [0] |

**"사고 요소"(thought element)란**: 아이 발화에서 AI가 감지하는 8가지 분류입니다 — `DECISION`, `REASON`, `PERSPECTIVE`, `SOLUTION`, `RESULT`, `EMOTION`, `EMPATHY`, `REQUEST`. **화면에 영문 코드를 그대로 노출하지 마세요.** 아이 화면용으로는 4그룹(마음=EMOTION·EMPATHY, 이유=REASON, 생각=PERSPECTIVE·DECISION·RESULT, 방법=SOLUTION·REQUEST)으로 묶어 표시하는 걸 권장합니다.

**`responseMode` 값별 프론트 동작**

| 값 | 의미 | 프론트 동작 |
| --- | --- | --- |
| `normal` | 일반 반응. 장면이 계속됨 | 캐릭터 말풍선 표시, 다음 녹음 대기 |
| `guided` | 캐릭터가 부족한 사고 요소를 부드럽게 유도하는 중 | 동일하게 캐릭터 말풍선 표시(별도 UI 불필요 — 대사 안에 유도가 녹아 있음) |
| `closing` | 장면 종료. `characterMessage`는 검수된 고정 마무리 대사 | 대사 재생 후 `sceneEnded`/`nextSceneId`를 보고 다음 화면으로 이동 |

**`sceneEnded: true`일 때 다음 동작**

- `nextSceneId`가 있으면: 그 장면으로 이동. `nextSceneId`로 받은 값은 다음 장면이 `dialogue`인 경우 바로 대화가 이어지고, `narrative`/`intro`면 `POST .../scenes/{sceneId}/complete`(5.3) 흐름을 따르면 됩니다. (다음 장면의 오프닝 메시지가 필요하면 `GET /sessions/{sessionId}`로 다시 조회하거나, narrative라면 그 장면의 `sceneDescription`을 그대로 보여주면 됩니다.)
- `nextSceneId`가 `null`이면: 마지막 대화 장면까지 끝난 것입니다. `GET /sessions/{sessionId}/activity`(8.1)로 이동하세요.

**Example (일반 응답)**

```json
{
  "responseMode": "normal",
  "characterMessage": "그랬구나, 네 말을 들으니 마음이 좀 놓이는구나.",
  "characterName": "방귀쟁이 며느리",
  "accumulatedElements": ["PERSPECTIVE"],
  "turnCount": 2,
  "maxTurns": 4,
  "sceneEnded": false,
  "nextSceneId": null,
  "missionTriggered": null,
  "highlightWords": [],
  "messageId": "586f5bcb-3a06-40ec-a133-55b9fa317c5d",
  "characterState": "MOVED",
  "missionProgress": null
}
```

**Example (미션 노출)**

```json
{
  "responseMode": "guided",
  "characterMessage": "그랬구나, 네 말을 들으니 마음이 좀 놓이는구나.",
  "characterName": "마을 이장",
  "accumulatedElements": [],
  "turnCount": 2,
  "maxTurns": 5,
  "sceneEnded": false,
  "nextSceneId": null,
  "missionTriggered": {
    "id": "mission_1",
    "title": "높이 있는 배 따기",
    "checklist": [
      { "label": "무엇을 사용할 것인지", "element": "SOLUTION" },
      { "label": "주변에 있는 마을 사람들과 시아버지는 어디로 피해야 할지", "element": "SOLUTION" },
      { "label": "며느리에게 어떻게 부탁할 것인지", "element": "REQUEST" },
      { "label": "그 결과 어떤 일이 생길지", "element": "RESULT" }
    ]
  },
  "highlightWords": [],
  "messageId": "070547b1-9fd1-49ae-b9b8-5ec1534ce1e4",
  "characterState": "SURPRISED",
  "missionProgress": { "missionId": "mission_1", "satisfiedIndexes": [] }
}
```

**Example (장면 종료 — 다음 대화 장면 있음)**

```json
{
  "responseMode": "closing",
  "characterMessage": "\"그래도 아직은 못 말하겠어. 조금만 더 참아 볼게.\"",
  "characterName": "방귀쟁이 며느리",
  "accumulatedElements": [],
  "turnCount": 4,
  "maxTurns": 4,
  "sceneEnded": true,
  "nextSceneId": "6598de7d-d217-4ea4-944f-1ce3662f2595",
  "missionTriggered": null,
  "highlightWords": [],
  "messageId": "6aecabad-0d8e-44f2-ab6d-093e3e266165",
  "characterState": null,
  "missionProgress": null
}
```

**Example (마지막 장면 종료 — 후속 활동으로 이동)**

```json
{
  "responseMode": "closing",
  "characterMessage": "\"이제는 부끄러워하며 숨기지 않고, 조심해서 좋은 일에 써 볼게.\"",
  "characterName": "방귀쟁이 며느리",
  "accumulatedElements": [],
  "turnCount": 4,
  "maxTurns": 4,
  "sceneEnded": true,
  "nextSceneId": null,
  "missionTriggered": null,
  "highlightWords": [{ "word": "부끄러워", "meaning": "남에게 보이기 부끄럽고 수줍은 마음" }],
  "messageId": "d82d423b-e4af-43c6-b99c-3b34e1941cfc",
  "characterState": null,
  "missionProgress": null
}
```

**Status**

| status | response content |
| --- | --- |
| 200 | 처리 성공 |
| 400 | `INVALID_REQUEST` — 현재 장면이 `dialogue`가 아님 |
| 401 | 로그인 안 됨 |
| 403 | 다른 보호자의 세션 |
| 404 | 존재하지 않는 `sessionId` |
| 422 | `STT_EMPTY` — `text`가 비어 있음/공백만 있음 |

**AI 서버 장애 시 동작(프론트가 알아야 할 것)**: 백엔드 내부에서 AI 호출이 실패해도 **이 API는 500을 반환하지 않습니다.** 분석 실패 시 캐릭터는 일반 반응으로 계속 진행하고, 응답 생성 실패 시에는 장면을 마무리 대사로 종료시킵니다. 즉 프론트 입장에서는 항상 200으로 정상적인 `MessageCreateResponse`를 받는다고 가정해도 됩니다(네트워크 자체가 끊긴 경우는 예외).

---

## 7. 음성 (STT / TTS)

발화 전송은 **요청 3개로 분리**되어 있습니다. 한 번에 오디오를 보내 텍스트+응답을 함께 받는 방식이 아닙니다 — "변환된 텍스트를 화면에 보여주고 아이가 확인/수정한 뒤 보내기" 흐름을 지키기 위한 설계입니다.

```
① POST /stt                  녹음 파일 → 텍스트           (최대 8초)
   아이가 화면에서 확인·수정              ← 여기서 요청이 끊김
② POST /sessions/{id}/messages  텍스트 → 캐릭터 응답 (6장)
③ GET  /tts?messageId=        대사 → 오디오
```

### 7.1 `POST /stt` — 음성 → 텍스트 변환

**설명**: 녹음된 오디오 파일을 업로드하면 텍스트로 변환해 반환합니다. **원본 음성 파일은 저장하지 않습니다** — 메모리에서 변환만 하고 즉시 버립니다.

**사전 조건**: 로그인 필요. 브라우저의 `MediaRecorder`로 녹음한 파일(Chrome은 보통 `webm`, iOS Safari는 `mp4`)을 그대로 업로드하면 됩니다 — 특정 포맷으로 변환할 필요 없습니다.

**Request**

`multipart/form-data`

| key | 설명 | value 타입 | 필수 | 예시 |
| --- | --- | --- | --- | --- |
| audio | 녹음 파일 | File(binary) | Y | (webm/mp4 바이너리) |

**Request Example**

```
POST /stt
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

------WebKitFormBoundary...
Content-Disposition: form-data; name="audio"; filename="recording.webm"
Content-Type: audio/webm

(바이너리 데이터)
------WebKitFormBoundary...--
```

**Response**

| key | 설명 | value 타입 | Nullable | 예시 |
| --- | --- | --- | --- | --- |
| text | 변환된 텍스트. **인식 결과가 없으면 빈 문자열 `""`** | String | N | "장대를 쓰면 될 것 같아요" |

**Example**

```json
{ "text": "장대를 쓰면 될 것 같아요" }
```

**`text`가 빈 문자열일 때**: 프론트는 **`POST /sessions/{id}/messages`를 호출하지 않아야 합니다.** "다시 말해볼까요?" 안내 후 재녹음시키세요. 빈 텍스트로 messages를 호출하면 422 `STT_EMPTY`가 나긴 하지만, 애초에 호출하지 않는 것이 정상 흐름입니다.

**Status**

| status | response content |
| --- | --- |
| 200 | 변환 성공 (결과 없으면 `{"text": ""}`도 200) |
| 401 | 로그인 안 됨 |
| 500 | STT 서버 오류/타임아웃(8초) — 프론트는 일반 오류 처리(재시도 안내) |

---

### 7.2 `GET /tts` — 텍스트 → 음성 변환/재생

**설명**: 텍스트를 오디오로 변환해 반환합니다. **응답이 JSON이 아니라 오디오 바이너리(`audio/mpeg`)입니다.** 같은 문장은 내부적으로 텍스트 해시로 캐싱되어 있어 고정 대사는 거의 즉시 응답합니다. `messageId` / `text` 둘 중 하나로 요청합니다(D-26 — 최초엔 `messageId`만 있었으나, `messages` 행이 아닌 텍스트도 있어서 `text` 경로를 추가했습니다).

- **`messageId`가 있는 경우** (캐릭터 대사, opening 등 이미 저장된 메시지): `messageId`로 요청. 소유권 검증(이 메시지가 속한 세션이 로그인한 보호자 것인지) 후 재생합니다.
- **`messageId`가 없는 경우** (도입/전개 내레이션 = `story_scenes.scene_description`, 단어 발음, 재구성 발화 다시 듣기 등): `text`로 요청. 소유권 검증 없이(로그인만 되어 있으면) 텍스트를 그대로 음성으로 변환합니다.

**사전 조건**: 로그인 필요. `messageId`를 쓸 경우 `POST /sessions/{id}/messages`의 `messageId`, `POST .../scenes/{id}/complete`의 `openingMessage.id` 등 **이미 저장된 메시지의 id**여야 합니다.

**Request**

**Query parameter**

| key | 설명 | value 타입 | 필수 | 예시 |
| --- | --- | --- | --- | --- |
| messageId | 재생할 메시지 id. `text`와 동시 사용 시 `messageId`가 우선 | UUID(string) | 둘 중 하나 | "d82d423b-e4af-43c6-b99c-3b34e1941cfc" |
| text | 재생할 텍스트 (URL 인코딩) | String | 둘 중 하나 | "옛날 어느 마을에" |

**Request Example**

```
GET /tts?messageId=d82d423b-e4af-43c6-b99c-3b34e1941cfc
```

```
GET /tts?text=%EC%98%9B%EB%82%A0%20%EC%96%B4%EB%8A%90%20%EB%A7%88%EC%9D%84%EC%97%90
```

**Response**

`Content-Type: audio/mpeg`인 오디오 바이트 스트림입니다. JSON이 아닙니다. 프론트에서는 `fetch` 후 `blob()`으로 받아 `URL.createObjectURL()`로 `<audio>` 태그나 `Audio` 객체에 물려 재생하면 됩니다.

**"다시 듣기" 구현**: 재요청 없이 프론트가 이미 받은 오디오 blob을 다시 재생하면 됩니다. 매번 다시 요청할 필요 없습니다.

**Status**

| status | response content |
| --- | --- |
| 200 | 오디오 바이너리 (`audio/mpeg`) |
| 400 | `messageId`·`text` 둘 다 없음 |
| 401 | 로그인 안 됨 |
| 403 | (`messageId` 사용 시) 이 메시지가 속한 세션이 다른 보호자의 것 |
| 404 | 존재하지 않는 `messageId` |
| 500 | TTS 서버 오류/타임아웃 |

---

## 8. 말하기 후 활동

대화 장면 4개가 모두 끝나면(6장의 마지막 `sceneEnded:true` + `nextSceneId:null`) 세션 상태가 자동으로 `post_activity`로 바뀝니다. 이 단계는 카드 순서 맞추기 → 재구성 말하기(다시 말해보기) 2단계로 구성됩니다.

### 8.1 `GET /sessions/{sessionId}/activity` — 카드 조회

**설명**: 순서 맞추기 카드 4개를 반환합니다. **순서는 서버가 세션마다 고정적으로 섞어서 내려줍니다** — 같은 세션에서 여러 번 조회해도 항상 같은 순서입니다(아이가 혼란스럽지 않도록). **정답 순서는 내려주지 않습니다.**

**사전 조건**: 로그인 필요, 본인 소유 세션.

**Request**

**Path parameter**

| key | 설명 | value 타입 | 예시 |
| --- | --- | --- | --- |
| sessionId | 세션 id | UUID(string) | "58291471-..." |

```
GET /sessions/58291471-0cc9-4f21-b80d-b576901ab1ae/activity
```

**Response**

| key | 설명 | value 타입 | Nullable | 예시 |
| --- | --- | --- | --- | --- |
| cards[].id | 카드 식별자(제출 시 이 값을 사용) | String | N | "card_1" |
| cards[].text | 카드 문구 | String | N | "며느리는 방귀를 꾹 참고 또 참았어요." |
| cards[].imageUrl | 카드 이미지. **에셋 미수령으로 현재 항상 `null`** | String | Y | null |
| attemptCount | 지금까지 시도한 횟수(0부터 시작) | Integer | N | 0 |

**Example**

```json
{
  "cards": [
    { "id": "card_2", "text": "며느리의 큰 방귀에 시아버지의 갓이 날아갔어요.", "imageUrl": null },
    { "id": "card_1", "text": "며느리는 방귀를 꾹 참고 또 참았어요.", "imageUrl": null },
    { "id": "card_4", "text": "시아버지가 며느리에게 미안하다고 말했어요.", "imageUrl": null },
    { "id": "card_3", "text": "며느리의 방귀로 높은 배나무의 배가 우수수 떨어졌어요.", "imageUrl": null }
  ],
  "attemptCount": 0
}
```

**Status**

| status | response content |
| --- | --- |
| 200 | 조회 성공 |
| 401 | 로그인 안 됨 |
| 403 | 다른 보호자의 세션 |
| 404 | 존재하지 않는 `sessionId` |

---

### 8.2 `POST /sessions/{sessionId}/activity/order` — 순서 제출 (정답 판정)

**설명**: 아이가 배열한 카드 순서를 제출하면 서버가 정답 여부를 판정합니다. **프론트에서 직접 정답을 판정하면 안 됩니다** — 반드시 이 API의 응답을 신뢰하세요. **최대 3회까지 재시도할 수 있고, 3회째에는 정답이든 오답이든 정답 순서가 함께 공개됩니다.**

**사전 조건**: 로그인 필요, 본인 소유 세션.

**Request**

**Path parameter**

| key | 설명 | value 타입 | 예시 |
| --- | --- | --- | --- |
| sessionId | 세션 id | UUID(string) | "58291471-..." |

**Request Body**

| key | 설명 | value 타입 | 필수 | 예시 |
| --- | --- | --- | --- | --- |
| submittedOrder | 아이가 배열한 카드 id 순서(4개) | String[] | Y (빈 배열 불가) | ["card_1", "card_2", "card_3", "card_4"] |

**Request Example**

```
POST /sessions/58291471-0cc9-4f21-b80d-b576901ab1ae/activity/order
Content-Type: application/json

{ "submittedOrder": ["card_1", "card_2", "card_3", "card_4"] }
```

**Response**

**⚠️ 아래 3개 필드는 상황에 따라 응답 JSON에 키 자체가 없을 수 있습니다** (값이 `null`인 게 아니라 키가 아예 생략됩니다 — `"correctOrder" in response`로 존재 여부를 확인하세요).

| key | 설명 | value 타입 | Nullable / 생략 조건 | 예시 |
| --- | --- | --- | --- | --- |
| isCorrect | 이번 제출이 정답인지 | boolean | N | true |
| attemptCount | 이번 제출까지 포함한 누적 시도 횟수 | Integer | N | 3 |
| correctOrder | 정답 카드 순서(id 배열). **정답을 맞혔거나 3회 미만 오답이면 응답에서 키 자체가 생략됨.** `!isCorrect && attemptCount>=3`일 때만 존재 | String[] | 조건부 생략 | ["card_1","card_2","card_3","card_4"] |
| retellingKeywords | 다음 단계(재구성 말하기)에서 쓸 핵심 단어 목록. **정답을 맞혔거나 3회째일 때만 존재**, 그 전(오답+3회 미만)에는 키 생략 | String[] | 조건부 생략 | ["며느리","방귀","배나무","시아버지"] |

**응답 3가지 패턴**

1) **오답, 아직 3회 미만** — `correctOrder`/`retellingKeywords` 둘 다 없음:
```json
{ "isCorrect": false, "attemptCount": 2 }
```

2) **정답** (몇 회째든 상관없이) — `retellingKeywords`만 있고 `correctOrder`는 없음(이미 맞혔으니 공개할 필요 없음):
```json
{ "isCorrect": true, "attemptCount": 1, "retellingKeywords": ["며느리", "방귀", "배나무", "시아버지"] }
```

3) **3회째인데 오답** — 둘 다 있음(정답을 공개하고 다음 단계로 넘김):
```json
{
  "isCorrect": false,
  "attemptCount": 3,
  "correctOrder": ["card_1", "card_2", "card_3", "card_4"],
  "retellingKeywords": ["며느리", "방귀", "배나무", "시아버지"]
}
```

**프론트 필수 동작**: 패턴 3(3회째 오답)이어도 **"틀렸다"는 걸 아이에게 직접 알리지 마세요.** 정답 배치를 자연스럽게 보여주고 다음 단계(재구성 말하기)로 넘어가면 됩니다. 실패를 지적하지 않는 것이 이 서비스의 원칙입니다. (서버 기록에는 실패로 정직하게 남습니다 — 화면에만 안 보일 뿐입니다.)

**Status**

| status | response content |
| --- | --- |
| 200 | 판정 성공 |
| 400 | `submittedOrder`가 비어 있음 |
| 401 | 로그인 안 됨 |
| 403 | 다른 보호자의 세션 |
| 404 | 존재하지 않는 `sessionId` |

---

### 8.3 `POST /sessions/{sessionId}/activity/retelling` — 재구성 발화 제출 (세션 완료)

**설명**: 아이가 카드 순서와 핵심 단어를 참고해 자기 언어로 다시 말한 이야기 텍스트를 제출합니다. **이 호출로 세션이 `completed`로 확정되며, 이야기 전체가 끝납니다.** 별가루(포인트) 지급과 보호자 리포트 생성도 이 시점에 함께 일어납니다(프론트가 신경 쓸 필요 없음, 자동 처리).

**사전 조건**: 로그인 필요, 본인 소유 세션. `POST .../activity/order`를 먼저 거친 뒤(정답이든 3회 소진이든) 호출하는 흐름입니다.

**Request**

**Path parameter**

| key | 설명 | value 타입 | 예시 |
| --- | --- | --- | --- |
| sessionId | 세션 id | UUID(string) | "58291471-..." |

**Request Body**

| key | 설명 | value 타입 | 필수 | 예시 |
| --- | --- | --- | --- | --- |
| retellingText | 아이가 다시 말한 이야기(STT로 변환·확인된 텍스트) | String | Y (공백 불가) | "옛날에 며느리가 방귀를 오래 참다가…" |

**Request Example**

```
POST /sessions/58291471-0cc9-4f21-b80d-b576901ab1ae/activity/retelling
Content-Type: application/json

{ "retellingText": "옛날에 며느리가 방귀를 오래 참다가 시아버지 앞에서 크게 뀌었어요. 그런데 그 방귀 덕분에 높은 배나무의 배를 딸 수 있었고, 시아버지는 며느리에게 미안하다고 말했어요." }
```

**Response**

| key | 설명 | value 타입 | Nullable | 예시 |
| --- | --- | --- | --- | --- |
| sessionStatus | 처리 후 세션 상태(항상 `"completed"`) | String | N | "completed" |
| completedAt | 완료 시각 | Instant(string) | N | "2026-08-12T12:01:54.409122Z" |
| stats.childUtteranceCount | 이 세션 전체(모든 대화 장면 합산)에서 아이가 말한 총 횟수 | Integer | N | 18 |
| stats.characterCount | 이 세션에서 만난 캐릭터 수(중복 제거) | Integer | N | 3 |
| stats.newWordCount | 새로 배운 단어 수. **현재 항상 0으로 고정**(집계 기준 미정, 아래 참고) | Integer | N | 0 |
| reportAvailable | 보호자 리포트가 생성됐는지. **이 API 호출 이후 항상 `true`** | boolean | N | true |

**Example**

```json
{
  "sessionStatus": "completed",
  "completedAt": "2026-08-12T12:01:54.409122Z",
  "stats": { "childUtteranceCount": 18, "characterCount": 3, "newWordCount": 0 },
  "reportAvailable": true
}
```

**Status**

| status | response content |
| --- | --- |
| 200 | 완료 처리 성공 |
| 400 | `retellingText`가 비어 있음 |
| 401 | 로그인 안 됨 |
| 403 | 다른 보호자의 세션 |
| 404 | 존재하지 않는 `sessionId` |

---

## 9. 단어장

아이가 대화 중 자막에서 밑줄 그어진 단어(6장의 `highlightWords`)를 눌러 저장하는 기능입니다.

### 9.1 `GET /wordbook` — 저장한 단어 목록

**사전 조건**: 로그인 필요, `childId`는 본인 소유 아이.

**Request**

**Query parameter**

| key | 설명 | value 타입 | 필수 | 예시 |
| --- | --- | --- | --- | --- |
| childId | 조회할 아이 id | UUID(string) | Y | "3ba024ff-..." |
| filter | `all`(전체, 기본값) / `liked`(좋아요한 것만) / `story:{storyId}`(특정 이야기에서 저장한 것만) | String | N | "liked" |

```
GET /wordbook?childId=3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5&filter=liked
```

**Response**

| key | 설명 | value 타입 | Nullable | 예시 |
| --- | --- | --- | --- | --- |
| words[].id | 단어 저장 id | UUID(string) | N | "0c24e902-..." |
| words[].word | 저장된 단어 | String | N | "부끄러워" |
| words[].meaning | 뜻풀이 | String | N | "남에게 보이기 부끄럽고 수줍은 마음" |
| words[].storyId | 이 단어를 만난 이야기 id | UUID(string) | N | "c1143ded-..." |
| words[].storyTitle | 이야기 제목 | String | N | "방귀 뀌는 며느리" |
| words[].sceneIndex | 화면 단위 장면 번호(1~4). "장면 N에서 만났어요" 표기용 | Integer | N | 4 |
| words[].contextSentence | 저장 당시 화면에 떠 있던 대사 원문. 프론트가 저장 요청 시 보낸 값을 그대로 돌려줌(9.2 참고) | String | Y | "이제는 부끄러워하며 숨기지 않고…" |
| words[].liked | 좋아요 여부 | boolean | N | true |
| words[].savedAt | 저장 시각 | Instant(string) | N | "2026-08-12T11:08:42Z" |
| words[].isNew | 저장한 지 24시간 이내인지("새 단어" 칩 표시용) | boolean | N | true |
| total | **`filter`와 무관한 전체 저장 단어 개수**(필터링된 `words.length`가 아님 — 목록 제목 옆 "N개" 표기용) | Integer | N | 1 |
| storyFilters[] | 이 아이가 단어를 저장한 이야기 목록(필터 칩 UI용). `filter`와 무관하게 전체 기준 | array | N | 아래 참조 |
| storyFilters[].storyId | 이야기 id | UUID(string) | N | "c1143ded-..." |
| storyFilters[].title | 이야기 제목 | String | N | "방귀 뀌는 며느리" |

**Example**

```json
{
  "words": [
    {
      "id": "0c24e902-a89b-46bb-ae33-ba1e3c94f5a1",
      "word": "부끄러워",
      "meaning": "남에게 보이기 부끄럽고 수줍은 마음",
      "storyId": "c1143ded-ed81-4b79-b4c0-c12c2694d5ab",
      "storyTitle": "방귀 뀌는 며느리",
      "sceneIndex": 4,
      "contextSentence": "이제는 부끄러워하며 숨기지 않고, 조심해서 좋은 일에 써 볼게.",
      "liked": true,
      "savedAt": "2026-08-12T11:08:42.037387Z",
      "isNew": true
    }
  ],
  "total": 1,
  "storyFilters": [{ "storyId": "c1143ded-ed81-4b79-b4c0-c12c2694d5ab", "title": "방귀 뀌는 며느리" }]
}
```

**Status**

| status | response content |
| --- | --- |
| 200 | 조회 성공 |
| 400 | `filter` 값이 `all`/`liked`/`story:{uuid}` 형식이 아님 |
| 401 | 로그인 안 됨 |
| 403 | 다른 보호자의 아이 |
| 404 | 존재하지 않는 `childId` |

---

### 9.2 `POST /wordbook` — 단어 저장

**설명**: 밑줄 단어를 눌렀을 때 저장합니다. **저장 시점에 화면에 보이던 단어/뜻/대사 원문을 프론트가 그대로 보내주세요** — 서버는 나중에 이 값을 재계산하지 않고 그대로 저장/반환합니다.

**사전 조건**: 로그인 필요, `childId`는 본인 소유 아이. `sourceSceneId`는 실제 존재하는 장면 id여야 합니다(보통 6장 응답에서 알 수 있는 현재 장면의 id).

**Request**

**Request Body**

| key | 설명 | value 타입 | 필수 | 예시 |
| --- | --- | --- | --- | --- |
| childId | 저장할 아이 id | UUID(string) | Y | "3ba024ff-..." |
| word | 단어 | String | Y (공백 불가) | "부끄러워" |
| meaning | 뜻풀이(6장 `highlightWords[].meaning`을 그대로 쓰면 됨) | String | Y (공백 불가) | "남에게 보이기 부끄럽고 수줍은 마음" |
| sourceSceneId | 이 단어를 만난 장면 id | UUID(string) | Y | "bcfd6554-..." |
| contextSentence | 저장 시점 화면에 떠 있던 대사 원문(캐릭터 발화 전체 문장). 없어도 저장은 되지만 상세 화면에 근거 문장이 안 보이게 됨 | String | N | "이제는 부끄러워하며 숨기지 않고…" |

**Request Example**

```
POST /wordbook
Content-Type: application/json

{
  "childId": "3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5",
  "word": "부끄러워",
  "meaning": "남에게 보이기 부끄럽고 수줍은 마음",
  "sourceSceneId": "bcfd6554-e51a-440e-ac1f-3dbe558cc3f1",
  "contextSentence": "이제는 부끄러워하며 숨기지 않고, 조심해서 좋은 일에 써 볼게."
}
```

**Response**

9.1의 `words[]` 원소와 동일한 형태(방금 저장한 단어 1건).

**Status**

| status | response content |
| --- | --- |
| 201 | 저장 성공 |
| 400 | `word`/`meaning` 공백, `childId`/`sourceSceneId` 누락 |
| 401 | 로그인 안 됨 |
| 403 | 다른 보호자의 아이 |
| 404 | 존재하지 않는 `childId`/`sourceSceneId` |

**참고**: 같은 단어를 여러 번 저장해도 중복 방지 로직이 없습니다 — 프론트에서 이미 저장된 단어인지 확인 후 버튼 상태(담김/안 담김)를 관리해주세요(9.1의 목록으로 판단 가능).

---

### 9.3 `PATCH /wordbook/{wordbookId}` — 좋아요 토글

**설명**: 저장된 단어의 `liked` 값을 변경합니다.

**사전 조건**: 로그인 필요, 본인(자기 아이 소유) 단어여야 함.

**Request**

**Path parameter**

| key | 설명 | value 타입 | 예시 |
| --- | --- | --- | --- |
| wordbookId | 단어 저장 id | UUID(string) | "0c24e902-..." |

**Request Body**

| key | 설명 | value 타입 | 필수 | 예시 |
| --- | --- | --- | --- | --- |
| liked | 좋아요 여부 | boolean | Y | true |

**Request Example**

```
PATCH /wordbook/0c24e902-a89b-46bb-ae33-ba1e3c94f5a1
Content-Type: application/json

{ "liked": true }
```

**Response**

9.1의 `words[]` 원소와 동일한 형태(수정된 단어 1건).

**Status**

| status | response content |
| --- | --- |
| 200 | 수정 성공 |
| 400 | `liked` 누락 |
| 401 | 로그인 안 됨 |
| 403 | 다른 보호자(아이)의 단어 |
| 404 | 존재하지 않는 `wordbookId` |

---

## 10. 보호자 화면

**대상 사용자가 다릅니다** — 위 1~9장은 "아이가 보는 화면"이 호출하고, 10장은 "보호자가 보는 화면"이 호출합니다. 인증 주체(로그인한 보호자)는 같지만, 화면 자체가 다릅니다. AI를 호출하지 않는 순수 집계입니다 — 서버 내부 로직상 지연이 크지 않습니다.

### 10.1 `GET /parent/summary` — 보호자 홈 요약

**설명**: 보호자 홈 화면의 요약 카드(이번 주 몇 번, 완료 몇 편, 평균 문장 수)를 반환합니다.

**사전 조건**: 로그인 필요, `childId`는 본인 소유 아이.

**Request**

**Query parameter**

| key | 설명 | value 타입 | 필수 | 예시 |
| --- | --- | --- | --- | --- |
| childId | 조회할 아이 id | UUID(string) | Y | "3ba024ff-..." |

```
GET /parent/summary?childId=3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5
```

**Response**

| key | 설명 | value 타입 | Nullable | 예시 |
| --- | --- | --- | --- | --- |
| child.id | 아이 id | UUID(string) | N | "3ba024ff-..." |
| child.name | 아이 이름 | String | N | "민준" |
| child.avatarId | 아바타 id | String | Y | "fox" |
| child.age | 나이 | Integer | N | 8 |
| thisWeekCount | 최근 7일 이내 완료한 세션 수 | Integer | N | 2 |
| completedStories | 전체 완료 세션 수 | Integer | N | 2 |
| avgChildSentences | 아이 발화 1건당 평균 문장 수(전체 세션 합산) | Number(double) | N | 1.6 |
| hasRecords | 기록이 하나라도 있는지. **`false`면 화면에 "0"을 나열하지 말고 "아직 기록이 없어요" 같은 문구로 대체하세요** | boolean | N | true |

**Example**

```json
{
  "child": { "id": "3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5", "name": "민준", "avatarId": "fox", "age": 8 },
  "thisWeekCount": 2,
  "completedStories": 2,
  "avgChildSentences": 1.6,
  "hasRecords": true
}
```

**Status**

| status | response content |
| --- | --- |
| 200 | 조회 성공 |
| 401 | 로그인 안 됨 |
| 403 | 다른 보호자의 아이 |
| 404 | 존재하지 않는 `childId` |

---

### 10.2 `GET /parent/reports` — 리포트 목록

**설명**: 보호자가 볼 수 있는 리포트(완료된 세션) 목록과, 최근 4주 발화 추이 그래프 데이터를 반환합니다.

**사전 조건**: 로그인 필요, `childId`는 본인 소유 아이.

**Request**

**Query parameter**

| key | 설명 | value 타입 | 필수 | 예시 |
| --- | --- | --- | --- | --- |
| childId | 조회 기준 아이 id | UUID(string) | Y | "3ba024ff-..." |

```
GET /parent/reports?childId=3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5
```

**Response**

| key | 설명 | value 타입 | Nullable | 예시 |
| --- | --- | --- | --- | --- |
| children[] | **이 보호자의 전체 아이 목록**(전환 칩 UI용). `childId` 파라미터와 무관하게 항상 전체가 옵니다 | array | N | 아래 참조 |
| children[].id | 아이 id | UUID(string) | N | "3ba024ff-..." |
| children[].name | 아이 이름 | String | N | "민준" |
| weeklyTrend[] | 최근 4주, 오래된 주 → 최신 주 순서(4개 고정) | array | N | 아래 참조 |
| weeklyTrend[].weekLabel | 주 라벨. 가장 최근이 `"이번 주"`, 그 외 `"N주 전"` | String | N | "이번 주" |
| weeklyTrend[].utteranceCount | 그 주의 아이 발화 수 | Integer | N | 8 |
| trendMessage | 추이 문구. **근거 없는 추세를 말하지 않음** — 직전 주보다 늘었을 때만 문구가 오고, 판단할 기록 자체가 없으면 `null` | String | Y | "말하기 문장 수가 늘고 있어요" |
| reports[] | 세션 목록. **필터 조건은 "완료 여부"가 아니라 "아이 발화가 1건이라도 있는지"입니다** — 발화가 전혀 없는 세션만 제외되고, `in_progress`/`post_activity`/`stopped` 세션도 발화가 있으면 포함됩니다 (아래 주의 참고) | array | N | 아래 참조 |
| reports[].sessionId | 세션 id. **10.3 상세 조회에 이 값을 사용** | UUID(string) | N | "58291471-..." |
| reports[].storyTitle | 이야기 제목 | String | N | "방귀 뀌는 며느리" |
| reports[].coverImageUrl | 표지. 현재 항상 `null` | String | Y | null |
| reports[].date | **이미 `yyyy.MM.dd`로 가공된 날짜 문자열**(이 목록에서만 예외적으로 원본 Instant가 아님) | String | N | "2026.08.12" |
| reports[].status | 세션 상태: `in_progress`/`post_activity`/`completed`/`stopped` | String | N | "completed" |

**⚠️ 프론트가 반드시 처리해야 할 것**: 이 목록에는 `status`가 `completed`가 아닌 세션(아직 진행 중이거나 중단된 세션)도 함께 옵니다 — 필터 기준이 "발화가 있는지"이지 "완료됐는지"가 아니기 때문입니다. 하지만 **10.3 상세 조회는 `completed` 세션에만 리포트가 존재**하므로, `status !== "completed"`인 행은 클릭을 막거나("아직 진행 중이에요" 안내로 대체) 눌러도 404가 날 수 있음을 감안해서 화면을 구성하세요.

**Example**

```json
{
  "children": [{ "id": "3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5", "name": "민준" }],
  "weeklyTrend": [
    { "weekLabel": "3주 전", "utteranceCount": 0 },
    { "weekLabel": "2주 전", "utteranceCount": 0 },
    { "weekLabel": "1주 전", "utteranceCount": 0 },
    { "weekLabel": "이번 주", "utteranceCount": 36 }
  ],
  "trendMessage": "기록이 조금씩 모이고 있어요",
  "reports": [
    { "sessionId": "58291471-0cc9-4f21-b80d-b576901ab1ae", "storyTitle": "방귀 뀌는 며느리", "coverImageUrl": null, "date": "2026.08.12", "status": "completed" }
  ]
}
```

**Status**

| status | response content |
| --- | --- |
| 200 | 조회 성공 |
| 401 | 로그인 안 됨 |
| 403 | 다른 보호자의 아이 |
| 404 | 존재하지 않는 `childId` |

---

### 10.3 `GET /parent/reports/{sessionId}` — 리포트 상세

**설명**: 특정 세션의 말하기 역량 분석·대표 발화·가정 연계 대화 가이드를 반환합니다. **`POST /sessions/{id}/activity/retelling`(8.3) 호출 시점에 딱 한 번 생성되어 저장된 결과**를 그대로 돌려줍니다 — 조회할 때마다 다시 계산하지 않으므로, 세션이 완료되기 전에는 이 API를 호출해도 404가 납니다.

**⚠️ 중요 — 점수·등급이 없습니다.** 이 리포트는 "몇 점"이 아니라 "이번에 어떤 말을 했는지"를 보여주는 방식입니다. 4점 만점 dot 같은 수치화 UI를 그리지 마세요(주최측 가이드가 명시적으로 금지).

**사전 조건**: 로그인 필요, 세션이 본인 소유여야 함. **세션이 `completed` 상태여야 리포트가 존재합니다** — 진행 중인 세션의 `sessionId`로 호출하면 404가 납니다.

**Request**

**Path parameter**

| key | 설명 | value 타입 | 예시 |
| --- | --- | --- | --- |
| sessionId | 완료된 세션 id | UUID(string) | "58291471-0cc9-4f21-b80d-b576901ab1ae" |

```
GET /parent/reports/58291471-0cc9-4f21-b80d-b576901ab1ae
```

**Response**

| key | 설명 | value 타입 | Nullable | 예시 |
| --- | --- | --- | --- | --- |
| sessionId | 세션 id | UUID(string) | N | "58291471-..." |
| storyTitle | 이야기 제목 | String | N | "방귀 뀌는 며느리" |
| date | **`yyyy.MM.dd`로 가공된 날짜**(10.2와 동일 규칙) | String | N | "2026.08.12" |
| summary | 한 줄 요약 문구 | String | N | "이번 이야기에서 아이가 18번 말했어요…" |
| vocabulary.mainWords | 아이가 사용한 주요 어휘(빈도순 상위 6개) | String[] | N | ["모르겠어요", "조금", ...] |
| vocabulary.repeated | 반복 사용한 표현(2회 이상, 상위 3개) | String[] | N | ["모르겠어요"] |
| vocabulary.feedback | 어휘 사용에 대한 문구. **항상 긍정적 톤**(부족해도 "부족하다"고 말하지 않음) | String | N | "자주 쓴 말이 있어요. 비슷한…" |
| competencies[] | 역량 카드 **정확히 5개**(관점과 공감 / 감정 표현 / 상호작용 / 생각과 이유 / 결과와 해결), 이 순서로 고정 | array | N | 아래 참조 |
| competencies[].name | 역량명(그대로 화면에 노출 가능한 한글 표기) | String | N | "관점과 공감" |
| competencies[].feature | 이번 활동에서 나타난 특징 서술 | String | N | "다른 인물의 처지를 헤아려…" |
| competencies[].evidence | 근거가 되는 실제 발화. **이 역량이 이번 세션에서 확인되지 않았으면 `null`** | String | Y | "음, 잘 모르겠어요…" |
| competencies[].strength | 잘한 점(항상 먼저 안내할 것) | String | N | "상대가 왜 그렇게 느꼈을지…" |
| competencies[].next | 보완할 부분/다음에 시도해볼 질문 제안 | String | N | "\"그 사람은 어떤 마음이었을까?\"처럼…" |
| elementCounts[] | 사고 요소를 아이 화면과 같은 4그룹으로 집계한 막대그래프용 데이터. **항상 4개**(마음/이유/생각/방법 순), 개수가 0인 그룹도 포함됨 | array | N | 아래 참조 |
| elementCounts[].label | 그룹명(한글, 그대로 노출 가능) | String | N | "생각" |
| elementCounts[].count | 이 세션에서 이 그룹에 속하는 사고 요소가 감지된 총 횟수(장면 구분 없이 세션 전체 누적, 중복 허용) | Integer | N | 3 |
| representative | 대표 발화 **1건**. 발화 기록이 전혀 없으면 `null` | object | Y | 아래 참조 |
| representative.text | 대표로 선정된 발화 원문 | String | N | "음, 잘 모르겠어요. 조금 더 생각해볼게요." |
| representative.sceneLabel | 발화가 나온 장면(화면 단위 "장면 N") | String | N | "장면 2" |
| representative.reason | 이 발화를 대표로 고른 이유(한 문장) | String | N | "생각과 그 까닭이 한 번에 이어져…" |
| guide.intro | 가정 연계 대화 가이드 도입 문구 | String | N | "학습 과제가 아니라, 오늘 나눈…" |
| guide.storyQuestions[] | "이야기 주제 이어가기" 질문 목록(2개) | String[] | N | ["시아버지는 처음에 왜…", "..."] |
| guide.dailyQuestions[] | "일상생활로 연결하기" 질문 목록(2개) | String[] | N | ["친구가 자신의 특징 때문에…", "..."] |

**주의**: `competencies[].name`, `elementCounts[].label`처럼 이 리포트 안의 문자열은 **전부 이미 사람이 읽는 한글**입니다. 다른 API의 `accumulatedElements`(영문 코드, 예: `"PERSPECTIVE"`)와 혼동하지 마세요 — 이 API는 내부 코드를 노출하지 않는 것이 원칙이라 서버가 이미 변환해서 줍니다.

**Example**

```json
{
  "sessionId": "58291471-0cc9-4f21-b80d-b576901ab1ae",
  "storyTitle": "방귀 뀌는 며느리",
  "date": "2026.08.12",
  "summary": "이번 이야기에서 아이가 18번 말했어요. 아래는 그 말들을 바탕으로 정리한 내용입니다.",
  "vocabulary": {
    "mainWords": ["모르겠어요", "조금", "생각해볼게요", "창피해서", "계속", "참았던"],
    "repeated": ["모르겠어요", "조금", "생각해볼게요"],
    "feedback": "자주 쓴 말이 있어요. 비슷한 뜻의 다른 낱말도 함께 알려주면 표현이 넓어져요."
  },
  "competencies": [
    {
      "name": "관점과 공감",
      "feature": "다른 인물의 처지를 헤아려 말한 부분이 있었어요.",
      "evidence": "음, 잘 모르겠어요. 조금 더 생각해볼게요.",
      "strength": "상대가 왜 그렇게 느꼈을지 먼저 생각해 본 점이 좋았어요.",
      "next": "\"그 사람은 어떤 마음이었을까?\"처럼 상대의 입장을 묻는 질문을 해보세요."
    },
    {
      "name": "감정 표현",
      "feature": "감정을 나타내는 말은 아직 자주 나오지 않았어요.",
      "evidence": null,
      "strength": "상황을 차분히 설명한 점이 좋았어요.",
      "next": "\"그때 어떤 기분이었어?\"를 덧붙여 감정과 이유를 함께 말해보게 해주세요."
    },
    {
      "name": "상호작용",
      "feature": "상대에게 부탁하거나 요청하는 말은 아직 적었어요.",
      "evidence": null,
      "strength": "끝까지 이야기에 집중한 점이 좋았어요.",
      "next": "\"누구에게 어떻게 말하면 좋을까?\"로 요청을 연습해 보세요."
    },
    {
      "name": "생각과 이유",
      "feature": "판단은 말했지만 까닭은 아직 짧게 지나갔어요.",
      "evidence": null,
      "strength": "자기 생각을 망설이지 않고 말한 점이 좋았어요.",
      "next": "\"왜 그렇게 생각했어?\"를 한 번 더 물어봐 주세요."
    },
    {
      "name": "결과와 해결",
      "feature": "해결 방법이나 그 뒤에 벌어질 일은 아직 적게 나왔어요.",
      "evidence": null,
      "strength": "이야기를 끝까지 따라간 점이 좋았어요.",
      "next": "\"그러면 그다음엔 어떻게 될까?\"로 결과를 상상하게 해보세요."
    }
  ],
  "elementCounts": [
    { "label": "마음", "count": 0 },
    { "label": "이유", "count": 0 },
    { "label": "생각", "count": 3 },
    { "label": "방법", "count": 0 }
  ],
  "representative": {
    "text": "음, 잘 모르겠어요. 조금 더 생각해볼게요.",
    "sceneLabel": "장면 2",
    "reason": "생각과 그 까닭이 한 번에 이어져, 아이의 말하기 강점이 가장 잘 드러난 발화예요."
  },
  "guide": {
    "intro": "학습 과제가 아니라, 오늘 나눈 이야기를 자연스럽게 이어가기 위한 질문이에요.",
    "storyQuestions": [
      "며느리는 사람들 앞에서 방귀를 뀌었을 때 어떤 기분이었을까?",
      "며느리의 마음을 기분 날씨로 표현하면 맑음, 흐림, 비 중 무엇일까? 왜 그렇게 생각했어?"
    ],
    "dailyQuestions": [
      "너도 창피해서 하고 싶은 말을 하지 못한 적이 있어?",
      "그때 어떤 일이 있었고, 왜 창피했어?"
    ]
  }
}
```

**Status**

| status | response content |
| --- | --- |
| 200 | 조회 성공 |
| 401 | 로그인 안 됨 |
| 403 | 다른 보호자의 세션 |
| 404 | 존재하지 않는 `sessionId`, **또는 세션이 아직 완료되지 않아 리포트가 없음** |

---

## 11. 마이페이지

### 11.1 `GET /mypage` — 아이 마이페이지

**설명**: 아이 본인이 보는 마이페이지(프로필, 활동 통계, 완료한 이야기, 다시 말하기 목록)에 필요한 데이터를 한 번에 반환합니다.

**사전 조건**: 로그인 필요, `childId`는 본인 소유 아이.

**Request**

**Query parameter**

| key | 설명 | value 타입 | 필수 | 예시 |
| --- | --- | --- | --- | --- |
| childId | 조회할 아이 id | UUID(string) | Y | "3ba024ff-..." |

```
GET /mypage?childId=3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5
```

**Response**

| key | 설명 | value 타입 | Nullable | 예시 |
| --- | --- | --- | --- | --- |
| child.id | 아이 id | UUID(string) | N | "3ba024ff-..." |
| child.name | 아이 이름 | String | N | "민준" |
| child.avatarId | 아바타 id | String | Y | "fox" |
| child.age | 나이 | Integer | N | 8 |
| stats.completedStories | 완료한 이야기 수 | Integer | N | 2 |
| stats.savedWords | 단어장에 저장한 단어 수(필터 없이 전체) | Integer | N | 1 |
| stats.activeDays | 활동한 날짜 수(distinct, 이 아이의 모든 세션의 모든 메시지 날짜 기준) | Integer | N | 1 |
| completedStories[] | 완료한 이야기 목록 | array | N | 아래 참조 |
| completedStories[].sessionId | 세션 id | UUID(string) | N | "58291471-..." |
| completedStories[].storyId | 이야기 id | UUID(string) | N | "c1143ded-..." |
| completedStories[].title | 이야기 제목 | String | N | "방귀 뀌는 며느리" |
| completedStories[].coverImageUrl | 표지. 현재 항상 `null` | String | Y | null |
| completedStories[].completedAt | 완료 시각. **가공되지 않은 원본 `Instant`**(10장 리포트와 달리 `yyyy.MM.dd` 변환 안 됨 — 프론트에서 원하는 형식으로 직접 포맷하세요) | Instant(string) | N | "2026-08-12T12:01:54.409122Z" |
| retellings[] | 다시 말하기(재구성 발화) 목록. **오디오가 아니라 텍스트입니다** — "들어보기" 버튼은 이 텍스트를 TTS로 읽어주는 방식으로 구현하세요(원본 음성은 저장되지 않음) | array | N | 아래 참조 |
| retellings[].sessionId | 세션 id | UUID(string) | N | "58291471-..." |
| retellings[].storyTitle | 이야기 제목 | String | N | "방귀 뀌는 며느리" |
| retellings[].text | 재구성 발화 텍스트 | String | N | "옛날에 며느리가 방귀를…" |
| retellings[].createdAt | 생성 시각(원본 Instant) | Instant(string) | N | "2026-08-12T12:01:54.409122Z" |

**활동이 전혀 없는 아이 조회 시**: 에러 없이 200이 나며, `stats` 전부 0, `completedStories`/`retellings` 둘 다 빈 배열로 옵니다.

**Example**

```json
{
  "child": { "id": "3ba024ff-8f6c-4bdf-9ffa-a5b417df56d5", "name": "민준", "avatarId": "fox", "age": 8 },
  "stats": { "completedStories": 2, "savedWords": 1, "activeDays": 1 },
  "completedStories": [
    { "sessionId": "58291471-0cc9-4f21-b80d-b576901ab1ae", "storyId": "c1143ded-ed81-4b79-b4c0-c12c2694d5ab", "title": "방귀 뀌는 며느리", "coverImageUrl": null, "completedAt": "2026-08-12T12:01:54.409122Z" }
  ],
  "retellings": [
    { "sessionId": "58291471-0cc9-4f21-b80d-b576901ab1ae", "storyTitle": "방귀 뀌는 며느리", "text": "옛날에 며느리가 방귀를 오래 참다가…", "createdAt": "2026-08-12T12:01:54.409122Z" }
  ]
}
```

**Status**

| status | response content |
| --- | --- |
| 200 | 조회 성공 (활동 없어도 200 + 빈 값들) |
| 401 | 로그인 안 됨 |
| 403 | 다른 보호자의 아이 |
| 404 | 존재하지 않는 `childId` |

---

## 12. 운영 (프론트 사용 대상 아님)

### 12.1 `GET /health` — 헬스체크

**설명**: 서버와 DB가 살아있는지 확인하는 운영용 엔드포인트입니다. 배포 플랫폼의 슬립 방지·모니터링 목적이며, **프론트 화면 어디에서도 호출할 필요가 없습니다.** 인증도 필요 없습니다.

**Response 예시**: `{"status": "ok"}` (200) / `{"status": "down"}` (503)

---

## 부록 A. 값 참고표

### A.1 세션 상태(`status` / `sessionStatus`)

| 값 | 의미 |
| --- | --- |
| `in_progress` | 대화 장면 진행 중 |
| `post_activity` | 대화 끝, 말하기 후 활동(카드 맞추기·재구성 말하기) 진행 중 |
| `completed` | 전부 완료 |
| `stopped` | 중간에 나가서 중단됨(재시작 또는 이야기 나가기로 인해) |

### A.2 장면 종류(`sceneType`)

| 값 | 의미 | 진행 방법 |
| --- | --- | --- |
| `intro` | 도입(1번 장면 고정) | `POST .../scenes/{id}/complete` |
| `narrative` | 전개(서술만) | `POST .../scenes/{id}/complete` |
| `dialogue` | 대화(캐릭터와 발화 주고받음) | `POST .../messages` |

### A.3 발화 응답 모드(`responseMode`)

| 값 | 의미 |
| --- | --- |
| `normal` | 일반 반응 |
| `guided` | 캐릭터가 부드럽게 유도 중(대사에 자연스럽게 녹아 있음, 별도 UI 불필요) |
| `closing` | 장면 마무리(고정 대사) |

### A.4 사고 요소 8종 (내부 코드 — 화면에 그대로 노출 금지)

`DECISION`, `REASON`, `PERSPECTIVE`, `SOLUTION`, `RESULT`, `EMOTION`, `EMPATHY`, `REQUEST`

권장 4그룹 매핑(아이 화면 뱃지·리포트 `elementCounts`에서 서버가 이미 이 매핑을 적용해서 줌):

| 그룹 | 포함 코드 |
| --- | --- |
| 마음 | `EMOTION`, `EMPATHY` |
| 이유 | `REASON` |
| 생각 | `PERSPECTIVE`, `DECISION`, `RESULT` |
| 방법 | `SOLUTION`, `REQUEST` |

### A.5 화자 종류(`speakerType`)

| 값 | 의미 |
| --- | --- |
| `child` | 아이 발화 |
| `character` | 캐릭터 대사 |
| `system` | 내부 기록용(미션 노출 등). **`GET /sessions/{id}`의 `messages[]`에는 나타나지 않음** |

### A.6 화면 단위 장면 번호 변환

DB는 장면을 1~9번(도입1·전개4·대화4)으로 관리하지만, 화면은 4구간으로 보여줍니다. 변환식은 `화면단위 = DB단위 / 2` (정수 나눗셈, 소수점 버림)입니다.

| DB `sceneOrder` | 화면 단위 |
| --- | --- |
| 1 (도입) | 0 (진행바 밖) |
| 2, 3 | 1 |
| 4, 5 | 2 |
| 6, 7 | 3 |
| 8, 9 | 4 |

이 변환은 `GET /home`의 `sceneProgress.current`, `GET /wordbook`의 `sceneIndex`, 리포트의 `representative.sceneLabel`에서 전부 동일하게 적용됩니다.

---

## 부록 B. 아직 없는 값에 대한 안내

프론트 작업 중 아래 값들이 계속 `null`이거나 빈 값으로 오는 걸 보게 될 텐데, **버그가 아니라 의도된 상태**입니다.

| 값 | 상태 | 이유 |
| --- | --- | --- |
| `coverImageUrl`, `backgroundImageUrl`, `characterImageUrl`, 카드 `imageUrl` | 항상 `null` | 이미지 에셋을 아직 전달받지 못했습니다(주최측 자료 수령 대기). URL 컬럼 자체는 이미 준비돼 있어 나중에 값만 채워지면 프론트 코드 변경 없이 동작합니다. |
| `highlightWords` | 대부분의 턴에서 빈 배열 | 캐릭터 응답에 미리 정해둔 후보 단어가 실제로 등장한 턴에서만 채워집니다. 매 턴 채워지는 게 아니라 정상입니다. |
| `mypage`의 `stats.savedWords`, 후속활동 `stats.newWordCount` | `newWordCount`는 항상 0 | "이번 세션에서 새로 저장한 단어" 집계 기준이 아직 없습니다(단어장이 세션과 직접 연결되지 않은 구조라서). `mypage.stats.savedWords`는 전체 누적이라 정상 동작합니다. |
| `characterState` | `closing` 응답에서 항상 `null` | `closing`은 AI를 호출하지 않고 미리 검수된 고정 문구(`character_closing`)를 쓰므로 AI가 상태값을 줄 기회가 없습니다. `normal`/`guided`에서는 AI가 실제로 값을 주면 채워집니다(D-27) — 다만 실제 AI 서버가 아직 없어 로컬은 목(mock) 서버 고정값(`MOVED`)만 옵니다. |
| `missionProgress` | 미션 노출 전·`closing`에서 `null`, 노출 시점 이후엔 `satisfiedIndexes`가 대부분 빈 배열 | 대화3·4가 아닌 장면(미션 없음)에선 항상 `null`입니다. 노출 시점 직후엔 아직 아이가 항목을 말하기 전이라 빈 배열이 정상이고, 발화가 쌓일수록 채워집니다(D-30). |

---

## 부록 C. 자체 점검 결과

이 문서를 작성한 뒤, 실제 컨트롤러/서비스/DTO 코드와 하나씩 다시 대조해 아래를 확인했습니다.

- [x] 엔드포인트 경로·HTTP 메서드가 실제 `@RequestMapping`/`@GetMapping` 등과 일치
- [x] 응답 필드명이 실제 DTO(record) 필드명과 camelCase 기준으로 일치
- [x] Nullable 여부가 실제 코드 분기(예: `evidence`는 매칭 안 되면 `null`, `correctOrder`는 조건부 생략 등)와 일치
- [x] 상태 코드가 실제 `ErrorCode`/`@ResponseStatus` 값과 일치
- [x] `POST .../activity/order`의 `@JsonInclude(NON_NULL)`로 인한 "키 생략"과 다른 API들의 "값이 null로 옴"을 구분해서 명시
- [x] 리포트(10.3)만 날짜가 가공된 문자열이고 마이페이지(11.1)는 원본 Instant인 차이를 명시(실제 서비스 코드의 `DATE_FORMAT` 적용 여부 차이와 일치)
- [x] 세션당 `messages[]`가 `system` 화자를 제외하는 점, `accumulatedElements`가 장면 전환 시 초기화되는 점 등 "당연히 헷갈릴 수 있는" 동작을 본문에 명시
