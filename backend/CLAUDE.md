# CLAUDE.md

> **Response language:** Always reply in **Korean (한국어)**.

프로젝트 배경·작업 계획·확정 결정은 [docs/](docs/)를 먼저 확인하세요. 특히 [docs/decisions.md](docs/decisions.md)가
"왜 이렇게 정했는지"를 담고 있고, [docs/plan.md](docs/plan.md)가 지금 무엇을 할 차례인지 알려줍니다.
스키마·콘텐츠·대화 엔진 규칙의 실제 값은 이 폴더가 아니라 [../docs/product/prd.md](../docs/product/prd.md)가 정본입니다.

---

## Commands

```bash
./gradlew clean build   # build
./gradlew bootRun       # run
./gradlew test          # test
docker-compose up -d    # start local Postgres before running
```

---

## Architecture

Spring Boot 3.4.5 / Java 21 / Gradle. Context path: `/api`

**Package root:** `com.goodquestion.backend.*`

도메인 패키지는 실제 기능을 구현할 때 그때그때 만듭니다. 미리 빈 패키지를 만들어두지 않습니다.
현재 존재하는 것은 `common.global`(예외 처리 인프라)뿐입니다.

**Layer pattern per module:** `controller → service (interface + impl) → repository → entity` + `dto/request`, `dto/response`, `enums`

---

## API Response Format

[docs/spec/api.md 2.3](../docs/spec/api.md)에서 확정된 계약입니다. **참고 프로젝트(yeogiyeogi-backend)의 `ApiResponse<T>` 래퍼를 쓰지 않습니다.**

**성공**: 데이터를 그대로 반환합니다. 래퍼 없음.

```java
@GetMapping("/children")
public List<ChildResponse> getChildren() { ... }   // 200, 데이터 그대로
```

**실패**: `BusinessException`을 던지면 `GlobalExceptionHandler`가 처리합니다.

```java
throw new BusinessException(ErrorCode.CONSENT_REQUIRED);
```

```json
{ "code": "CONSENT_REQUIRED", "message": "아동 개인정보 처리 동의가 필요합니다." }
```

`ErrorCode`는 [docs/spec/api.md 2.3](../docs/spec/api.md)에 정의된 코드만 씁니다.
새 에러 상황이 생기면 그 표에 먼저 추가하고 코드에 반영하세요 — 반대 순서로 하지 않습니다.

Controller는 에러 상태 코드를 직접 설정하지 않습니다. 항상 `BusinessException` → `@RestControllerAdvice`로 위임합니다.

---

## Coding Guidelines

### Layer Separation

- **Controller**: HTTP 입출력만. 비즈니스 로직 없음.
- **Service**: 비즈니스 로직 소유, Repository 직접 호출.
- **Repository**: 데이터 접근만.
- Controller에서 Entity를 직접 반환하지 않습니다 — 항상 Response DTO.

### Naming

| 대상 | 규칙 | 예시 |
| --- | --- | --- |
| 클래스 | UpperCamelCase | `SessionService`, `SttController` |
| 메서드/변수 | lowerCamelCase | `findById()`, `sessionId` |
| 패키지 | 소문자만 | `com.goodquestion.backend.session` |
| Boolean | `is`/`has`/`can` 접두사 | `isConsented`, `hasReachedMaxTurns()` |

### Dependency Injection

생성자 주입 (`@RequiredArgsConstructor` + `final` 필드). 필드 `@Autowired` 금지.

```java
@Service
@RequiredArgsConstructor
public class SessionService {
    private final SessionRepository sessionRepository;
}
```

### Entity / DTO

- **Entity**: `@NoArgsConstructor(access = AccessLevel.PROTECTED)` + `@Getter`만. 상태 변경은 의미 있는 메서드로 (`close()`, `advance()` 등). 생성은 `static create()`.
- **DTO**: `Request`/`Response` 분리. Response는 `static from(Entity)`.

### Transactions

- 쓰기: `@Transactional` / 읽기: `@Transactional(readOnly = true)`
- 트랜잭션 범위는 최소로.

### Logging

