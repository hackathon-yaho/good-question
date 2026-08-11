# 굿퀘스천 프론트엔드

| 항목 | 값 |
| --- | --- |
| 프레임워크 | Next.js 16 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS v4 |
| 배포 | Vercel — Root Directory를 `frontend`로 지정 |
| 기준 해상도 | 1280×800 (C·D 화면), 1440×900 (그 외) |
| 지원 범위 | 1133×744 ~ 1920×1080 가로. 세로는 회전 안내 |

## 크기는 전부 rem이다

`globals.css`의 크기 토큰은 모두 `rem`입니다. **px로 박으면 안 됩니다.**

- 문서형(A·B·G·H): 루트 16px 고정
- 몰입형(C·D): `ImmersiveShell`이 `<html>`에 `data-shell="immersive"`를 걸어 뷰포트 비례 스케일
  (1280×800에서 1.00× → 1920×1080에서 1.35×)

`rem`은 언제나 `<html>` 기준이라 셸 div에 `font-size`를 줘도 안 먹습니다.

컴포넌트에 넘기는 크기(`<MicButton size={180}>`)는 **screens.md의 설계 px를 그대로** 쓰고,
내부에서 `rem()`으로 변환합니다. 명세와 코드가 같은 숫자를 쓰면서 해상도에 비례합니다.

계산식과 실측표는 [screens.md §1-1b](../docs/spec/screens.md)에 있습니다.

## 실행

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm run lint
npm run verify  # 브라우저 검증 (dev 서버를 먼저 띄운 상태에서)
```

## 검증

`npm run verify`가 헤드리스 Chromium으로 실제 화면을 조작해 **236개**를 확인합니다.
`scripts/verify/`에 스위트별로 나뉘어 있습니다.

| 스위트 | 범위 |
| --- | --- |
| `play` | C-1 도입 · 자동재생 게이트 · TTS |
| `turn` | C-3~C-6 대화 1턴 · NORMAL/GUIDED/CLOSING |
| `handoff` | `/play` 완주 → `/activity` 인계 (장면 4개 전부 닫히는지) |
| `activity` | D-1~D-7 · 키워드 실시간 점등 |
| `drag` | D-2 카드 드래그 (마우스 · 터치) |
| `account` | A-1~A-5 · B-1 · 새로고침 유지 · 라우트 가드 · 정원 초과 |
| `system` | I-1 · I-3 · I-4 (오프라인 → 재시도 → 발화 복구까지) |
| `browse` | B-2·B-3·B-4 · C-9 → 단어장 · E · F-1 |
| `parent` | A-6 · G-1~G-4 · H-1~H-7 |
| `layout` | 태블릿 5종 — 버튼 줄바꿈·넘침, C-10 미션 겹침·잘림 |

단순 렌더 확인이 아니라 **요건 위반을 잡는 검사**가 섞여 있습니다. 예: 리포트에
점수·등급·백분위 표현이 없는지, 내부 사고 요소 태그가 보호자 화면에 새지 않는지,
F-1에 "내 목소리로" 문구가 없는지, 미션이 전체 화면 모달이 아닌지.

Chromium을 못 찾으면 `npx playwright install chromium`, 또는 `GQ_CHROME`으로
크롬 실행 파일을 직접 지정하세요.

## 문서

구현 전에 읽어야 하는 문서입니다. **화면 명세가 UI 정본**입니다.

| 문서 | 내용 |
| --- | --- |
| [../docs/spec/screens.md](../docs/spec/screens.md) | 화면 48개 · 상태 전이 · 디자인 토큰 |
| [../docs/spec/api.md](../docs/spec/api.md) | 서버 계약 (3절이 프론트↔백엔드) |
| [../docs/spec/assets.md](../docs/spec/assets.md) | 이미지 규격 · 미수령 에셋 폴백 |
| [../docs/team/roles.md](../docs/team/roles.md) | 2장이 프론트 담당 범위 |
| [../docs/open-questions.md](../docs/open-questions.md) | 미결 · 문서 간 충돌 |

## 구조

```
src/
├── app/
│   ├── globals.css              디자인 토큰 (screens.md §1-2 ~ §1-4)
│   ├── layout.tsx               루트 + ToastHost
│   ├── page.tsx                 A-1 스플래시
│   └── dev/gallery/             컴포넌트 갤러리 (개발용, 제출물 제외)
├── components/
│   ├── shells/                  ImmersiveShell · SidebarShell · CenteredShell
│   └── ui/                      공통 컴포넌트 10종 (screens.md §1-6)
├── features/
│   ├── account/                 A-2 로그인 · A-3 동의 · A-4 등록 · A-5 선택
│   ├── home/                    B-1 홈
│   ├── stories/                 B-2 목록 · B-3 상세 · B-4 이어하기 모달
│   ├── play/                    C — 대화 상태머신 (C-9 단어 팝업 포함)
│   ├── activity/                D — 말하기 후 활동
│   ├── wordbook/                E-1 · E-2 단어장
│   ├── mypage/                  F-1 마이페이지
│   ├── parent/                  A-6 · G-1~G-4 리포트 · H-1~H-7 설정
│   └── system/                  I-1 · I-3 · I-4 예외
└── lib/
    ├── thinking-elements.ts     사고 요소 8종 → 아이 화면 4그룹 매핑 (§1-7)
    ├── play-state.ts            PlayState · ActivityStep · 서버 모드 매핑
    ├── client-store.ts          토큰 · 선택한 아이 (localStorage)
    └── relative-date.ts         A-5 "최근 활동" 상대 표기 규칙
