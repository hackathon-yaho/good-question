# 검증 실패 원인 조사 — 2026-08-16

`npm run verify` 기준 5개 스위트(mission·layout·handoff·parent·browse)에 남아있던 실패를
"기존 UI 변경으로 인한 검사 드리프트"라고 보고했었다. 실제로 기능 문제가 없는지 하나하나
코드와 브라우저로 직접 확인했다. **결론: 코드 버그는 없다. 목 데이터 보완 1건, 나머지는
전부 검사 쪽 문제다.**

| 스위트 | 실패 | 원인 | 기능 문제? |
| --- | --- | --- | --- |
| mission | 8건 | 의도적으로 제거된 UI(현재 항목 링·키워드 칩) + 의도된 완료 판정 방식 | 아니다 |
| layout | 15건 | layout.mjs만의 낡은 인트로 스킵 루프 | 아니다 |
| layout | 5건 | mission과 같은 원인(제거된 UI) | 아니다 |
| handoff | 2건 | mock이 `characterDisplayName`을 안 채움 | 목에서만. 실서버는 정상 추정 |
| parent | 1건 | 검사 셀렉터가 뒤로가기 버튼을 잘못 집음 | 아니다 |
| browse | 크래시 | 검사 셀렉터가 버튼 2개를 동시에 매치 | 아니다 |

---

## 1. mission.mjs 완료 표시 실패 — 버그 아님, 의도된 동작

