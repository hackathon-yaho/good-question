# 기존 DB의 미션 턴 컬럼 마이그레이션 요청

- **요청자**: AI 파트
- **작성일**: 2026-08-15
- **우선순위**: 필수

## 배경

D-50 최신 코드의 `StorySession`은 `mission_engaged_turns`, `mission_free_guided_turns_used`를 사용합니다. 기존 로컬 PostgreSQL DB에는 이 두 컬럼이 없어, 로그인 뒤 `GET /api/children`이 세션 조회 중 500으로 실패했습니다. `ddl-auto=update`만으로 기존 데이터가 있는 테이블의 새 `NOT NULL` 컬럼을 안정적으로 보정하지 못했습니다.

## 요청사항

- 기존 `story_sessions` 테이블에 아래 컬럼을 멱등적으로 추가하는 DB 마이그레이션을 제공해 주세요.
  - `mission_engaged_turns integer NOT NULL DEFAULT 0`
  - `mission_free_guided_turns_used integer NOT NULL DEFAULT 0`
- 기존 세션 데이터는 보존하고, 두 컬럼의 기존 행 값은 `0`으로 보정해 주세요.
- 개발 환경에서 수동 SQL 실행에 의존하지 않도록, 새 checkout·기존 DB 모두에 적용 가능한 방식을 사용해 주세요.
- API 계약과 AI 서버 코드는 변경하지 않습니다.

## 완료 조건

- [ ] 기존 DB로 백엔드를 재시작해도 두 컬럼 누락 SQL 오류가 없다.
- [ ] `POST /api/auth/dev-login` 뒤 `GET /api/children`이 200으로 응답한다.
- [ ] 기존 `story_sessions` 행이 삭제·초기화되지 않는다.