```

`/dev/gallery`에서 토큰과 컴포넌트를 한 화면에 볼 수 있습니다. 디자인 시안(Stitch)을
아직 못 받았으므로, 시안이 도착하면 이 화면과 나란히 놓고 대조합니다.

## 구현 순서

[screens.md §6](../docs/spec/screens.md)을 따릅니다.

- [x] 1 — 디자인 토큰 + 공통 컴포넌트 + 셸 3종
- [x] 3 — `/play` 골격 + 상태머신
- [x] 4 — C-1 ~ C-6 (대화 1턴 완주, 목 서버)
- [x] 5 — C-7, C-12 + 장면 전환
- [x] 부분 — C-10·C-11 미션 카드, C-13 일시정지, I-2 인식 실패
- [x] 6 — `/activity` D-1 ~ D-7 (카드 순서 → 키워드 → 다시 말하기 → 완료)
- [x] 2 — A-1 → A-2 → **A-3** → A-4 → A-5 → B-1 (로그인해서 홈까지)
- [x] 7 — I-1 마이크 권한, I-3 네트워크 오류, I-4 권한 거부
- [x] 8 — B-2, B-3, B-4, **C-9**, E-1, E-2, F-1
- [x] 9 — **A-6**, G-1~G-4, H-1~H-7

3단계를 2단계보다 먼저 했습니다. screens.md §6이 "3단계를 절대 뒤로 미루지 마세요.
`/play`의 상태머신이 이 프로젝트에서 가장 위험한 부분이고, 늦게 발견되는 문제일수록
비쌉니다"라고 경고한 것을 따랐습니다.

**2단계에 A-3(동의)을 넣었습니다.** §6 목록에는 없지만, A-4의 `POST /api/children`이
A-3의 동의 값을 함께 받는 계약이고(api.md 3.2) 동의 없는 아이는 세션을 시작할 수
없습니다(라우트 가드). A-3을 빼면 프론트가 동의 값을 임의로 만들어 넣게 되는데
그건 요건 위반입니다.

### 일부러 만들지 않은 것

근거가 없는 UI는 넣지 않았습니다. 화면에만 있는 값은 거짓말이 됩니다.

| 항목 | 이유 |
| --- | --- |
| C-8 힌트 시트 | PRD 5.4가 MVP 범위 밖, 3단계 힌트 콘텐츠가 없음 ([Q-05](../docs/open-questions.md)) |
| G-2 역량 4점 dot | 점 개수를 정하는 산출 기준이 어디에도 없음 ([Q-23](../docs/open-questions.md)) |
| "별가루" 칩 (B-1·F-1) | 적립 규칙이 DB·요건 어디에도 없음 ([Q-12](../docs/open-questions.md)) |
| A-2 구글·네이버 버튼 | PRD M-01은 카카오만 ([Q-02](../docs/open-questions.md)) |
| H-4 "1:1 문의하기" 버튼 | 연결 대상 미정. 눌러도 아무 일 없는 버튼보다 안내가 정직함 |
| G-3 "전체 대화 보기" | 연결 화면이 설계에 없음 |

## 지금 확인할 수 있는 것

```bash
npm run dev
# http://localhost:3000/            로그인부터 전체 동선
# http://localhost:3000/play/demo   이야기 전체 완주 (목 서버, 로그인 생략)
# http://localhost:3000/dev/gallery 토큰·컴포넌트
```

전체 동선: `/` → `/login` → `/onboarding/consent` → `/onboarding/child` → `/profiles`
→ `/home` → `/stories/{storyId}` → `/play/{sessionId}` → `/activity/{sessionId}`

`/login` 하단의 **데모 상태 초기화**(개발 모드에서만 보임)로 계정·아이·세션을 지우고
처음부터 다시 볼 수 있습니다.

| 경로 | 화면 |
| --- | --- |
| `/` | A-1 스플래시 (인증 확인 후 replace 이동) |
| `/login` | A-2 로그인 |
| `/onboarding/consent` · `/onboarding/child` | A-3 동의 · A-4 아이 등록 |
| `/profiles` | A-5 아이 선택 |
| `/home` | B-1 홈 |
| `/stories` · `/stories/{storyId}` | B-2 목록 · B-3 상세 (+ B-4 모달) |
| `/play/{sessionId}` | C-1~C-7, C-9~C-13 (단일 페이지 상태 전환) |
| `/activity/{sessionId}` | D-1~D-7 |
| `/wordbook` · `/mypage` | E-1·E-2 · F-1 |
| `/parent` | A-6 보호자 홈 |
| `/parent/reports` · `/parent/reports/{sessionId}?tab=` | G-1 · G-2/G-3/G-4 |
| `/parent/settings` · `/parent/settings/children` | H-1 (+H-7) · H-2 (+H-6) |
| `/parent/notices` · `/parent/support` · `/parent/guide` | H-3 · H-4 · H-5 |

`/play/demo`에서 도입 → 전개1 → 대화1 → … → 장면4 → `/activity/demo`까지 이어집니다.
서버가 없어도 `src/lib/api/mock.ts`가 [api.md 3절](../docs/spec/api.md) 계약을 흉내내
진행 판단(PRD 6.9)까지 재현합니다.

**짧게 답하면 `GUIDED`, 길게 답하면 `CLOSING`** 으로 갈리므로 세 모드를 모두 볼 수 있습니다.

### 비동기 경계에서 조심할 것

아이가 갇히는 사고가 전부 여기서 났습니다. 고친 방식을 남겨 둡니다.

- **STT 결과는 한 회차에 한 번만 올린다.** `end` 이벤트는 한 번만 온다는 보장이 없습니다.
  이미 끝난 인스턴스에 `stop()`을 다시 부르거나 `abort()`로 끊으면 `end`가 또 오고,
  그때마다 `onFinal`을 부르면 같은 발화가 두 번 제출됩니다
- **뒤늦게 온 응답은 버린다.** 제출 당시의 `sceneId`를 기억해 두고, 돌아왔을 때 화면이
  다른 장면이면 `SERVER_RESULT`도 에러 처리도 하지 않습니다. 지난 장면의 실패로
  지금 장면을 `RETRY_SPEAKING`시키면 전개 낭독 중에 아이 차례로 튀어 영원히 멈춥니다
- **`speechSynthesis.cancel()`은 직전 발화의 `end`를 발생시킨다.** 회차 번호로 걸러내지
  않으면 새 대사가 시작하자마자 "끝났다"고 처리되어 대사가 잘립니다

## 서버 교체 지점

`PlayApi` 인터페이스 하나만 맞추면 화면 코드는 손대지 않습니다.

```
src/lib/api/types.ts          PlayApi · ActivityApi · AccountApi 계약 (유지)
src/lib/api/errors.ts          에러 코드 (유지 — 문구가 아니라 코드로 분기한다)
src/lib/api/mock.ts            /play · /activity 목 (버릴 것)
src/lib/api/mock-account.ts    계정 · 아이 · 홈 목 (버릴 것)
src/lib/client-store.ts        토큰 · 선택한 아이 (서버 세션으로 옮길 것)
화면 컴포넌트                   api 기본값만 교체
```

⚠️ `api`는 **클라이언트에서 주입**합니다. 서버 컴포넌트에서 메서드를 가진 객체를
prop으로 넘기면 `Functions cannot be passed directly to Client Components`로 터집니다.

목 서버는 localStorage에 상태를 남깁니다. 이어하기(B-1 히어로 카드, C 이어하기 복원)가
표시 기능이라 메모리에만 두면 새로고침마다 진행이 사라져 화면이 거짓이 됩니다.

## 지켜야 할 규칙

화면 명세에서 반복 강조된 것들입니다. 어기면 요건 위반이거나 서비스가 작동하지 않습니다.

- **화면 상태는 서버가 정한다.** `NORMAL`/`GUIDED`/`CLOSING`과 카드 순서 정답 여부를 프론트가 판단하지 않는다
- **영문 사고 요소 코드를 아이 화면에 노출하지 않는다.** `lib/thinking-elements.ts`를 거친다
- **원본 음성을 저장하지 않는다.** STT 변환 후 즉시 폐기, 서버로 오디오를 올리지 않는다
- **마이크는 캐릭터 발화가 끝난 뒤 활성화한다.** 발화 중 켜면 캐릭터 음성이 녹음된다
- **`/play`, `/activity`는 페이지 이동이 없다.** 단일 페이지의 상태·단계 전환이다. 새로 그리면 TTS가 끊긴다
- **미션을 전체 화면 모달로 만들지 않는다.** 주최측 요건이다 (open-questions Q-04)
- **평가 표현을 쓰지 않는다.** 점수·등급·퍼센트·"틀렸어요" 금지
- 클릭 타겟은 C·D 화면 72px, 그 외 44px

## STT / TTS

**Web Speech API**로 확정했습니다 (2026-08-10). 시연 기기가 노트북 Chrome입니다.

- STT: `SpeechRecognition` — `interimResults`로 D-5 키워드 실시간 점등까지 구현
- TTS: `SpeechSynthesis` — 백엔드 음성 API 없음
- 발화 제출은 `application/json`으로 **텍스트만** 전송

> 주최측 10월 테스트는 태블릿 대상이고 iOS Safari에서 Web Speech API가 불안정합니다.
> **STT 호출부를 인터페이스로 분리**해 나중에 Whisper로 교체할 수 있게 둘 것.