**파일**: [`src/features/play/MissionCard.tsx:80-82`](../src/features/play/MissionCard.tsx#L80-L82)

```ts
const completed = satisfiedIndexes
  ? satisfiedIndexes.includes(index)
  : index < doneCount;
```

처음엔 "`[]`도 truthy라서 오른쪽 `doneCount` 폴백이 죽은 코드가 됐다"고 봤는데, 틀렸다.
`satisfiedIndexes`는 **서버가 이 인덱스를 충족했다고 확정해 준 값만** 담는다. 서버가
확정하지 않았는데 턴 수만 보고 "아마 됐겠지"로 체크(✓)를 붙이면, 그건 서버가 확정하지
않은 걸 프론트가 판단하는 셈이라 §0-2 원칙("서버가 확정한 값만 쓴다")에 어긋난다.
그래서 이 오른쪽 분기가 실제로 실행되지 않는 것 자체가 **맞는 동작**이다.

"충족이 확정 안 됐다고 아이를 그 항목에 붙잡아 두는가"는 별개 문제이고, 이미 다른
경로에서 처리된다. `missionDoneCount()`(§ `machine.ts`)가 `satisfiedIndexes.length > 0`을
정확히 검사해 턴 수 기반 폴백을 계산하고, 그 값을 `shouldOpenMissionBrief()`가 써서
확정이 안 와도 미션 브리프를 다시 열어 **다음 항목으로 진행시킨다.** 그러니 "충족 안
돼도 넘어간다"는 요구는 이미 만족되어 있다 — `MissionCard`의 체크 표시만 서버 확정을
기다릴 뿐이다.

정리하면: `MissionCard`에 전달되는 `doneCount` prop은 지금 호출 방식에서는 항상
무시되는 값이다(진행 판단에는 이미 딴 경로에서 쓰이므로 문제는 없다). 코드를 읽을 때
"왜 이 폴백이 안 쓰이지?"라고 헷갈릴 수 있어 정리해 둔다 — 버그는 아니다.

`mission.mjs`가 이 부분에서 잡은 8건 전부(현재 항목 링·키워드 칩 포함)는 그래서
"고쳐야 할 결함"이 아니라 검사가 지금 설계를 못 따라온 것이다.

---

## 2. mission·layout 공통 — 의도적으로 뺀 UI를 검사가 아직 찾는다

[`MissionCard.tsx:14-23`](../src/features/play/MissionCard.tsx#L14-L23) 주석에 명시:

> 현재 항목 하이라이트와 '지금 말해볼 것' 키워드 칩은 뺐다. 4항목을 한눈에 보고
> 스스로 생각하게 두는 쪽으로 정리한 결과다.

이 변경이 언제 있었는지는 알 수 없지만(오늘 세션 이전), `mission.mjs`·`layout.mjs`는
그 이전 설계를 그대로 확인하고 있었다.

- `현재 항목이 정확히 1개`, `첫 현재 항목 = 1번`, `현재 항목이 여전히 1개` — `ring-primary`
  클래스를 찾는다. 지금 카드는 완료/미완료 두 상태만 색으로 구분하고 "현재 항목" 개념
  자체가 없다.
- `'지금 말해볼 것'과 선택지가 다른 행`, `선택지가 4그룹 한글 이름` — 그 라벨의 `<p>`
  자체가 컴포넌트에서 사라졌다.
- `지금 말할 항목이 한 줄로 남는다`(계획 D17, mission.mjs·layout.mjs 공통) — 발화 중에
  미션 카드를 완전히 숨기는 지금 방식과 다르게, 예전엔 "미션" 칩 + 한 줄 요약이
  남아있어야 했다. 코드베이스 전체를 검색해도 그 잔여 UI는 어디에도 없다 — 완전히
  제거됐다.

세 가지 모두 **UI가 고의로 단순해진 결과**이지 버그가 아니다. 검사만 갱신하면 된다.

---

## 3. layout.mjs — C-5·C-3·I-2 도달 실패는 검사 자체의 결함

`layout.mjs`는 인트로를 건너뛸 때 다른 스위트들이 쓰는 공용 헬퍼(`_browser.mjs`의
`skipIntro()`, 시간 마감 기반)를 쓰지 않고 **자기만의 오래된 루프**를 쓴다.

```js
for (let i = 0; i < 6; i += 1) {
  const next = page.getByRole("button", { name: /다음|이야기 시작하기/ });
  if (await next.count()) { await next.first().click().catch(() => {}); await page.waitForTimeout(160); }
}
```

6회 × 160ms = 약 1초. 그런데 인트로는 문장마다 TTS + 0.5초 대기 후 자동으로 다음
문장으로 넘어가고, **마지막 문장에서만** "이야기 시작하기" 버튼이 뜬다. 문장이
여러 개면 1초 안에 마지막 문장까지 자동 진행이 끝나지 않아 버튼이 아직 없고, 그대로
루프가 끝나 버린다. 이후 C-4를 기다리는 12초짜리 대기도 인트로가 끝나기를 기다리다
그냥 흘러간다.

**직접 확인**: 이 6회 루프를 `skipIntro()`로만 바꿔 같은 조건(뷰포트 1133×744, 같은
STT/TTS 스텁)으로 재현했다.

| | 6회 루프(layout.mjs 그대로) | `skipIntro()`로 교체 |
| --- | --- | --- |
| C-4 도달 | 실패 (12초 타임아웃) | 성공 |
| C-5 도달 | 실패 (8초 타임아웃) | 성공 |

같은 앱, 같은 세션 흐름인데 인트로 넘기는 코드만 바꾸면 통과한다. **앱의 대화 진행
자체는 정상이다.** 다른 스위트(turn·mission·handoff 등)는 전부 `skipIntro()`를 쓰기
때문에 이 문제를 겪지 않았고, `layout.mjs`만 자기 루프를 계속 쓰다 뒤처졌다.

**권장 조치**: `layout.mjs`의 인트로 스킵 루프를 `_browser.mjs`의 `skipIntro()`로
교체한다.

---

## 4. handoff.mjs — 재등장 캐릭터 대화 히스토리, 목에서만 안 보인다

`ConversationHistory.tsx`·`PlayScreen.tsx`는 "같은 캐릭터가 여러 장면에 등장하면 그
캐릭터와 나눈 대화 전체를 보여준다"는 기능이 있고, 판단 근거는 메시지마다 실려오는
`characterDisplayName` 필드다.

**직접 확인**: 며느리가 등장하는 장면 1 → 장면 4(재등장) 흐름을 브라우저로 끝까지
몰아 우측 패널을 스냅샷했다.

```
장면 1(며느리) 최대 관측 — 말풍선 7개, 지난이야기=false
장면 4(며느리 재등장) 최대 관측 — 말풍선 1개, 지난이야기=false
```

기대와 다르게 장면 4에서 며느리와의 대화가 **이번 장면 것만(1개)** 보이고, 장면 1의
7개는 이어지지 않았다. `handoff.mjs`의 "재등장 장면이 지난 대화까지 보여준다"가 이
증상을 정확히 잡았다.

**원인**: [`src/lib/api/mock.ts:360-378`](../src/lib/api/mock.ts#L360-L378)의
`pushMessage()`가 만드는 `Message` 객체에 `characterDisplayName` 필드가 아예 없다.

```ts
const message: Message = {
  id: `m_${session.turnOrder}`,
  sceneId, speakerType, turnOrder: session.turnOrder, text,
  createdAt: new Date().toISOString(),
  // characterDisplayName 없음
};
```

`PlayScreen.tsx`의 `npcMessages` 필터는 `m.characterDisplayName === displayName`으로
지난 장면 메시지를 골라내는데, 목이 이 필드를 절대 채우지 않으니 `undefined ===
"방귀쟁이 며느리"`는 항상 거짓이라 지난 장면 메시지가 전부 걸러진다.

**실서버는 어떤가**: 백엔드 코드(`SessionMessageResponse.java`,
`MessageServiceImpl.java`)를 읽어보면 메시지마다
`DialogueContents.forSceneOrder(...).characterDisplayName()`로 이 필드를 실제로
채워 보낸다. 즉 **이 기능은 실서버 응답을 받는 한 정상 동작할 것으로 보인다.**
다만 로컬 목 모드로는 이 기능을 절대 눈으로 확인할 수 없고, `handoff.mjs`도
목으로 도는 한 항상 이 지점에서 실패한다.

**권장 조치**: `mock.ts`의 `pushMessage()` 호출부에서 장면의
`characterDisplayName`을 함께 채운다. (백엔드 코드 수정 아님 — 프론트 목 데이터만
해당)

---

## 5. parent.mjs — 검사가 "뒤로 가기" 버튼을 눌렀다

`NoticesScreen`(`src/features/parent/InfoScreens.tsx`)은 페이지 맨 위에
`<BackButton label="뒤로 가기" />`를 렌더링한다. `href`를 안 넘기면 `<Link>`가 아니라
실제 `<button>`으로 렌더링된다([`BackButton.tsx:75-84`](../src/components/ui/BackButton.tsx#L75-L84)).

`parent.mjs`는 `page.getByRole("button").first()`로 "첫 공지 항목의 아코디언 토글
버튼"을 집으려 했는데, 페이지에서 **가장 먼저 나오는 `<button>`은 뒤로가기 버튼**이다.
그걸 눌러 `router.back()`이 실행되니 아코디언이 열릴 리가 없다. 바로 위 줄의 "미읽음
점" 검사(`OK`)가 이미 통과한 걸 보면 공지 데이터·배지 자체는 멀쩡하다 — 클릭 대상만
잘못 짚었다.

**권장 조치**: `page.getByRole("button").first()` 대신 리스트 안으로 스코프를 좁히거나
(`page.getByRole("listitem").first().getByRole("button")`), 공지 제목 텍스트로 특정한다.

---

## 6. browse.mjs — "닫기" 버튼이 2개 매치돼 크래시

```
strict mode violation: getByRole('button', { name: '닫기' }) resolved to 2 elements:
  1) aria-label="사이드바 닫기"
  2) 실제 텍스트 "닫기" 버튼(단어 모달)
```

Playwright의 `getByRole(..., { name })`은 기본이 **부분 일치**다. "사이드바 닫기"에
"닫기"가 포함되므로 같이 걸린다. 두 버튼은 서로 무관한 별개 UI(사이드바 토글 vs
단어 상세 모달 닫기)라 실제 사용자에게는 아무 문제가 없다 — 검사가 둘을 구분 못 했을
뿐이다.

**권장 조치**: `{ name: "닫기", exact: true }`를 주거나, 모달(`page.getByRole("dialog")`)
안으로 스코프를 좁힌다.

---

## 요약

- **고쳐야 할 코드 버그는 없다.**
- **목 데이터 보완이 필요한 것 1개** — mock.ts에 `characterDisplayName` 채우기
  (실서버는 이미 정상으로 보임).
- 나머지(mission 8건, layout 20건, parent 1건, browse 크래시)는 **전부 검사
  스크립트 쪽 문제**이며, 지금 화면이 잘못됐다는 뜻이 아니다.
