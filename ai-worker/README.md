# GoodQuestion AI Worker

Cloudflare Workers에 배포하는 굿퀘스천 AI 서버다. 공개 주소가 생겨도 백엔드만 호출하며,
브라우저·프론트는 이 Worker를 직접 호출하지 않는다.

## 고정 계약

- `GET /health` — 인증 없는 상태 확인
- `POST /analyze` — `X-Internal-Token` 필수
- `POST /respond` — `X-Internal-Token` 필수
- `POST /report` — 보호자 리포트 고도화용, `X-Internal-Token` 필수
- 기본 모델 `gpt-5-mini`, Responses API `store: false`
- `/analyze`·`/respond`는 각 시도 최대 10초, 최초 포함 최대 10회다. Worker는 재시도 대기까지 포함해 최대 102초를 쓰며, 백엔드는 `AI_SERVER_TIMEOUT_SECONDS=105`로 기다린다. `/report`는 전체 60초 안에서 최초 포함 최대 3회다. 백엔드는 별도 재시도하지 않는다.

요청·응답 스키마와 책임 경계는
[AI 서버 연동 v1](../docs/request/backend/ai-service-integration-v1.md)를 따른다.
`/report`의 입력·출력과 품질 기준은
[보호자 리포트 AI 생성 요청](../docs/request/ai/parent-report-ai-generation.md)을 따른다.

실패 시 Worker 로그에는 `operation`·`code`·`requestId`만 남긴다. 토큰·OpenAI 키·아이 발화는
로그에 남기지 않는다. 백엔드 장애 확인 시 시간과 이 세 필드로 `UNAUTHORIZED`(내부 토큰),
`INVALID_REQUEST`(계약), `MODEL_UPSTREAM_ERROR`/`MODEL_TIMEOUT`(모델 재시도 소진)을 구분한다.
모델 실패에는 `reason`도 남기며 `OPENAI_STATUS_429`, `MODEL_OUTPUT_CONTRACT`,
`MODEL_OUTPUT_JSON`, `ATTEMPT_TIMEOUT`처럼 입력 내용이 아닌 안전한 원인 코드만 사용한다.

## 로컬 검증

```powershell
cd ai-worker
npm.cmd ci
npm.cmd run check
npm.cmd test
npx.cmd wrangler deploy --dry-run
```

실제 모델을 호출하는 테스트는 자동 실행하지 않는다.

## 배포

Cloudflare 로그인 후 한 번만 수행한다.

```powershell
cd ai-worker
npx.cmd wrangler login
npx.cmd wrangler secret put OPENAI_API_KEY
npx.cmd wrangler secret put AI_INTERNAL_TOKEN
npm.cmd run deploy
```

`AI_INTERNAL_TOKEN` 값은 백엔드 Render의 `AI_SERVER_INTERNAL_TOKEN`과 **완전히 같은 값**이어야
한다. 두 값 모두 Secret으로만 입력하며, Git·채팅·문서에는 실제 값을 적지 않는다.

배포 후 `https://<worker-subdomain>.workers.dev/health`가 200인지 확인하고, 그 주소(끝 슬래시
제외)를 백엔드의 `AI_SERVER_BASE_URL`에 넣는다. 프론트 환경변수나 CORS 설정은 추가하지 않는다.

## 정리 기준

`ai-server/`의 FastAPI 구현은 Worker 배포와 백엔드 실연동 스모크 테스트가 끝날 때까지 비교·복구용으로
유지한다. 두 배포 경로를 함께 운영하지 않으며, Worker 전환 확인 뒤 별도 정리 PR에서 제거한다.
