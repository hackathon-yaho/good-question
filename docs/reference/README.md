# 참고 자료 (reference)

주최측이 제공한 **원문 자료**를 보관하는 폴더입니다.
[PRD](../product/prd.md)가 이 자료들을 요약·재구성한 정본이며, 여기에는 요약 과정에서 빠진
전문(全文)을 그대로 남겨둡니다.

## 이 폴더의 규칙

- **원문을 고치지 않습니다.** 팀 판단이나 결정은 PRD에 적고, 여기에는 주최측이 준 그대로를 둡니다.
- 원문과 PRD가 어긋나면 PRD의 이슈 로그(12장)에 기록하고 처리 결과를 남깁니다.
- 각 문서 상단에 출처(Notion 페이지명)를 표기합니다.

## 문서

| 문서 | 내용 | 주로 쓰는 파트 |
| --- | --- | --- |
| [story-banggui-full.md](story-banggui-full.md) | 「방귀 뀌는 며느리」 전체 줄거리 원문 | 프론트 (텍스트), AI (맥락) |
| [characters.md](characters.md) | 캐릭터 3인의 성격 정의 + 화면 표시명 대응 | AI (페르소나 프롬프트) |
| [guardian-report-guide.md](guardian-report-guide.md) | 보호자 리포트 상세 가이드 (선택 요건 A-01) | 전체 (O-01 착수 시) |
| [interview-findings.md](interview-findings.md) | 보호자·지도사·자문위원 인터뷰 의견 8건 + MVP 반영 판정 | 프론트 (UX 근거) |

## 아직 확보하지 못한 문서

**문서**만 여기 적습니다. 이미지·로고·약관 전문 같은 **에셋**은 규격과 대체 계획까지 함께 관리해야 해서
[spec/assets.md](../spec/assets.md)로 분리했습니다.

| 자료 | 형태 | 영향 | 비고 |
| --- | --- | --- | --- |
| 굿퀘스천_MVP_화면설계_Stitch프롬프트.md | Notion | 낮음 | 화면 시안 생성용 프롬프트. [screens.md](../spec/screens.md)가 화면 ID를 모두 담고 있어 없어도 진행 가능 |
| 굿퀘스천_MVP_대화작동규칙_260803_수정안 | PDF 첨부 | 낮음 | [PRD 6장](../product/prd.md)과 겹칠 가능성이 높음. 같은 8/3 수정안 계열 |
| 굿퀘스천_고객인터뷰_참고사항_UX/UI | DOCX 첨부 | 낮음 | [interview-findings.md](interview-findings.md)와 겹칠 가능성이 높음 |
| 디자인 시안 | Stitch | 중간 | 로그인 필요. [screens.md §1](../spec/screens.md) 디자인 토큰이 색·타이포·간격을 이미 확정해 대체 가능. 스크린샷을 받으면 `../spec/assets/`에 첨부 |

> 위 4건은 모두 **없어도 개발을 진행할 수 있습니다.** 이미 확보한 문서가 같은 내용을 담고 있거나,
> 팀 문서가 그 자리를 메웠습니다.

## 미확보 에셋

→ [spec/assets.md](../spec/assets.md) 참조. 이야기 일러스트, 로고, 아이 아바타, 약관 전문, 효과음이
규격·수령 상태·대체 계획과 함께 정리되어 있습니다.
