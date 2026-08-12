# TTS 오디오 계약 — 프론트 구현 중 확인이 필요한 3가지

- **요청자**: 프론트 담당
- **작성일**: 2026-08-12
- **우선순위**: 필수 (2번은 없으면 음성이 아예 안 나옴)
- **관련**: [stt-tts-integration.md](../frontend/stt-tts-integration.md) · [decisions.md D-01·D-02·D-05](../../../backend/docs/decisions.md)

2안(백엔드 STT/TTS)을 프론트에 구현했습니다. 목 모드와 백엔드 모드를 전환하는 구조로
만들어 뒀고, 백엔드 모드는 `POST /api/stt`·`GET /api/tts`를 실제로 호출합니다.
헤드리스 브라우저로 녹음→업로드→재생까지 검증했습니다(검증 스위트 `speech` 17건).

**엔드포인트를 만드실 때 아래 3가지만 확인해 주세요.**

---

## 1. `messageId`가 없는 대사가 있습니다 → `?text=` 경로가 필요합니다

요청 문서는 `GET /api/tts?messageId={id}` 하나만 정의합니다. 그런데 **음성이 필요한
텍스트 중 메시지가 아닌 것들이 있습니다.**

| 무엇 | 화면 | `messageId` | 프리워밍 대상인가 |
| --- | --- | --- | --- |
| 도입 내레이션 | C-1 | ❌ 없음 (`story_scenes.scene_description`) | ✅ 예 (B-18의 11건에 포함) |
| 전개 내레이션 | C-2 | ❌ 없음 (같음) | ✅ 예 |
| 캐릭터 대사 | C-3·C-7·C-12 | ✅ 있음 | 일부 |
| 단어 발음 | C-9·E-1·E-2 | ❌ 없음 | ❌ 아니오 |
| 아이 재구성 발화 다시 듣기 | D-6 | ❌ 없음 | ❌ 아니오 |

내레이션은 `messages` 행이 아니라 `story_scenes` 컬럼입니다. `messageId`로는 요청할 수
없는데 **B-18의 프리워밍 11건에는 내레이션 5건이 들어 있습니다.** 프론트가 그걸 꺼낼
경로가 지금 없습니다.

`tts_cache`가 이미 **텍스트 해시 키**([work-items.md B-06](../../../backend/docs/work-items.md))라
서버 쪽 구조는 이미 텍스트 기준입니다. 그래서 요청은 하나뿐입니다.

```
GET /api/tts?text={URL 인코딩된 텍스트}
```

프론트는 **`messageId`가 있으면 그걸로, 없으면 `text`로** 요청합니다. 이미 그렇게
구현해 뒀습니다(`frontend/src/lib/api/speech.ts`). `?text=`가 없으면 도입·전개
내레이션과 단어 발음에 음성이 없습니다.

> 길이가 걱정되면 `POST /api/tts` `{ "text": "..." }`도 괜찮습니다. 프론트에서
> 한 줄 바꾸면 됩니다. 다만 GET이 아니면 브라우저 HTTP 캐시를 못 쓰니 GET을 권합니다.

---

## 2. 오디오는 프론트가 **fetch로** 받습니다 → CORS에 GET·credentials가 필요합니다

`<audio src="http://localhost:8080/api/tts?...">`로 직접 물리면 **쿠키가 실리지 않습니다.**
오리진이 다르고(3000 ↔ 8080) 엘리먼트가 직접 보내는 요청에는 `credentials`를 지정할
방법이 없습니다. JWT 쿠키 인증이므로 그대로 401이 나고 음성이 아예 나오지 않습니다.

그래서 프론트는 이렇게 합니다.

```ts
const response = await fetch(ttsUrl(cue), { credentials: "include" });
const url = URL.createObjectURL(await response.blob());   // <audio>에 물린다
```

**확인 사항** — 이미 되어 있다면 넘어가세요.

- `GET /api/tts`가 CORS 허용 메서드에 포함되어 있는지
- `allowCredentials=true` + `allowedOrigins`에 프론트 오리진이 있는지 (`*` 불가)
- 배포에서 프론트 오리진이 바뀌면 함께 갱신

부수 효과로 "다시 듣기"가 재요청 없이 동작합니다. blob이 이미 손에 있습니다.
(요청 문서: *"다시 듣기는 같은 오디오를 다시 재생하면 됩니다 — 재요청 불필요"*)

---

## 3. `POST /messages` 응답에 `messageId`를 넣어 주세요

요청 문서에 *"응답에 `messageId`가 포함되며, 이 값으로 ③을 호출합니다"* 라고 적혀
있지만 [api.md 3.5](../../spec/api.md)의 응답 필드 목록에는 없습니다. 프론트는 있다고
보고 구현했습니다.

```json
{
  "responseMode": "NORMAL",
  "characterMessage": "정말? 왜 그렇게 생각했어?",
  "messageId": "uuid",
  "...": "나머지는 api.md 3.5와 동일"
}
```

`null`이어도 동작합니다 — 그때는 `?text=`로 요청합니다. 다만 캐시 적중률이 떨어지고
아이 이름이 들어간 대사는 아이마다 다른 키가 되므로 `messageId`를 주시는 게 좋습니다.

---

## 참고 — 프론트가 지키고 있는 것

| 항목 | 구현 |
| --- | --- |
| 오디오 포맷 | 브라우저 기본값 그대로. Chrome `audio/webm`, iOS Safari `audio/mp4` |
| 파트 이름 | `audio` (파일명은 `utterance.webm` 형태로 확장자만 맞춤) |
| 원본 오디오 | 업로드 후 즉시 참조 해제. 저장 경로 없음 (PRD 10.3) |
| 빈 결과 | `text`가 `""`면 `POST /messages`를 **부르지 않고** I-2로 갑니다 |
| 구간 예산 | ① 8초 `AbortController`, ② 10초. 초과 시 I-3 재시도 |
| 실패 처리 | 오디오를 못 받아도 말풍선은 떠 있고 다음 상태로 넘어갑니다 |

## 완료 조건

- [ ] `GET /api/tts?text=`가 동작한다 (도입·전개 내레이션, 단어 발음)
- [ ] `GET /api/tts`가 CORS 허용 메서드에 있고 `allowCredentials=true`다
- [ ] `POST /messages` 응답에 `messageId`가 있다
- [ ] `Content-Type`이 `audio/mpeg`(또는 브라우저가 재생 가능한 형식)이다

## 아직 확인 못 한 것

- **iPad 실기 자동 재생.** 첫 탭에서 무음 오디오로 엘리먼트를 열어 두는 처리를
  넣었습니다(`unlock()`). 실기 확인이 필요합니다
- **구간 예산 8초/10초.** 배포 후 실측값을 공유해 주시면 다시 정하겠습니다 ([Q-14](../../open-questions.md))
