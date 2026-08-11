# 백엔드 작업 문서

`good-question` 백엔드 파트의 **작업 문서**입니다.

## 이 폴더의 원칙

**값을 여기에 복사하지 않습니다.**

DB 스키마, 콘텐츠 값, 대화 엔진 규칙은 [`docs/product/prd.md`](../../docs/product/prd.md)가 정본입니다.
이 폴더는 **무엇을 · 어떤 순서로 · 왜 그렇게 정했는지**만 다루고, 실제 값은 정본으로 링크합니다.

> [docs/README.md](../../docs/README.md): *"같은 값이 두 곳에 있으면 반드시 한쪽이 낡습니다."*

특히 `element_criteria`는 AI 담당자가 발화 샘플로 튜닝하며 계속 바뀔 예정입니다
([roles.md 4.4](../../docs/team/roles.md)). 여기에 적어두면 확실히 낡습니다.

## 문서 목록

| 문서 | 내용 | 언제 보나 |
| --- | --- | --- |
| [work-items.md](work-items.md) | 백엔드 작업 항목 전체. 필수 / 선택-후순위 분류 | 뭘 만들어야 하는지 확인할 때 |
| [plan.md](plan.md) | Phase 1~6 의존 순서 | 다음에 뭘 할지 정할 때 |
| [decisions.md](decisions.md) | 확정된 결정 + 근거 + 미결 항목 | "이거 왜 이렇게 정했지?" |
| [setup.md](setup.md) | 스택 · 환경변수 · 로컬 Docker · 배포 | 환경 세팅할 때 |

## 값을 찾는 곳

작업하다 실제 값이 필요하면 여기로 가세요.

| 필요한 것 | 위치 |
| --- | --- |
| DB 테이블 컬럼 정의 (9 + 확장) | [PRD 8장](../../docs/product/prd.md) |
| 이야기 기본 정보 | [PRD 7.1](../../docs/product/prd.md) |
| 장면 9건 구성 (`scene_order`, `max_turns`, `required_elements`) | [PRD 7.2](../../docs/product/prd.md) |
| `preferred_turns` | [PRD 7.3](../../docs/product/prd.md) |
| 도입·전개 텍스트 (`scene_description`) | [PRD 7.4](../../docs/product/prd.md) |
| 고정 대사 (`character_opening` / `character_closing`) | [PRD 7.5](../../docs/product/prd.md) |
| `conflict` 4건 | [PRD 7.5.1](../../docs/product/prd.md) |
| `element_criteria` 4건 | [PRD 7.5.2](../../docs/product/prd.md) |
| `remainingWorries` · `guidanceStyle` (코드 상수) | [PRD 7.5.3](../../docs/product/prd.md) |
| 미션 1·2 정의와 노출 조건 | [PRD 7.6](../../docs/product/prd.md) |
| `post_activity_config` | [PRD 7.8](../../docs/product/prd.md) |
| 대화 엔진 파이프라인·판단 규칙 | [PRD 6장](../../docs/product/prd.md) |
| 사고 요소 8종 · `childIntent` 13종 · `utteranceValidity` 5종 | [PRD 6.3 · 6.6](../../docs/product/prd.md) |
| 반응 원칙 키(`reactionKey`) 매핑 | [PRD 6.13](../../docs/product/prd.md) |
| API 요청·응답 스키마 | [spec/api.md](../../docs/spec/api.md) |
| 에러 코드 목록 | [spec/api.md 2.3](../../docs/spec/api.md) |
| 백엔드 작업 분장 원문 | [team/roles.md 3장](../../docs/team/roles.md) |
| 문서 간 충돌·미결 | [open-questions.md](../../docs/open-questions.md) |

## 다른 파트에 보낸 요청

| 문서 | 내용 |
| --- | --- |
| [docs/request/frontend/stt-tts-integration.md](../../docs/request/frontend/stt-tts-integration.md) | STT/TTS 연동 방식 변경 통보 (C안 채택) |
