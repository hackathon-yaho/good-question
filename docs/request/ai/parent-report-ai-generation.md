# 보호자 리포트 AI 생성 요청

- **요청자**: 백엔드
- **작성일**: 2026-08-16
- **우선순위**: 선택 (리포트 자체가 선택 요건 — [guardian-report-guide.md](../../reference/guardian-report-guide.md) 2절). 백엔드 구현 착수 전 설계 확정용 문서.

## 배경

보호자 리포트(`GET /parent/reports/{sessionId}`)는 지금 전부 규칙 기반이다 — `ReportGenerator`가
카테고리별로 미리 써둔 문장 2개(관찰됨/안됨) 중 하나를 그대로 꺼내 쓴다. 실제 배포 응답으로 확인한
문제:

- `competencies[]` 5개 카드의 `evidence`가 세션 전체에서 가장 긴 발화 1개를 **전부 동일하게 재사용**함
- `guide.storyQuestions`/`dailyQuestions`가 "방귀 뀌는 며느리" 이야기 하나에 하드코딩돼 있어 다른
  이야기가 생기면 그대로 못 씀
- `representative`(대표 발화)도 "문장수→길이" 알고리즘으로 고르고 이유는 고정 문구

[guardian-report-guide.md](../../reference/guardian-report-guide.md)(주최측 원문) 5절은 발화를 의미
단위로 쪼개 사고 요소 연결 구조를 분석하고 그 흐름을 문장으로 요약하라고 요구하는데, 이건 규칙
기반으로는 불가능하고 AI가 필요한 영역이다. 원문 어디에도 "AI를 쓰면 안 된다"는 제약은 없다 —
오히려 이 요구 수준 자체가 AI 없이는 스펙을 못 맞춘다.

## 요구사항

- 리포트 6개 구성요소 중 3개만 AI가 담당한다: `competencies[]`(5개 카테고리의
  `feature`·`evidence`·`strength`·`next`), `representative`(발화 **선정**부터 `reason`까지),
  `guide.storyQuestions[]`·`guide.dailyQuestions[]`(각 정확히 2개).
  `summary`·`vocabulary`·`elementCounts`·`guide.intro`는 결정론적 계산이라 그대로 백엔드가 유지한다.
- 세 섹션을 **한 번의 요청/응답**으로 처리한다. 같은 세션 데이터를 한꺼번에 보고 판단해야 발화
  재사용·모순 없는 결과가 나온다.
- **사실 판정(카테고리별 matched/unmatched)은 백엔드가 이미 계산해서 힌트로 보낸다** — AI에게
  분류 권한을 주지 않는다. 이유: (1) 그대로 유지되는 `elementCounts`와 모순되는 리포트가 나올 위험,
  (2) 백엔드가 이미 발화 원문 대조까지 마친 검증된 사고 요소를 AI가 다시 뒤집을 위험, (3) 이미
  확실한 사실을 다시 판단시키는 토큰 낭비. AI는 matched 힌트 + 원본 발화를 보고 **문장 표현·근거
  인용 선정**만 담당한다.
- **아이 발화 원문을 AI가 직접 쓰지 않는다** — `representative`·`competencies[].evidence`처럼 아이가
  실제로 한 말을 인용하는 자리는 AI가 입력 발화 목록에서 **인덱스만** 고르고, 백엔드가 그 인덱스로
  원문을 그대로 채운다. AI가 요약·재구성하면서 아이가 안 한 말이 들어갈 위험을 원천 차단한다.
  `evidence`는 카테고리당 인덱스 1개 또는 matched=false면 `null` — 화면에 근거 1개만 표시하는 지금
  구조에 맞춘다(여러 개를 받는 안은 검토했으나 스키마만 복잡해지거나 프론트 변경까지 번져서 버림).
- AI 호출은 세션 완료(아이의 "재구성 발화 제출") 시점에 **비동기**로 트리거한다. 이 시점에 백엔드는
  지금과 동일하게 규칙 기반 리포트를 **즉시 동기로 생성·저장**한다(변경 없음 — 별가루·완료 처리를
  기다리는 아이 화면과 무관). AI 호출이 백그라운드에서 성공하면 이미 저장된 리포트 행을 AI 결과로
  **덮어쓴다.** 실패하면 아무것도 안 하고 규칙 기반 버전이 그대로 남는다. **별도의 "생성 중" 상태나
  API 스키마 변경이 없다** — 보호자가 언제 조회하든 항상 200 + 리포트를 받고, AI가 끝나면 다음
  조회부터 조용히 더 풍부한 버전으로 바뀐다.

