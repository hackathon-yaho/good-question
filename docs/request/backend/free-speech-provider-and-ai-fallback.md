# 무료 음성 공급자 전환 및 AI 장애 폴백 정정 요청

- **요청자**: AI 파트
- **작성일**: 2026-08-12
- **우선순위**: 필수
- **관련**: 2026-08-12 제공 STT·TTS 원문 인수인계, [AI 서버 연동 v1](ai-service-integration-v1.md), [프론트 음성 연동](../frontend/stt-tts-integration.md)

## 배경

새 운영 측 원문은 **캐릭터 음성 TTS를 무료로 사용**하도록 요구한다. 현재 D-01과 음성 구현은
OpenAI Whisper·TTS를 사용하므로, 팀의 OpenAI $5 크레딧을 LLM과 음성에 함께 소진하고 무료 TTS
요건도 충족하지 못한다.

OpenAI $5는 AI 서버의 `gpt-5-mini` 발화 분석·중간 캐릭터 텍스트에만 쓴다. 운영 측의 비용 지원
예상액은 아직 확정이 아니므로 설계 예산에 넣지 않는다.

## 요구사항

### 1. 음성 공급자 교체

기본 공급자를 **Azure Speech F0**로 바꾼다.

| 기능 | 기본 공급자 | 대체 |
| --- | --- | --- |
| 아이 음성 → 텍스트 | Azure Speech F0 STT (`ko-KR`) | 텍스트 입력 안내 |
| 캐릭터 텍스트 → 음성 | Azure Speech F0 TTS | 브라우저 TTS는 장애 시에만 |

- OpenAI STT/TTS 호출과 `OPENAI_API_KEY`의 백엔드 사용을 제거한다. AI 서버 키와 음성 키를 공유하지 않는다.
- `POST /api/stt` → 아이 확인·수정 → `POST /messages` → `GET /api/tts`의 세 요청 분리는 유지한다.
- 업로드된 원본 오디오는 메모리 처리 후 즉시 폐기하며, 저장·로그·캐시에 남기지 않는다.
- 고정 내레이션·opening·closing은 사전 생성하고, 중간 AI 대사만 런타임 TTS를 호출한다.
- TTS 캐시 키는 `provider + voiceId + text + speed + style + outputFormat` 해시다. 기존 텍스트 단독 해시는 공급자·음성 변경 시 충돌할 수 있다.
- 캐릭터별 `voiceId`·속도·스타일은 설정으로 고정한다. Typecast는 무료 API 발급, 한국어 음성 ID, 대회 제출 이용 조건을 실제 계정에서 확인한 뒤에만 대체 공급자로 추가한다.

Azure F0의 현재 공개 한도는 Neural TTS 월 50만 자와 실시간 STT 월 5시간이다. 한국어 Neural
음성도 제공되지만, 실제 계정·리전에서 음성 ID와 응답 시간을 먼저 확인해야 한다.

### 2. 공급자 경계

음성 서비스 구현은 특정 벤더 이름을 서비스 계층에 고정하지 않는다.

```text
SpeechToTextProvider.transcribe(audio, mimeType, "ko-KR")
TextToSpeechProvider.synthesize(text, voiceId, "ko-KR", speed, style)
```

- 초기 구현체는 `AzureSpeechToTextProvider`, `AzureTextToSpeechProvider`다.
- Azure 키와 리전은 백엔드 환경변수에만 둔다. 프론트·Git·AI 서버 `.env`에 넣지 않는다.
- `GET /api/tts`는 현재처럼 인증된 보호자만 자신의 메시지 음성을 받을 수 있어야 한다. 메시지 ID가 없는 고정 대사·단어 발음은 기존 프론트 요청의 `text` 경로를 지원하되, 허용된 콘텐츠인지 서버에서 제한한다.

### 3. AI 실제 연동 보완

`AI_SERVER_BASE_URL`을 실 AI 서버 주소로 설정할 때, `/analyze`·`/respond` 요청에
`X-Internal-Token: ${AI_SERVER_INTERNAL_TOKEN}`을 넣는다. AI 서버는 이 헤더가 없으면 401을
반환한다. 토큰은 로그에 남기지 않는다.

AI 서버 계약은 [AI 서버 연동 v1](ai-service-integration-v1.md)을 따른다. 특히
`mainPoint`는 **항상 존재하는 nullable 키**이며, `SHORT`·`UNCLEAR`·`OFF_TOPIC`·`PLAYFUL`일 때는
`mainPoint: null`, `detectedElements: []`다.

### 4. `/respond` 실패 폴백

`/respond`가 실패했다고 캐릭터의 `character_closing`으로 장면을 끝내면 아이의 생각과 무관하게
이야기가 넘어간다. 실패 시에는 캐릭터별로 검수한 **고정 중간 대사**를 저장·재생하고 다음 아이
차례를 유지한다. 실제 `CLOSING` 조건일 때만 `character_closing`을 사용한다.

재시도는 추가하지 않는다. `/analyze`와 `/respond` 모두 5초·0회 재시도를 유지한다.

## 환경 변수

```env
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=
AZURE_STT_LANGUAGE=ko-KR
AZURE_TTS_DEFAULT_VOICE=ko-KR-SunHiNeural
AI_SERVER_BASE_URL=
AI_SERVER_INTERNAL_TOKEN=
```

`AI_SERVER_INTERNAL_TOKEN`은 AI 서버의 같은 이름 값과 일치해야 한다. OpenAI 키는 AI 서버에만
두며, 현재 사용 가능한 $5 크레딧을 넘는 비용을 가정하지 않는다.

## 완료 조건

- [ ] 캐릭터 TTS가 OpenAI가 아닌 Azure Speech F0으로 생성된다.
- [ ] STT와 TTS가 공급자 인터페이스 뒤에 있고, Azure 키가 프론트·Git·AI 서버에 없다.
- [ ] 고정 대사 사전 생성과 중간 대사 캐시가 공급자·음성 설정을 포함한 키로 동작한다.
- [ ] 원본 아동 오디오는 STT 완료 후 저장되지 않는다.
- [ ] 실제 AI 서버 호출에 내부 토큰 헤더가 추가되고 `mainPoint: null`을 수용한다.
- [ ] `/respond` 실패가 장면 강제 종료가 아닌 고정 중간 대사로 이어진다.
- [ ] 팀원 녹음 파일과 한국어 샘플 대사로 STT/TTS를 확인하고, 음성 ID·응답 시간·무료 한도 확인 결과를 PR에 적는다.
