# 환경 · 세팅

- **작성일**: 2026-08-12
- **결정 근거**: [decisions.md](decisions.md) D-13 · D-14

---

## 1. 스택

| 영역 | 값 | 출처 |
| --- | --- | --- |
| 프레임워크 | Spring Boot | [PRD 9.1](../../docs/product/prd.md) 확정 |
| DB | PostgreSQL | [PRD 9.1](../../docs/product/prd.md) 확정 |
| 인증 | Spring Security + JWT | [PRD 9.1](../../docs/product/prd.md) 확정 |
| 소셜 로그인 | 카카오 (단독) | D-06 |
| STT / TTS | OpenAI Whisper · OpenAI TTS | D-01 |
| 스키마 관리 | JPA `ddl-auto` (Flyway 미도입) | D-14 |
| 배포 | Render (무료) | [PRD 9.1](../../docs/product/prd.md) 확정 |
| 배포 DB | Supabase Postgres | D-13 |

### 문서에 없는 항목

[PRD 9.2](../../docs/product/prd.md)가 **미정**으로 남긴 것들입니다. 아래는 기본값이며 바꿔도 무방합니다.

| 항목 | 기본값 |
| --- | --- |
| JDK | 21 (LTS) |
| Spring Boot | 3.x |
| 빌드 툴 | Gradle |

---

## 2. 로컬 개발

### DB

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: goodquestion
      POSTGRES_USER: gq
      POSTGRES_PASSWORD: gq
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

스키마가 꼬이면 되살리려 하지 말고 **볼륨을 지우고 다시 올리는 게 빠릅니다.**
`ddl-auto=update`는 컬럼을 지우지 않습니다.

### 포트

[api.md 2.1](../../docs/spec/api.md) 기준입니다.

| 대상 | 포트 |
| --- | --- |
| 프론트 | 3000 |
| **백엔드** | **8080** |
| AI 서버 | 8000 |

---

## 3. 환경변수

| 변수 | 용도 | 비고 |
| --- | --- | --- |
| `SPRING_DATASOURCE_URL` | DB 연결 | 로컬 Docker ↔ Supabase를 **이 값만 바꿔** 전환 |
| `SPRING_DATASOURCE_USERNAME` | | |
| `SPRING_DATASOURCE_PASSWORD` | | |
| `JWT_SECRET` | 토큰 서명 | 32자(바이트) 이상. **없으면 부팅 자체가 실패한다** |
| `JWT_ACCESS_VALIDITY` | 액세스 토큰 유효기간(ms) | 기본 7일. refresh token 없음 (D-18) |
| `KAKAO_CLIENT_ID` | 카카오 OAuth | Redirect URI는 코드에서 `{baseUrl}/login/oauth2/code/kakao`로 고정 조립됨. **비어 있으면 부팅 자체가 실패한다** — 값 없이 작업할 때는 placeholder를 넣어둘 것 |
| `KAKAO_CLIENT_SECRET` | 〃 | Client Secret 미발급 시 비워도 컴파일·부팅은 되나 실제 로그인은 `invalid_client`로 실패할 수 있음 |
| `FRONTEND_URL` | 로그인 성공/실패 후 리다이렉트 대상 | 뒤에 `/auth/callback`이 자동으로 붙음 |
| `COOKIE_SECURE` | JWT 쿠키 `Secure`·`SameSite` 전환 | 로컬(http) `false` / 배포(https) `true`. Vercel↔Render 크로스 도메인이라 배포는 `SameSite=None`이 필요 |
| `OPENAI_API_KEY` | **Whisper · TTS 전용** | 백엔드 담당 키 (D-16). AI 서버 키와 별개 |
| `AI_SERVER_BASE_URL` | AI 서버 주소 | **미결 U-01.** mock 단계에서는 로컬 스텁 주소 |
| `AI_SERVER_INTERNAL_TOKEN` | 내부 호출 인증 | 미결 U-01. `X-Internal-Token` 헤더 |
| `CORS_ALLOWED_ORIGINS` | 프론트 오리진(콤마 구분) | `Access-Control-Allow-Credentials`가 켜져 있어 쿠키 인증에 필수 |