## 입력

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `storyTitle` | string | Y | 이야기 제목 |
| `utterances` | array | Y | 세션의 아이 발화 전체, 턴 순서대로 |
| `utterances[].index` | integer | Y | 0-based, 출력에서 이 인덱스로 다시 참조됨 |
| `utterances[].text` | string | Y | 발화 원문 |
| `utterances[].sceneLabel` | string | Y | 예: `"장면 2"` |
| `utterances[].detectedTypes` | string[] | Y | 이 턴에서 감지된 사고 요소 타입(백엔드가 이미 검증 완료) |
| `competencyHints` | array | Y | 5개 카테고리 고정 |
| `competencyHints[].name` | string | Y | 예: `"관점과 공감"` |
| `competencyHints[].matched` | boolean | Y | 백엔드가 이미 계산한 관찰 여부 |

```json
{
  "storyTitle": "방귀 뀌는 며느리",
  "utterances": [
    { "index": 0, "text": "며느리가 창피해서 그랬을 것 같아요", "sceneLabel": "장면 2", "detectedTypes": ["PERSPECTIVE"] }
  ],
  "competencyHints": [
    { "name": "관점과 공감", "matched": true },
    { "name": "감정 표현", "matched": false }
  ]
}
```

## 출력

```json
{
  "competencies": [
    { "name": "관점과 공감", "feature": "...", "evidenceIndex": 0, "strength": "...", "next": "..." },
    { "name": "감정 표현", "feature": "...", "evidenceIndex": null, "strength": "...", "next": "..." }
  ],
  "representativeIndex": 3,
  "representativeReason": "...",
  "storyQuestions": ["...", "..."],
  "dailyQuestions": ["...", "..."]
}
```

- `competencies`는 5개 전부, `name`은 입력 `competencyHints`와 동일 문자열로 돌아온다(순서 뒤바뀜
  방지용 — 백엔드는 index가 아니라 name으로 매칭한다).
- `evidenceIndex`는 `utterances[].index` 중 하나 또는 `null`(matched=false일 때). matched=true인데
  `null`은 허용하지 않는다(품질 기준 위반으로 취급).
- `storyQuestions`·`dailyQuestions`는 각각 정확히 2개.

## 품질 기준

프롬프트를 어떻게 짤지는 AI팀 재량이다(기존 `/analyze`·`/respond` 요청 문서도 프롬프트 원문을 안
주고 스키마·금지사항만 준다). 백엔드는 **결과물이 반드시 만족해야 할 기준**만 제시한다
(guardian-report-guide.md 4절·8절 근거):

- 근거는 실제 발화에서 나와야 함 — 구조적으로는 인덱스 방식으로 이미 보장되지만, `feature`·
  `strength` 문장도 근거 없는 일반론이 아니라 그 발화 내용을 반영해야 함
- 보완점보다 강점을 먼저 언급하는 톤
- "~이 부족합니다"류의 단정적 결핍 표현 금지
- 내부 사고 요소 코드(`DECISION`·`REASON` 등) 절대 노출 금지
- 초등 1·2학년이 읽을 문장 — 카드 하나가 한 줄~두 문장 내외(지금 고정 문구와 비슷한 분량)

## 제약 조건

- **응답 시간**: 초기값 전체 60초(비동기라 대화 엔드포인트의 10초보다 여유를 둠 — 입력이 세션
  전체 발화로 더 크고 3개 섹션을 한 번에 생성해야 함). AI팀 실측 후 평균 시간 기준으로 재조정
  예정 — 고정값 아님.
- **재시도**: 리포트는 입력·출력이 더 크므로 최초 포함 최대 3회로 유지한다. AI Worker가 전체
  60초 시간 예산 안에서 자체 제어하고, 백엔드는 별도 재시도를 안 한다.
- **엔드포인트**: 기존 `/analyze`·`/respond`가 있는 같은 Cloudflare Worker에 새 엔드포인트(예:
  `POST /report`) 추가. 인증(`X-Internal-Token`)·배포 파이프라인 재사용.
