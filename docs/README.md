# 문서 (docs)

`good-question` 프로젝트의 모든 문서를 보관하는 폴더입니다.

> **2026-08-12 수정** — 백엔드 결정 반영. STT/TTS 방식이 확정되어 미결 11건이 해소되었습니다.
> 변경 문서: `product/prd.md`(v1.1) · `team/roles.md`(v1.1) · `spec/api.md` · `open-questions.md` ·
> `request/frontend/stt-tts-integration.md`(신규). 근거는 [backend/docs/decisions.md](../backend/docs/decisions.md).

## 어디서부터 읽어야 하나

| 상황 | 읽을 문서 |
| --- | --- |
| 프로젝트에 처음 합류했다 | [competition.md](competition.md) → [product/prd.md](product/prd.md) 1~5장 |
| 내가 뭘 만들어야 하는지 알고 싶다 | [team/roles.md](team/roles.md) → [product/prd.md](product/prd.md) 11장 체크리스트 |
| **뭘 먼저 정해야 하는지 알고 싶다** | [open-questions.md](open-questions.md) 0절 |
| 화면을 만든다 | [spec/screens.md](spec/screens.md) → [spec/api.md](spec/api.md) 3절 |
| 대화 엔진을 구현한다 | [product/prd.md](product/prd.md) 6장 → [team/roles.md](team/roles.md) 3.5 → [spec/api.md](spec/api.md) 4절 |
| DB를 만든다 | [product/prd.md](product/prd.md) 8장 |
| 콘텐츠 데이터를 넣는다 | [product/prd.md](product/prd.md) 7장 |
| AI 서버를 만든다 | [team/roles.md](team/roles.md) 4장 → [spec/api.md](spec/api.md) 4절 |
| "이건 왜 이렇게 정했지?" | [product/prd.md](product/prd.md) 12장 이슈 로그 |
| "이거 문서마다 다르게 적혀 있는데?" | [open-questions.md](open-questions.md) 1절 |

## 구조

```
docs/
├── competition.md        # 대회 개요·일정·제출물
├── open-questions.md     # 문서 간 충돌·미결 통합 목록
├── product/
│   └── prd.md            # 제품 요구사항 정의서 ★정본
├── team/
│   └── roles.md          # 파트별 작업 분장
├── spec/
│   ├── screens.md        # 프론트엔드 화면 상세 명세 (48화면)
│   ├── api.md            # API 계약
│   └── assets.md         # 이미지·에셋 규격 · 수령 상태 · 폴백
├── reference/            # 주최측 제공 원문 자료
└── request/              # 파트 간 요청 사항
    ├── ai/
    ├── backend/
    └── frontend/
```

## 폴더별 안내

| 문서 | 설명 | 상태 |
| --- | --- | --- |
| [competition.md](competition.md) | 대회명·주최·일정·제출물·심사 관련 | 완결 |
| [open-questions.md](open-questions.md) | 지금 결정해야 할 것 4건 + 문서 간 충돌 17건 | 완결 |
| [product/prd.md](product/prd.md) | **정본.** 서비스 정의 · 대화 엔진 · 콘텐츠 · 데이터 모델 · 구현 체크리스트 · 이슈 로그 19건 | 완결 (v1.1) |
| [team/roles.md](team/roles.md) | PRD 항목을 담당자 기준으로 재편성 + 백엔드↔AI 계약 | 완결 (v1.1) |
| [spec/screens.md](spec/screens.md) | 화면 48개의 UI·상태 전환·데이터 바인딩 | ⚠️ **갱신 필요.** STT/TTS 변경 미반영 |
| [spec/api.md](spec/api.md) | 프론트↔백엔드, 백엔드↔AI 인터페이스 | 2026-08-12 갱신. 항목별 확정/제안/초안 표기 참조 |
| [spec/assets.md](spec/assets.md) | 필요한 이미지·에셋의 규격·수령 상태·폴백 | ⚠️ 규격은 팀 제안 (합의 전) |
| [reference/](reference/) | 주최측 원문(줄거리, 캐릭터 성격, 리포트 가이드, 인터뷰) | 완결 |
| [request/](request/) | 파트 간 요청 사항 | [frontend/stt-tts-integration.md](request/frontend/stt-tts-integration.md) 1건 |

