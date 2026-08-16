# 현재 캐릭터 대사 기반 `highlightWords` v1

- **요청자**: AI 파트
- **작성일**: 2026-08-16
- **우선순위**: 필수
- **대상**: 백엔드 파트
- **상태**: 구현·main 병합 완료, Render 백엔드 재배포·실대화 확인 필요

## 결정

프론트의 기존 밑줄·단어 팝업·단어장 흐름은 `highlightWords`를 사용한다. 사용하지 않는
`recommendedWord` 카드 API를 추가하지 않고 제거한다.

## 계약

`POST /api/sessions/{sessionId}/messages`는 아래만 사용한다.

```json
{
  "characterMessage": "아직 말할지 망설여.",
  "highlightWords": [
    { "word": "망설여", "meaning": "어떻게 할지 바로 정하지 못하고 고민하는 모습" }
  ]
}
```

- `highlightWords`는 최대 하나다.
- `word`는 **이번 응답의 `characterMessage`에 연속 문자열로 실제 포함될 때만** 내려간다.
- 적절한 8세 이하 후보가 없으면 `[]`다. 아이 발화·이전 턴·장면 번호만으로 단어를 내려주지 않는다.
- LLM 호출·프롬프트·DB·프론트 API 타입을 추가하지 않는다.
- `recommendedWord`, `SceneVocabulary`와 관련 DTO는 제거한다.

## 완료 조건

- [x] 현재 캐릭터 대사에 없는 단어는 밑줄 데이터로 내려가지 않는다.
- [x] 현재 캐릭터 대사에 실제 있는 후보는 하나만 내려간다.
- [x] 프론트 `highlightWords` 렌더링·단어장 저장 흐름은 변경하지 않는다.
- [ ] Render 백엔드가 main 기준으로 재배포된 뒤 실제 대화에서 확인한다.
