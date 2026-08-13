# `/analyze` · `/respond` 계약 — AI 파트 초안과 다른 점 3가지

- **요청자**: 백엔드 담당
- **작성일**: 2026-08-13
- **우선순위**: 필수

## 배경

AI 파트가 이미 `ai-service-integration-v1.md`·`free-speech-provider-and-ai-fallback.md`
초안을 작성해뒀고, 그 내용은 백엔드 실제 구현(`AiAnalyzeClientImpl`/`AiRespondClientImpl`,
`docs/spec/api.md` 4장)과 필드 단위로 거의 일치합니다. 이 문서는 전체 계약을 다시
설명하지 않고, **그 초안과 실제로 다른 부분 3가지만** 정리합니다.

## 1. `characterState` — `/respond` 응답에 신규 필드

초안의 `/respond` 응답은 `{ "text": "..." }`뿐이었는데, 대화 중 캐릭터 이미지를 상태에
따라 바꾸는 기능(O-12)을 위해 필드가 하나 늘었습니다.

```json
{ "text": "캐릭터 대사", "characterState": "MOVED" }
```

- 상태값 5종의 정의와 캐릭터 이미지 대응 관계는
  [story-image-assets.md](story-image-assets.md) 참고
- `NORMAL`/`GUIDED` 응답에는 항상 포함됩니다. `CLOSING`은 이 엔드포인트 자체를
  호출하지 않으므로 해당 없음

## 2. 인증 헤더 (`X-Internal-Token`) — 아직 안 보내고 있습니다

초안은 이 헤더를 전제로 하지만(없으면 401), **현재 백엔드 코드는 이 헤더를 전송하지
않습니다.** 실제 AI 서버 주소가 아직 없어서(U-01 미결) 토큰 값도 정해진 게 없습니다.

- 헤더 이름(`X-Internal-Token`)은 그대로 준비해두시면 됩니다.
- 토큰 값이 정해지는 대로 백엔드가 헤더 전송 코드를 추가하겠습니다.
- 그때까지는 인증 없이 호출됩니다 — 로컬 mock 서버(`AiMockController`)도 인증이 없습니다.

## 3. `/respond` 실패 시 동작 — 초안의 요청과 반대로 동작 중입니다

`free-speech-provider-and-ai-fallback.md`는 "`/respond`가 실패해도 장면을 닫지 말고
검수된 고정 중간 대사로 이어가고, `character_closing`은 실제 종료 조건에서만 쓰라"고
요청했습니다. **백엔드 실제 동작은 정반대입니다.**

**현재 동작**: `/respond`가 실패(타임아웃 5초 초과·오류)하면 그 즉시 `character_closing`을
사용해 **장면을 강제 종료**하고 다음 장면으로 넘어갑니다.

이건 실수가 아니라 의도적 설계입니다([decisions.md D-03](../../../backend/docs/decisions.md)) —
"AI가 죽어도 이야기가 멈추지 않는다"는 원칙으로, 실패를 에러 화면 대신 검수된 고정
대사로 처리해 아이가 막히지 않고 진행되게 합니다. 재시도가 없는 것도 같은 이유입니다
(한 턴에 AI 호출이 2회라 재시도할 여유가 없음).

**바꾸려면 실제 기능 변경이 필요합니다** — 실패 시에만 쓸 "고정 중간 대사"가
`character_closing`과 별도로 장면마다 있어야 하는데, 지금 DB에는 그 컬럼이 없습니다.
이 문서는 결정을 내리지 않고 알리기만 합니다. **바꿔야 한다고 보시면 알려주세요** —
별도 작업으로 진행하겠습니다.

## 완료 조건

- [ ] AI 서버가 `/respond` 응답에 `characterState`를 포함해서 준다
- [ ] `X-Internal-Token` 요구사항을 유지할지 확인 (백엔드는 토큰 값이 정해지면 헤더
      전송 코드를 추가할 예정)
- [ ] `/respond` 실패 시 "장면 강제 종료" 동작을 유지할지, 바꿀지 결정
