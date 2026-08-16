# 오늘의 단어 카드 표시 요청

> **대체됨**: [현재 캐릭터 대사 기반 `highlightWords` v1](../backend/highlight-words-current-character-v1.md)를
> 정본으로 사용한다. 기존 `highlightWords` 표시·단어장 흐름은 유지한다.

- **요청자**: AI 파트
- **작성일**: 2026-08-15
- **우선순위**: 선택

## 배경

AI 대사 안에 학습 단어를 강제로 넣으면 어린이 대화가 어색해진다. 백엔드에
`POST /sessions/{sessionId}/messages`의 `recommendedWord` 선택 필드를 요청했다.
이는 기존 `highlightWords`와 다르며, 대사 안에 실제 단어가 없어도 표시할 수 있는
장면별 "오늘의 단어" 카드 데이터다.

## 요구사항

1. `recommendedWord`가 있으면 대화 말풍선의 단어 밑줄과 분리된 작은 카드로 표시한다.
   - 예: `오늘의 단어 · 탐스러운` / `먹음직스럽고 보기 좋은 모습`
2. 같은 장면에서 여러 메시지를 받아도 같은 카드를 반복해서 쌓지 않는다.
3. 아이가 카드를 눌러 기존 `POST /wordbook`으로 저장할 수 있게 한다. 이미 저장한 같은
   단어는 저장 버튼 대신 저장 완료 상태로 표시한다.
4. `recommendedWord: null` 또는 백엔드 미연동 상태에서는 카드를 렌더링하지 않는다.
   기존 `highlightWords` 밑줄·팝업 동작은 바꾸지 않는다.

## API 계약

백엔드 요청서: [실제 캐릭터 대사 기반 추천 단어 v2](../backend/character-utterance-vocabulary-v2.md)

```json
{
  "recommendedWord": {
    "word": "탐스러운",
    "meaning": "먹음직스럽고 보기 좋은 모습"
  }
}
```

새 화면·새 전역 상태·새 DB는 만들지 않는다. 현재 대화 화면의 보조 카드로만 처리한다.

## 완료 조건

- [ ] `recommendedWord`가 있을 때 한 장면에 카드 하나만 보인다.
- [ ] 카드의 단어와 뜻풀이가 잘리지 않고 읽힌다.
- [ ] 저장 후 기존 단어장 목록에 같은 단어·뜻풀이가 보인다.
- [ ] 기존 `highlightWords`가 비어 있어도 카드가 정상 표시된다.
