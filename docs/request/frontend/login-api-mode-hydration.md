# 로그인 개발 연동 모드 hydration 오류 수정 요청

- **요청자**: AI 파트
- **작성일**: 2026-08-15
- **우선순위**: 필수

## 배경

`/login?api=backend&speech=backend`에서 서버 렌더는 `mock`, 브라우저 첫 렌더는 `backend`를 표시해 React recoverable hydration 오류가 발생합니다. 로그인 화면의 개발용 모드 문구와 `dev-login` 버튼 조건이 같은 전역 `API_MODE`를 사용하기 때문입니다.

## 화면 / 경로

| 화면명 | 경로 | 설명 |
| --- | --- | --- |
| 로그인 | `/login?api=backend` | 백엔드 연동 테스트용 개발 로그인 |

## 사용자 흐름

1. 개발자가 백엔드 실행 후 `/login?api=backend`로 접속한다.
2. 초기 서버 HTML과 브라우저 첫 렌더가 같은 연동 모드를 표시한다.
3. `카카오 없이 로그인(dev-login)`으로 백엔드 쿠키 로그인을 진행한다.

## 요청사항

- 서버 렌더 결과에 영향을 주는 값은 모듈 초기화 시점의 `window.location`에서 읽지 않는다.
- 로그인 페이지는 Next.js의 `searchParams` 서버 prop을 클라이언트 컴포넌트에 전달하거나, `useSyncExternalStore` 등 hydration-safe 방식으로 개발 모드를 표시한다.
- `NEXT_PUBLIC_API_MODE=backend` 로컬 설정과 `?api=backend` URL 전환을 모두 유지한다.
- API 필드와 백엔드 동작은 변경하지 않는다.

## 상태별 처리

| 상태 | 화면 처리 |
| --- | --- |
| `api=backend` | 초기부터 `backend` 표기와 dev-login 버튼을 일치하게 표시 |
| `api=mock` 또는 미지정 | 설정된 빌드 모드를 일치하게 표시 |
| 잘못된 쿼리값 | 설정된 빌드 모드로 안전하게 처리 |

## 완료 조건

- [ ] `/login?api=backend` 새로고침 시 hydration recoverable error가 없다.
- [ ] `backend` 표기와 dev-login 버튼이 첫 렌더부터 함께 나타난다.
- [ ] `npm run lint`가 통과한다.
