# AI 호출 재시도·시간 예산 v3 요청

> **대체됨**: 2026-08-16부터 [v4](ai-retry-deadline-v4.md)를 정본으로 사용한다.
> v3의 Worker 9초·시도당 3초·백엔드 10초 값은 적용하지 않는다.

- **요청자**: AI 파트
- **작성일**: 2026-08-16
- **우선순위**: 필수
- **대상**: 백엔드 파트

## 배경

배포 통합 테스트에서 장면 3 도중 Worker가 `502 MODEL_UPSTREAM_ERROR`를 반환하면
`character_closing` 폴백으로 장면이 끝나는 현상이 확인됐다. 원인은 Worker의 OpenAI
재시도 소진이며, `401 UNAUTHORIZED`나 API 주소 불일치와는 구분된다.

회의 결정은 대화 AI 호출에 대해 **최초 요청을 포함해 최대 10회**, 백엔드 연결 제한은
기존처럼 **10초**다. 단, 10개의 느린 요청을 강제로 모두 시도한다는 뜻은 아니다. Worker는
백엔드가 연결을 먼저 끊지 않도록 내부 9초에서 종료하고, 빠르게 실패한 429·5xx·구조화
출력 오류만 남은 시간 안에 최대 10회까지 재시도한다. 각 시도는 최대 3초다.

이 문서는 [v2](ai-retry-deadline-v2.md)를 대체한다. API 요청·응답 스키마와 기존 안전
폴백은 바꾸지 않는다.

## 요구사항

1. 백엔드는 `AI_SERVER_TIMEOUT_SECONDS=10`을 유지한다. `/analyze`와 `/respond`를
   백엔드에서 별도로 재시도하지 않는다.
2. AI Worker가 `/analyze`·`/respond`에서 최초 포함 최대 10회, 내부 총 9초, 시도별
   최대 3초로 재시도한다. 인증(401)·계약(422) 오류는 즉시 반환한다.
3. Worker의 최종 실패 계약은 그대로다.

   | 경우 | Worker 응답 | 백엔드 처리 |
   | --- | --- | --- |
   | 시간 예산 소진 | `504 MODEL_TIMEOUT` | 기존 폴백 |
   | 재시도 가능한 모델·출력 오류 소진 | `502 MODEL_UPSTREAM_ERROR` | 기존 폴백 |
   | 내부 토큰 불일치 | `401 UNAUTHORIZED` | 설정 점검 |
   | 요청 계약 위반 | `422 INVALID_REQUEST` | 연동 계약 점검 |

4. 로그의 `reason`은 `OPENAI_STATUS_429`, `MODEL_OUTPUT_CONTRACT`,
   `MODEL_OUTPUT_JSON`, `ATTEMPT_TIMEOUT` 등 안전한 원인 코드만 남긴다. 아이 발화,
   OpenAI 키, 내부 토큰은 로그·문서·응답 본문에 넣지 않는다.
5. 백엔드의 메시지 API 응답 필드, `character_closing` 폴백, STT/TTS 경로는 변경하지
   않는다. 따라서 이 변경에는 백엔드 소스 수정이 필요하지 않다. Render 환경 변수의
   `AI_SERVER_TIMEOUT_SECONDS`만 10인지 확인해 달라.

## 완료 조건

- [ ] Render의 `AI_SERVER_TIMEOUT_SECONDS`가 `10`이다.
- [ ] 백엔드 HTTP 클라이언트의 AI 재시도는 0회다.
- [ ] Worker가 502·504여도 기존 메시지 API 폴백으로 완료된다.
- [ ] `/analyze`·`/respond`의 요청·응답 JSON 스키마는 변경되지 않는다.
- [ ] 실패 재현 시 KST 시각과 Worker의 안전한 `reason` 코드로 원인을 확인할 수 있다.
