# Cloudflare Worker AI 서버 전환 요청

- **요청자**: AI 파트
- **작성일**: 2026-08-16
- **우선순위**: 필수

## 배경

기존 FastAPI AI 서버의 배포 주소 미결(U-01)을 Cloudflare Worker로 해소한다. Worker는 현재
`/analyze`·`/respond`·`/health` 계약, OpenAI 모델·재시도·실패 코드를 유지하며 DB·세션·미션·이미지를
소유하지 않는다.

프론트는 AI Worker를 직접 호출하지 않는다. 백엔드의 AI 서버 기본 주소만 실제 Worker 주소로 바꾼다.

## 변경 요청

Cloudflare Worker 배포 주소가 확정되었습니다. Render 백엔드 환경 변수에 아래 값을 설정해 주세요.

| 환경 변수 | 값 | 비고 |
| --- | --- | --- |
| `AI_SERVER_BASE_URL` | `https://goodquestion-ai.goodquestion-kty2253.workers.dev` | 끝 슬래시 없이 설정 |
| `AI_SERVER_INTERNAL_TOKEN` | AI 파트가 Worker Secret `AI_INTERNAL_TOKEN`에 입력한 값과 동일 | 실제 값은 Git·문서·로그에 기록 금지 |
| `AI_SERVER_TIMEOUT_SECONDS` | `10` | 기존 확정값 유지 |

`AiAnalyzeClientImpl`·`AiRespondClientImpl`은 현재 이미 `X-Internal-Token` 헤더를 전송하므로
소스 변경은 필요 없다. 기본값인 로컬 mock URL을 배포 환경에서 사용하지 않도록 실제
`AI_SERVER_BASE_URL`을 반드시 주입해 주세요.

## API 스키마

변경 없음. [AI 서버 연동 v1](ai-service-integration-v1.md)과
[재시도·시간 예산 v2](ai-retry-deadline-v2.md)를 그대로 따른다.

| 호출 | 인증 | 실패 시 백엔드 동작 |
| --- | --- | --- |
| `POST {AI_SERVER_BASE_URL}/analyze` | `X-Internal-Token` | 빈 분석으로 정상 진행 |
| `POST {AI_SERVER_BASE_URL}/respond` | `X-Internal-Token` | `character_closing`으로 장면 종료 |
| `GET {AI_SERVER_BASE_URL}/health` | 없음 | 배포 상태 확인만 사용 |

## 제약 조건

- 백엔드는 AI 서버를 재시도하지 않는다. AI Worker가 전체 10초 안에서 최초 포함 최대 3회만 시도한다.
- AI Worker 주소·OpenAI API 키·내부 토큰을 프론트 환경변수 또는 클라이언트 응답에 노출하지 않는다.
- CORS 설정·프론트 API 변경은 필요 없다.
- Worker 실제 주소로 첫 실연동이 성공하기 전에는 `AiMockController`를 삭제하지 않는다. 성공 후 mock 제거 여부는 백엔드 담당이 별도 PR로 정리한다.

## 완료 조건

- [ ] Render 배포 환경에 실제 `AI_SERVER_BASE_URL`과 내부 토큰을 설정했다.
- [ ] `/analyze`와 `/respond`가 동일 토큰 헤더로 Worker의 200 응답을 받는 것을 확인했다.
- [ ] 잘못된 토큰이 Worker에서 401이 되는 것을 확인했다.
- [ ] 502·504 시 기존 안전 폴백이 `POST /messages` 정상 응답으로 이어지는 통합 테스트를 확인했다.
- [ ] 프론트가 Worker가 아닌 기존 백엔드 `/api`만 호출하는 것을 유지했다.
