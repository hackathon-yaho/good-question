# GoodQuestion AI Server

굿퀘스천의 대화 AI 서버다. 이 서버는 상태·세션·DB·이미지·음성을 소유하지 않는다.

- `POST /analyze`: 최신 아이 발화 한 건의 의도, 사고 요소, 원문 근거를 제안한다.
- `POST /respond`: 백엔드가 결정한 `NORMAL` 또는 `GUIDED`에 맞는 캐릭터 한 문장과
  정적 표정 에셋에 쓸 `characterState`를 제안한다.

백엔드는 근거 검증, 누적 요소, 턴 수, `NORMAL`/`GUIDED`/`CLOSING`, 미션, 고정 마지막
대사를 결정한다. 장면·캐릭터 표정·미션 이미지는 미리 만든 정적 에셋을 프론트가 전환하며,
AI 서버는 이미지 생성·선택을 하지 않는다. `characterState`는 `NEUTRAL`·`HAPPY`·`WORRIED`·
`SURPRISED`·`MOVED` 중 하나일 뿐이며, 프론트/백엔드가 사전 제작된 같은 이름의 PNG를 고정 매핑한다.

정확한 연동 요청은
[AI 서버 연동 v1](../docs/request/backend/ai-service-integration-v1.md)을 따른다.

## 품질·비용 원칙

- 기본 모델: `gpt-5-mini`
- 분석 최대 200토큰, 캐릭터 답변 최대 80토큰
- 호출당 5초, SDK 재시도 0회
- Responses API `store=false`, 이전 응답/대화 상태 미사용
- 아이 발화에 실제 있는 근거만 통과시킨다.
- `SHORT`·`UNCLEAR`·`OFF_TOPIC`·`PLAYFUL`은 요소와 요약을 강제로 비운다.
- 교사·채점 말투와 조기 종결 문장은 서버에서 거부한다.
- 현재 OpenAI 크레딧은 **$5만** 사용한다. 운영 측의 비용 지원 예상액은 포함하지 않는다.
- STT/TTS는 이 서버 범위가 아니다. 무료 Azure Speech F0 전환 요청은 백엔드 문서로 분리한다.

## 로컬 설정

```powershell
cd ai-server
python -m venv .venv
.venv\Scripts\python.exe -m pip install -e ".[dev]"
.\scripts\set-local-openai-key.ps1
.venv\Scripts\python.exe -m uvicorn goodquestion_ai.main:app --reload --port 8000
```

PowerShell 실행 정책 때문에 스크립트가 막히면, 현재 창에서 한 번만 다음처럼 실행한다.

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\set-local-openai-key.ps1
```

키는 Git에서 제외된 `ai-server/.env`에만 저장한다. 채팅, 프론트 코드, 커밋,
`.env.example`에 넣지 않는다.

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `OPENAI_API_KEY` | 없음 | AI 서버에서만 읽는 API 키 |
| `AI_INTERNAL_TOKEN` | 스크립트가 생성 | 백엔드와 공유하는 16자 이상 토큰 |
| `OPENAI_MODEL` | `gpt-5-mini` | 대화 모델 |
| `OPENAI_TIMEOUT_SECONDS` | `5` | 호출 제한 시간(초) |
| `OPENAI_REASONING_EFFORT` | `minimal` | 비용·속도 우선 추론 강도 |

## 검증

```powershell
.venv\Scripts\python.exe -m ruff check .
.venv\Scripts\python.exe -m mypy src
.venv\Scripts\python.exe -m pytest
```

위 검증은 API 비용이 들지 않는다. 라이브 품질 평가는 유료 호출이므로 의도적으로 상한을
지정해야만 실행된다.

```powershell
.venv\Scripts\python.exe evals/run_live.py --live --limit 2
```

`--limit 2`는 분석·응답 각각 최대 2건, 즉 최대 4회만 호출한다. 자동 테스트·CI에서는
라이브 평가를 실행하지 않는다. 실제 $5의 지출 상한·알림은 AI 키가 속한 OpenAI 프로젝트에서
설정하고, 이 서버의 `OPENAI_API_KEY`는 그 프로젝트 키만 사용한다.

## 오류 처리

- `401 UNAUTHORIZED`: 내부 토큰이 없거나 다름
- `422 INVALID_REQUEST`: 계약 위반
- `502 MODEL_UPSTREAM_ERROR`: 모델 오류·구조화 출력 오류·안전하지 않은 캐릭터 대사
- `504 MODEL_TIMEOUT`: 5초 제한 초과

모든 응답은 `X-Request-Id`를 반환한다.
