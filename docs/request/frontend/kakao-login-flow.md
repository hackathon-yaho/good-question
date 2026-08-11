# 카카오 로그인 — 리다이렉트 방식으로 확정

- **요청자**: 백엔드 담당
- **작성일**: 2026-08-12
- **우선순위**: 필수

## 배경

[api.md 3.1](../../spec/api.md)의 원안(`POST /api/auth/{provider}` — 프론트가 카카오 SDK로
authorizationCode를 받아 백엔드에 전달)을 **폐기했습니다.** 대신 백엔드가 카카오 로그인 전
과정을 처리하는 **리다이렉트 방식**으로 확정했습니다 ([decisions.md D-18](../../../backend/docs/decisions.md)).

**결론: 카카오 SDK 연동이 필요 없습니다.** 프론트가 만들 건 URL 이동 1곳과 콜백 페이지 1개뿐입니다.

## 화면 / 경로

| 화면 | 경로 | 설명 |
| --- | --- | --- |
| 로그인 버튼 | (기존 A-2) | 클릭 시 URL 이동만 |
| 콜백 페이지 (신규) | `/auth/callback` | 로그인 완료 후 도착. 분기 처리 |

## 사용자 흐름

```
1. 아이 "카카오로 로그인" 버튼 클릭
2. 프론트   window.location.href = "{백엔드}/api/oauth2/authorization/kakao"
3. 카카오   로그인 + 동의 화면 (프론트는 관여하지 않음)
4. 백엔드   JWT를 HttpOnly 쿠키로 설정
5. 백엔드   302 → "{프론트}/auth/callback?hasCompletedOnboarding=false"
6. 프론트   쿼리의 hasCompletedOnboarding으로 즉시 분기
            false → /onboarding/consent
            true  → /profiles
```

**로그인 실패 시**: `{프론트}/auth/callback?error=login_failed`로 리다이렉트됩니다.

## 요구사항

- 로그인 버튼은 `fetch`나 `axios` 호출이 아니라 **`window.location.href` 이동**입니다. API 호출이 아닙니다
- `/auth/callback` 페이지는 쿼리 파라미터만 읽고 분기하면 됩니다. **토큰을 직접 다루지 않습니다** — JWT는 HttpOnly 쿠키에 이미 담겨 있어 JS에서 읽을 수 없고, 읽을 필요도 없습니다
- 이후 모든 API 요청에 **`credentials: 'include'`** (fetch) 또는 `withCredentials: true`(axios)를 설정해야 쿠키가 실립니다. 이게 빠지면 로그인 직후에도 401이 납니다
- 로그인 상태를 다시 확인하고 싶을 때(새로고침 등)는 `GET /api/auth/me`를 호출하세요 — 인증되어 있으면 200 + 보호자 정보, 아니면 401입니다

## 상태별 처리

| 상태 | 화면 처리 |
| --- | --- |
| `hasCompletedOnboarding=false` | `/onboarding/consent`로 이동 |
| `hasCompletedOnboarding=true` | `/profiles`로 이동 |
| `error=login_failed` | 로그인 실패 안내 후 로그인 화면으로 |
| 콜백 페이지에 아무 쿼리도 없이 직접 진입 | `GET /api/auth/me` 호출해 로그인 여부 확인 후 처리 |

## 연동 API

| 메서드 | 경로 | 용도 |
| --- | --- | --- |
| — | `GET /api/oauth2/authorization/kakao` | 로그인 시작. **URL 이동으로만 호출** |
| GET | `/api/auth/me` | 로그인 상태 확인. 쿠키 자동 전송 필요 |
| POST | `/api/auth/logout` | 로그아웃. 쿠키 삭제 |

### `GET /api/auth/me`

```json
{ "id": "uuid", "name": "이혜민", "email": null, "hasCompletedOnboarding": false }
```

- 인증 안 됨 → 401 `{ "code": "UNAUTHORIZED", "message": "..." }`
- `email`은 `null`일 수 있습니다. 카카오 이메일 동의가 선택 항목이라 아이 등록·서비스 이용에는 영향 없습니다

## 지금 당장 테스트하고 싶다면

카카오 앱 등록이 끝나기 전까지는 아래로 로그인 흐름을 흉내낼 수 있습니다.

```
POST /api/auth/dev-login
```

호출하면 dev 보호자 계정으로 JWT 쿠키가 즉시 설정됩니다(카카오 없이). 응답에 `parentId`도
함께 옵니다. **이 엔드포인트는 시연 배포 전 제거됩니다** — 개발 중에만 쓰세요.

## 완료 조건

- [ ] 로그인 버튼이 `window.location.href`로 `/api/oauth2/authorization/kakao`로 이동한다
- [ ] `/auth/callback` 페이지가 `hasCompletedOnboarding` 쿼리로 올바르게 분기한다
- [ ] `error=login_failed` 케이스가 처리된다
- [ ] 이후 모든 API 호출에 `credentials: 'include'`가 설정되어 있다
- [ ] `dev-login`으로 로그인 흐름을 먼저 검증했다 (카카오 앱 등록 전)

## 아직 못 정한 것

카카오 개발자 앱이 아직 등록되지 않았습니다 (사용자 외부 작업, 진행 중). 그 전까지는
실제 카카오 로그인 버튼을 눌러도 동작하지 않습니다 — `dev-login`으로 개발을 진행해주세요.

---

**백엔드 쪽 상세**: [backend/docs/decisions.md](../../../backend/docs/decisions.md) D-18