**`OPENAI_API_KEY`는 백엔드 것만 둡니다.** `gpt-5-mini` 호출은 AI 서버가 자기 키로 합니다 (D-16).

**개발용 인증 우회**: `POST /api/auth/dev-login`으로 카카오 없이 JWT를 즉시 발급받을 수 있습니다.
`Authorization: Bearer {accessToken}` 헤더로도 인증되므로 Postman/curl에서 쿠키 없이 테스트
가능합니다. **시연 배포 전 반드시 제거합니다.**

---

## 4. JPA 주의사항

### 타입 매핑

PostgreSQL 전용 타입이 섞여 있어 엔티티에 명시가 필요합니다.

| 컬럼 | 타입 |
| --- | --- |
| `stories.topics` | `text[]` |
| `story_scenes.required_elements` | `text[]` |
| `story_sessions.accumulated_elements` | `text[]` |
| `story_sessions.last_detected_elements` | `text[]` |
| `post_activity_results.submitted_order` | `text[]` |
| `story_scenes.element_criteria` | `jsonb` |
| `stories.post_activity_config` | `jsonb` |
| `utterance_analyses.detected_elements` | `jsonb` |
| `tts_cache.audio` | `bytea` |

`jsonb`는 `@JdbcTypeCode(SqlTypes.JSON)`, 배열은 Hibernate 6의 배열 매핑을 씁니다.
**엔티티를 다 만들고 나서 기동 한 번 해보고 타입이 맞는지 확인하세요.** 여기서 시간을 많이 씁니다.

### 조건부 NOT NULL

`story_scenes`의 대화 관련 컬럼은 `scene_type = dialogue`일 때만 값이 있습니다
([PRD I-05](../../docs/product/prd.md)). **엔티티에 `nullable = false`를 걸면 도입·전개 장면 시드가 실패합니다.**

대상: `conflict`, `character_name`, `character_opening`, `character_closing`,
`scene_goal`, `required_elements`, `element_criteria`, `preferred_turns`, `max_turns`

---

## 5. 시드 데이터

`ddl-auto`는 테이블만 만들고 **데이터를 넣어주지 않습니다.**

- 시드는 `data.sql` 또는 기동 시 러너로 넣습니다
- **중복 삽입 방지 조건을 반드시 겁니다.** 두 번 기동하면 장면이 18건이 됩니다
- 값 위치는 [work-items.md 2장](work-items.md) 참조. 이 문서에 값을 복사하지 않습니다

`element_criteria`는 AI 담당 튜닝 결과로 계속 바뀝니다. **재배포 없이 `UPDATE`할 수 있어야 합니다**
([PRD 8.7](../../docs/product/prd.md)).

---

## 6. 배포

### 구성

```
Vercel (프론트) ──▶ Render (백엔드) ──▶ AI 서버
                        │
                        └──▶ Supabase Postgres
```

### 무료 티어 제약

| 대상 | 제약 | 대응 |
| --- | --- | --- |
| Render | 15분 무활동 시 슬립. 콜드 스타트 수십 초 | **외부 크론 10분 핑** |
| Render | 파일시스템이 재배포·재시작 시 초기화 | DB에 저장. **컨테이너 안에 Postgres 금지** (D-13), TTS 캐시도 DB (D-05) |
| Supabase | 미사용 시 프로젝트 일시 정지 | 같은 크론 핑에 `SELECT 1` 포함. 기간·한도는 **미결 U-05** |

### 헬스체크

```
GET /health  →  SELECT 1 실행 후 200
```

DB를 건드려야 **Render 슬립과 Supabase 일시정지를 한 번에** 막습니다.
`SELECT 1` 없이 응답만 하면 Supabase는 계속 놀고 있는 것으로 판정됩니다.

### 시연 전 체크

- [ ] 15분 방치 후 첫 요청이 응답하는가
- [ ] TTS 프리워밍 11건이 캐시에 있는가 (재배포 후에도)
- [ ] 크론 핑이 돌고 있는가
- [ ] Supabase 프로젝트가 활성 상태인가
- [ ] STT / 발화 전송 / TTS 각 구간 실측 시간을 프론트에 전달했는가 (U-02)
