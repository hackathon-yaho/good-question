# 대화 메시지에 캐릭터 정보 추가

- **요청자**: 프론트엔드 (eungbin)
- **작성일**: 2026-08-13
- **우선순위**: 선택 (없어도 화면은 동작합니다. 아래 임시 동작 참조)

## 배경

C-3 우측 패널이 **그 캐릭터와 나눈 이야기 전체**를 보여주도록 바꿨습니다.

같은 캐릭터가 여러 장면에 나옵니다(PRD I-13). `방귀 뀌는 며느리`의 경우
**방귀쟁이 며느리가 장면 3과 장면 9에 모두 등장**합니다. 지금 장면 것만 보여주면
아이가 "이 친구랑 아까 무슨 이야기 했었지?"를 확인할 수 없습니다.

## 문제 — 메시지에 캐릭터 정보가 없습니다

`GET /api/sessions/{sessionId}`와 `POST .../messages`가 주는 `messages[]`는
세션 전체 기록이지만, 각 항목이 이렇습니다.

| 필드 | 값 |
| --- | --- |
| `id` · `text` · `createdAt` · `turnOrder` | 있음 |
| `sceneId` | 있음 |
| **캐릭터** | **없음** |

캐릭터는 `currentScene.characterName` / `characterDisplayName`에만 실려 오므로
(api-spec 5.2 · 6.1) **지난 장면의 대사가 누구 것인지 응답만으로는 알 수 없습니다.**

## API 명세

### `GET /api/sessions/{sessionId}` · `POST /api/sessions/{sessionId}/messages`

`messages[]` 각 항목에 필드를 **추가**합니다. 기존 필드는 그대로입니다.

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `messages[].characterDisplayName` | String | 선택 | 그 장면 캐릭터의 표시명. `child` 발화에도 **그 대화 상대**를 넣어주면 좋습니다 |

```json
{
  "messages": [
    {
      "id": "f579b987-...",
      "sceneId": "39a666d8-...",
      "speakerType": "character",
      "turnOrder": 21,
      "text": "이 배나무는… 무슨 뾰족한 방법이 없겠는가?",
      "characterDisplayName": "마을 이장",
      "createdAt": "2026-08-12T10:20:00Z"
    }
  ]
}
```

- `characterName`(식별자)만 주셔도 됩니다. 다만 **표시명이 필요한 화면**이라
  `characterDisplayName`이 있으면 프론트가 매핑을 들고 있지 않아도 됩니다
- 식별자만 오는 경우 프론트는 `currentScene`의 짝으로 표시명을 찾습니다

> 대안 — `messages[]`를 건드리기 어렵다면 **장면 목록**을 주는 것도 됩니다.
> `GET /api/sessions/{id}`에 `scenes: [{ sceneId, characterDisplayName }]`가 있으면
> 프론트가 `sceneId`로 이어 붙일 수 있습니다. 어느 쪽이든 상관없습니다.

## 프론트가 이 값으로 하는 일

우측 대화 내역을 **그 캐릭터의 것만** 모읍니다. 지난 장면 묶음 앞에는
"지난 이야기" 구분선을 넣습니다 — 장면 3의 대화와 장면 9의 대화는 서로 다른
순간이라 이어 붙이면 한 대화로 읽히기 때문입니다.

**다른 캐릭터 대사는 섞지 않습니다.** 세션 전체를 그대로 부으면 누가 말했는지
알 수 없습니다.

## 없을 때의 임시 동작 (지금 구현되어 있음)

프론트가 **장면이 로드될 때마다** `sceneId → characterDisplayName` 짝을 기억합니다
(`frontend/src/features/play/PlayScreen.tsx`의 `sceneCharacterRef`).

- 이야기를 처음부터 이어서 진행하는 동안에는 모든 장면을 지나가므로 **완전합니다**
- ⚠️ **이어하기로 중간에 들어오면** 지난 장면의 짝을 모릅니다. 그때는 짝을 모르는
  장면을 **빼고** 보여줍니다 — 다른 캐릭터 대사를 섞는 것보다 덜 보여주는 쪽이
  안전합니다. 지금 장면 대화는 언제나 나옵니다

즉 **이어하기한 아이만 지난 대화를 못 봅니다.** 그게 이 필드가 필요한 이유입니다.

## 확인 방법

`frontend`에서 `npm run verify`의 `handoff` 스위트가 이야기를 완주하면서
C-3마다 우측 패널을 기록하고, **캐릭터가 재등장하는 장면에서 지난 대화까지
보이는지**와 "지난 이야기" 구분선이 붙는지를 확인합니다.