- **실패 응답**: 백엔드가 이미 규칙 기반 폴백을 갖고 있으므로, AI Worker는 재시도 소진 시 기존
  `/analyze`·`/respond`와 같은 상태 코드 체계(502/504)로 명확히 실패를 반환하기만 하면 된다 —
  백엔드가 그 실패를 감지해 저장된 규칙 기반 리포트를 그대로 둔다.
- AI Worker는 상태·DB·세션을 소유하지 않는다(기존 원칙과 동일). `OPENAI_API_KEY`·
  `AI_SERVER_INTERNAL_TOKEN` 실제 값은 문서·커밋·로그에 넣지 않는다.

## 완료 조건

> **검증 범위 — "배관"만 확인했고 "AI가 실제로 쓴 문장"은 검증 못 했다.** 아래 체크된 항목은
> `AiMockController`에 실제 AI Worker와 **같은 입출력 스키마**로 만든 로컬 mock을 붙여서 확인한
> 것이다. mock은 `"feature": "(mock) 관점과 공감 관련 발화가 아직 안 보였어요"`처럼 자바 코드가
> 만든 고정 문자열을 돌려줄 뿐, LLM이 생성한 게 아니다. 그래서 검증된 것은:
> - 백엔드가 `evidenceIndex`·`representativeIndex`로 **실제 아이 발화 원문**을 정확히 채워 넣는지
> - matched=false 카테고리의 evidence가 정말 `null`로 오는지
> - 세션 완료 → 백그라운드 AI 호출 → 리포트 덮어쓰기 타이밍(트랜잭션 커밋 후 실행)이 안전한지
> - AI 호출이 실패했을 때 규칙 기반 리포트가 안전하게 남는지
>
> **검증 안 된 것**: 품질 기준(강점 먼저 언급, 단정적 표현 금지, 초등 1·2학년 눈높이 등)을 실제
> LLM이 지키는지, 응답이 실제로 60초 안에 오는지, 프롬프트가 요구한 스키마(정확히 2개 질문 등)를
> 실제 모델이 안정적으로 지키는지 — 이건 AI Worker의 실제 `/report`가 붙어야 확인 가능하다.

- [x] AI Worker에 `POST /report` 신규 구현, 위 입출력 스키마·품질 기준 충족
      (2026-08-16, 단위 테스트 12건 및 `gpt-5-mini` 실제 요청 2건 검증). 백엔드가
      `AI_SERVER_BASE_URL`·동일 내부 토큰·`AI_SERVER_REPORT_TIMEOUT_SECONDS=60`을 배포 환경에
      설정하면 실연동할 수 있다.
- [x] 백엔드: 세션 완료 시 규칙 기반 리포트 동기 생성(기존 유지) + AI 호출 백그라운드 트리거 +
      성공 시 리포트 덮어쓰기 구현 (2026-08-16, decisions.md D-55). 로컬 mock으로 전체 파이프라인
      검증 완료 — 실제 AI Worker만 붙이면 됨(`AI_SERVER_BASE_URL` 교체 외 백엔드 코드 변경 없음).
- [x] AI 호출 실패(타임아웃·502·504) 시 규칙 기반 리포트가 그대로 유지되는 것을 통합 테스트로 확인
      (2026-08-16) — mock `/report`가 예외를 던지도록 바꿔 재기동 후 재검증, 규칙 기반 버전 그대로 유지됨
- [x] 실제 세션으로 `competencies[].evidence`가 카테고리마다 다른 발화를 가리키는 것을 확인
      (2026-08-16) — matched=false 2개는 `null`, 나머지 3개는 실제 발화 원문으로 서로 다르게 채워짐
- [ ] `guide.storyQuestions`·`dailyQuestions`가 다른 이야기(스토리)에도 하드코딩 없이 생성되는지 확인
      — 지금 시스템에 이야기가 1편뿐이라 직접 검증은 못 함. `storyTitle`을 매 요청에 실어 보내고
      백엔드 코드 어디에도 이야기별 분기가 없어 구조적으로는 막혀있지 않음

## 참고

- 백엔드: `ReportGenerator.java`, `CompetencyDefinitions.java`, `GuideQuestions.java`,
  `ParentReportServiceImpl.generateReportIfAbsent()`, `ActivityServiceImpl.submitRetelling()`
- 주최측 원문: [docs/reference/guardian-report-guide.md](../../reference/guardian-report-guide.md)