> ⚠️ **`spec/screens.md`에 갱신이 필요한 지점이 있습니다** (프론트 담당).
> A-2 Supabase Auth 표기 · 구글·네이버 버튼 · I-2 빈 발화 전송 · 브라우저 STT/TTS 전제 ·
> D-5 키워드 실시간 점등. 상세는 [request/frontend/stt-tts-integration.md](request/frontend/stt-tts-integration.md).

## 정본 관계

값이 어긋날 때 어느 문서를 믿어야 하는지입니다.

```
주최측 요건  ▶  PRD  ▶  작업 분장 / 화면 명세  ▶  API 계약
   (reference/)   (정본)      (파트별 재편성)        (인터페이스)
```

- **PRD가 제품 정본입니다.** 대화 엔진 규칙(6장), 콘텐츠 값(7장), DB 스키마(8장)는 PRD에만 두고 다른 문서에서 복사하지 않습니다. 같은 값이 두 곳에 있으면 반드시 한쪽이 낡습니다.
- **화면 명세가 UI 정본입니다.** 디자인 토큰, 상태 전이, 화면 ID는 여기가 기준입니다.
- **API 계약은 화면 명세 5장 + 작업 분장 4장을 따릅니다.** 두 문서가 정한 스키마가 확정값이고, 나머지는 초안입니다.
- `reference/`는 주최측 원문 보관용입니다. **고치지 않습니다.**
- 문서 간 값이 어긋나면 [open-questions.md](open-questions.md)에 기록하고, PRD 범위 안의 것은 [PRD 12장 이슈 로그](product/prd.md)에도 남깁니다.
- 팀이 창작한 값(`conflict`, `elementCriteria`, `remainingWorries`, `guidanceStyle`)은 주최측 확정값과 구분해 표기합니다. ([PRD 7.5.4](product/prd.md))

## 작성 규칙

- 문서는 **마크다운(`.md`)** 으로 작성합니다.
- 파일명은 소문자 + 하이픈(kebab-case)을 사용합니다.
- 한 문서는 하나의 주제만 다룹니다. 내용이 길어지면 문서를 분리하세요.
- 이미지·다이어그램은 문서와 같은 폴더의 `assets/` 하위에 둡니다.
- 결정이 바뀌면 문서를 **수정**하고, 변경 이력은 커밋 메시지로 남깁니다.

## 지금 막혀 있는 것

**2026-08-12 기준**입니다.

| 항목 | 상태 |
| --- | --- |
| 프론트엔드 스택 | 🔴 화면 명세는 SPA 전제 |
| 요건 위반 소지 **2건** (미션 모달 / 음성 재생) | 🔴 구현 전 해소. **프론트 결정** |
| 구현 범위 합의 (48화면 vs 필수 11개) | 🔴 |
| 에셋 (이야기 일러스트 · 로고 · 아바타 · 약관 전문) | ❌ 미수령. 폴백은 [spec/assets.md](spec/assets.md)에 정리 |
| AI 서버 배포 주소·경로 | ⚪ 미정. 백엔드가 mock 스텁으로 선행 진행 중 |
| 프론트 15초 타임아웃 유지 여부 | ⚪ 배포 후 실측 필요 |
| 미확보 문서 4건 | ❌ 전부 없이 진행 가능. [reference/README.md](reference/README.md) |

### 2026-08-12 해소

| 항목 | 결정 |
| --- | --- |
| ~~STT/TTS 방식~~ | ✅ **2안 (OpenAI, 백엔드 처리)** |
| ~~인증 방식~~ | ✅ 자체 JWT + 카카오 단독 |
| ~~AI 타임아웃·재시도·실패 응답~~ | ✅ 5초 / 0회 / 폴백 확정 |
| ~~빈 발화 (요건 위반 소지)~~ | ✅ STT 엔드포인트 분리로 **구조적 해소** |

**남은 🔴는 전부 프론트 쪽 결정입니다.** 백엔드는 결정이 끝나 착수 가능합니다
([backend/docs/plan.md](../backend/docs/plan.md)).

자세한 내용과 판단 근거는 [open-questions.md](open-questions.md)에 있습니다.
