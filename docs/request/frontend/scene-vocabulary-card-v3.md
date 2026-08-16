# 실제 캐릭터 대사 기반 추천 단어 카드 v3 요청

- **요청자**: AI 파트
- **작성일**: 2026-08-16
- **우선순위**: 필수
- **대상**: 프론트엔드 파트

> **대체됨**: [v2](scene-vocabulary-card-v2.md)의 장면 고정 추천 가정은 적용하지 않는다.
> 백엔드 계약은 [실제 대사 기반 추천 단어 v2](../backend/character-utterance-vocabulary-v2.md)를 따른다.

## 표시 계약

`recommendedWord`는 이번 `characterMessage`에 실제 포함된 8세 이하용 단어일 때만 오며,
그렇지 않으면 `null`이다.

```json
{
  "characterMessage": "용기를 내서 천천히 말해 볼까?",
  "recommendedWord": {
    "word": "용기",
    "meaning": "어려워도 해 보려는 씩씩한 마음"
  }
}
```

## 요구사항

1. API 타입과 플레이 상태에 `recommendedWord: { word, meaning } | null`을 반영한다.
2. 값이 있을 때만 **이번 캐릭터 대사 아래**에 단어·쉬운 뜻 카드 하나를 표시한다.
3. `recommendedWord.word`가 현재 표시 중인 캐릭터 대사에 실제 포함되지 않으면 방어적으로
   카드를 렌더링하지 않는다. 이전 턴 카드가 다음 턴에 남아서는 안 된다.
4. 카드 탭은 기존 단어장 저장 흐름을 재사용한다. 새 전역 상태·DB·LLM 호출은 만들지 않는다.
5. `highlightWords` 대사 밑줄·팝업은 렌더링하지 않는다. 이 필드는 하위 호환용이며 카드의
   데이터 근거가 아니다.

## 완료 조건

- [ ] 현재 캐릭터 대사에 나온 단어만 카드로 보인다.
- [ ] `recommendedWord: null`이면 카드·빈 공간·오류가 없다.
- [ ] 대사가 바뀌면 이전 카드가 남지 않는다.
- [ ] 단어장 저장, STT/TTS, 미션 흐름이 변하지 않는다.