`@Slf4j`만 사용. `System.out.println()` 금지. 토큰·민감정보를 로그에 남기지 않습니다.

### RESTful API

명사 + 소문자 + 하이픈. `/api` 접두사는 `context-path`가 자동으로 붙이므로 컨트롤러에는 쓰지 않습니다.

- ✅ `/sessions/{sessionId}/messages`
- ❌ `/api/getSessionMessages`

---

## Claude Behavior Guidelines

- **작업 전 docs/plan.md 확인.** 지금이 어느 Phase인지, 선행 작업이 끝났는지 먼저 봅니다.
- **값은 PRD에서.** 스키마 컬럼, `element_criteria`, 장면 값 등을 이 저장소에 새로 만들지 말고 [../docs/product/prd.md](../docs/product/prd.md)를 참조합니다.
- **기존 스타일을 따릅니다.** 새 클래스를 만들기 전, 같은 레이어의 기존 클래스(가까운 ServiceImpl, Controller, Entity)를 먼저 읽고 구조를 따릅니다.
- **최소 변경.** 요청받은 것만 수정합니다. 관련 없는 코드를 리팩터링하거나 이름을 바꾸지 않습니다.
- **불명확하면 묻습니다.** 요건이 애매하면 추측으로 채우지 않고 먼저 확인합니다.
- **비트리비얼한 로직에는 근거를 남깁니다.** 트레이드오프가 있는 구현은 왜 그렇게 했는지 짧게 코멘트나 응답에 남깁니다.
- **루트 docs 동기화.** `backend/docs/decisions.md`에 새 결정(D-xx)을 남길 때, 그 결정이 `docs/open-questions.md`·`docs/product/prd.md`·`docs/spec/api.md`의 기존 내용과 충돌하거나 그 문서들이 다루는 값을 바꾼다면 해당 문서도 같이 갱신합니다. 한쪽만 고치면 반드시 낡습니다.
- **API 작업 상태 추적.** `backend/docs/work-items.md`의 엔드포인트 표에 상태(미착수/완료)를 표시하고, 엔드포인트를 구현·변경할 때마다 갱신합니다.
- **엔드포인트 완료 시 직접 호출 검증.** 엔드포인트를 구현하면 코드만 보고 끝내지 말고 curl/Postman/브라우저 등으로 실제 호출해 정상 케이스와 대표적인 에러 케이스(최소 1개)를 확인한 뒤 완료로 표시합니다.
- **검증 통과 → 커밋 → 다음 작업.** 위 검증이 통과하면 그 단위로 커밋하고 바로 다음 작업으로 넘어갑니다. 여러 엔드포인트를 모아뒀다가 한 번에 커밋하지 않습니다.
- **`.env`·비밀값은 절대 커밋하지 않습니다.** `KAKAO_CLIENT_SECRET`·`JWT_SECRET` 등 실제 값은 `.env`(gitignore됨)에만 두고, `.env.example`에는 플레이스홀더만 남깁니다. 커밋 전에는 `git status`로 `.env`가 스테이징되지 않았는지 확인합니다.
- **작업 하나가 끝날 때마다 5시간 토큰 사용량을 확인합니다.**
  ```bash
  node "$(ls -d ~/.claude/plugins/cache/claude-dashboard/claude-dashboard/*/dist/check-usage.js 2>/dev/null | sort -V | tail -1)" --json
  ```
  `claude.fiveHourPercent`가 **90%를 넘으면** 그 시점에서 작업을 멈추고, 진행 상황을 커밋·문서화한 뒤 `claude.fiveHourReset` 시각에 맞춰 `ScheduleWakeup`(또는 `CronCreate` 1회성)으로 재개를 예약합니다. 사용자의 추가 지시 없이 예약된 시간에 자동으로 다음 작업을 이어갑니다.

---

## Infrastructure

- **PostgreSQL 16** (`goodquestion` DB) — 로컬은 `docker-compose.yml`, 배포는 Supabase ([decisions.md D-13](docs/decisions.md))
- **JPA DDL**: `update` (로컬). Flyway 미도입 ([decisions.md D-14](docs/decisions.md))
