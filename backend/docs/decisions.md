# 백엔드 결정 사항

- **작성일**: 2026-08-12
- **결정자**: 백엔드 담당

확정된 결정과 그 근거, 그리고 아직 못 정한 것을 기록합니다.
값 자체는 [`docs/`](../../docs/)가 정본입니다. 여기에는 **"왜 그렇게 정했는지"** 만 둡니다.

---

## 1. 확정

### D-01 · STT / TTS는 OpenAI API를 백엔드가 호출한다

[PRD 9.3](../../docs/product/prd.md)의 **2안**을 채택합니다. STT는 Whisper, TTS는 OpenAI TTS이며
**둘 다 백엔드 몫**입니다. 브라우저 Web Speech API(1안)를 쓰지 않습니다.

| | 1안 Web Speech | **2안 OpenAI (채택)** |
| --- | --- | --- |
| STT | 브라우저 | **백엔드** |
| TTS | 브라우저 | **백엔드** |
| iPad (지원 기기 1순위) | iOS Safari 불안정 | 안정 |

**영향**: 백엔드에 음성 작업이 통째로 추가됩니다 ([work-items.md 8장](work-items.md)).
프론트의 D-5 키워드 **실시간** 점등은 불가능해져 최종 결과 일괄 점등으로 폴백합니다.

> [open-questions Q-16](../../docs/open-questions.md)이 최우선 미결로 올려둔 항목입니다. 이로써 해소됩니다.

---

### D-02 · 발화 1회를 요청 3개로 나눈다

[api.md 3.5](../../docs/spec/api.md)의 "2안 변경점"은 `POST /messages`에 오디오를 실어 보내라고
적었지만, **따르지 않습니다.**

```
① POST /api/stt                    오디오 → 텍스트        8초
   ── 아이가 화면에서 확인·수정 ──                        ← 요청이 갈리는 지점
② POST /api/sessions/{id}/messages 텍스트 → 분석·응답     10초
③ GET  /api/tts?messageId=         대사 → 오디오
```

**근거**: [PRD F-05](../../docs/product/prd.md)가 *"변환된 텍스트를 화면에 표시"* 하고
*"보내기 버튼을 눌러 발화를 제출"* 하도록 요구합니다. 아이의 확인 동작이 중간에 들어가므로
한 요청 안에 담을 수 없습니다. api.md대로 합치면 확인 단계가 사라져 **F-05 요건을 못 맞춥니다.**

**부수 효과** — [open-questions Q-09](../../docs/open-questions.md)(빈 발화) 가 자동 해소됩니다.
STT 결과가 비면 ①에서 끝나고 ②를 호출하지 않으므로, `messages`에 빈 `text`가 들어갈 경로 자체가
없어집니다. [PRD 8.9](../../docs/product/prd.md)의 *"확정 텍스트가 없으면 메시지를 생성하지 않는다"* 를 지킵니다.

또한 각 구간이 15초 예산 안에 들어갑니다. 합치면 18초로 초과합니다.

---

### D-03 · 타임아웃과 실패 폴백

[roles.md 5장](../../docs/team/roles.md)이 "반드시 정한다"고 지정했으나 미정으로 남아 있던 항목입니다.

| 구간 | 타임아웃 | 재시도 |
| --- | --- | --- |
| 백엔드 → AI `/analyze` | 5초 | 0회 |
| 백엔드 → AI `/respond` | 5초 | 0회 |
| 백엔드 → Whisper | 8초 | 0회 |

재시도를 두지 않는 이유: 한 턴에 AI 호출이 2회라 재시도 여유가 없습니다.

| 실패 지점 | 동작 |
| --- | --- |
| `/analyze` 실패 | 빈 분석(`detectedElements: []`, `utteranceValidity: UNCLEAR`)으로 **정상 진행.** `/respond`는 호출됨 |
| `/respond` 실패 | `character_midline`(검수된 고정 중간 대사)으로 대체, **장면은 끝내지 않고** 다음 아이 차례를 유지 (D-40. 최초엔 `character_closing`으로 장면 종료였다가 변경) |

**원칙: AI가 죽어도 이야기가 멈추지 않습니다.** 실패를 에러 화면으로 올리지 않고
아이의 다음 차례를 그대로 이어갑니다.

**슬립 방지**: 외부 크론 10분 간격 핑 + 헬스체크에 `SELECT 1` 포함.
Render 콜드 스타트와 Supabase 일시정지를 한 번에 막습니다
([open-questions Q-14](../../docs/open-questions.md) 권고).

---

### D-04 · 아이 이름 치환은 백엔드가 한다

[roles.md 3.10](../../docs/team/roles.md)은 백엔드를 **권고**했지만, D-01 채택으로 **필수**가 됩니다.

TTS를 백엔드가 만들기 때문입니다. 프론트에서 치환하면 화면에는 "민준아"가 뜨는데
백엔드가 만든 음성은 "ㅇㅇ아"를 읽습니다.

**치환 시점**: `messages`에 저장할 때. 이후 화면·TTS·AI 입력이 모두 같은 문자열을 씁니다.

**받침 규칙** — 대상은 2건뿐입니다 ([PRD 7.5](../../docs/product/prd.md)).

| 원문 | 받침 O (민준) | 받침 X (지호) |
| --- | --- | --- |
| `ㅇㅇ아, 내 방귀가…` (대화1) | 민준**아** | 지호**야** |
| `ㅇㅇ이 덕분에…` (대화4) | 민준**이** 덕분에 | 지호 덕분에 |

판정: `(마지막 글자 - 0xAC00) % 28 != 0` 이면 받침 있음.

---

### D-05 · TTS 캐시는 DB에 두고, 기동 시 11건을 미리 만든다

**파일시스템에 두지 않습니다.** Render 무료 티어는 재배포·재시작 시 초기화됩니다
([open-questions Q-16](../../docs/open-questions.md)이 O-15에 대해 같은 지적을 했습니다).

`tts_cache` 테이블(텍스트 해시 → 오디오 `bytea`)을 추가합니다.
PRD 8장 테이블 목록에 없는 **팀 추가 테이블**입니다.

**프리워밍은 기동 시 1회**, DB에 없는 것만 생성합니다. 세션 시작마다 하지 않습니다 —
이야기가 1편이고 고정 대사가 모든 아이에게 동일하므로, 기동 시 끝내두면 시연 중에는 항상 캐시 히트입니다.

**대상은 13건 중 11건입니다.**

| 종류 | 건수 | 프리워밍 |
| --- | --- | --- |
| 도입·전개 내레이션 (`scene_description`) | 5 | ✅ |
| `character_closing` | 4 | ✅ |
| `character_opening` — 대화2·대화3 | 2 | ✅ |
| `character_opening` — 대화1·대화4 | 2 | ❌ **아이 이름이 들어가 아이마다 다름** (D-04) |

제외한 2건은 첫 재생 시 생성해 캐시에 추가합니다.

---

### D-06 · 인증은 자체 JWT, 소셜은 카카오 단독

[open-questions Q-01 · Q-02](../../docs/open-questions.md) 해소.

- **Spring Security + JWT.** Supabase Auth를 쓰지 않습니다 ([PRD I-10](../../docs/product/prd.md), [roles.md 3.3](../../docs/team/roles.md))
- **카카오만 구현.** 요건은 "카카오·구글·네이버 중 **1개 이상**"이므로 충족됩니다 ([PRD F-01](../../docs/product/prd.md)). 화면에 3개를 그려두고 2개가 안 되면 시연에서 감점 요소가 됩니다

> 화면 명세 A-2의 "Supabase Auth" 표기는 낡은 것입니다. 프론트에 공유가 필요합니다.

---

### D-07 · `stories`에 `situation` · `child_role` 컬럼을 추가한다

[open-questions Q-03](../../docs/open-questions.md) 해소.

이야기 상세 화면(B-3)의 "이야기 상황"과 "아이 역할" 문구는 [PRD F-03](../../docs/product/prd.md)에
확정값으로 있으나 저장할 컬럼이 없었습니다.

화면 명세는 "이야기 상황 = 첫 장면 `conflict`"라고 적었지만 **`conflict`는 다른 용도**입니다 —
장면별 캐릭터 딜레마이고, 분석 LLM 입력(`sceneContext`)에 들어가는 값입니다
([PRD 7.5.1](../../docs/product/prd.md)). 화면에 보여줄 문구가 아닙니다.

컬럼으로 둔 이유: 이야기 단위 값이라 자리가 자연스럽고, 코드 상수로 두면 `story_id` 분기가 생깁니다.
`scene_type`·`element_criteria`처럼 팀 추가 컬럼 전례가 있습니다.

---

### D-08 · `children.avatar_id` 컬럼을 추가하고 값은 검증하지 않는다

[open-questions Q-11](../../docs/open-questions.md) 해소.

`POST /api/children`은 **✅확정** 표기가 붙은 계약인데 이미 `avatarId`를 포함하고 있습니다
([api.md 3.2](../../docs/spec/api.md)). 컬럼이 없으면 확정 계약의 필드를 버리게 됩니다.

- `varchar`, **nullable** — 에셋 미수령으로 프론트가 안 보낼 수 있음
- **값 검증 안 함** — 아바타 6종 목록이 어느 문서에도 없습니다([Q-20](../../docs/open-questions.md)). 검증을 넣으면 프론트가 값을 바꿀 때마다 백엔드를 고쳐야 합니다
- 이니셜+색상 폴백으로 가더라도 이 컬럼을 그대로 씁니다

---

### D-09 · 별가루를 넣는다 (요건 외 · 후순위)

[open-questions Q-12](../../docs/open-questions.md)는 제외를 권고했으나 **넣기로 결정**했습니다.

> ⚠️ **주최측 요건이 아닙니다.** 추가 요건은 A-01 보호자 리포트 / A-02 단어 저장 /
> A-03 캐릭터 마음 변화 3개뿐이며([PRD 4.2](../../docs/product/prd.md)), 별가루는 화면 명세에만 UI가 있습니다.
> **팀 추가 기능**으로 표기합니다.

적립 규칙이 어느 문서에도 없어 아래를 정했습니다.

| 항목 | 값 |
| --- | --- |
| 저장 | `children.star_dust integer NOT NULL DEFAULT 0` |
| 적립 | **이야기 완료 시 +100** |
| 지급 지점 | M-57 세션 완료 처리 (`status = completed`) |
| 중복 방지 | 이미 `completed`면 건너뜀 |
| 차감·사용처 | **없음.** 표시 전용 |

별도 테이블을 만들지 않습니다. 적립 내역·사용처가 요구된 적이 없어 잔액 숫자 하나면 충분합니다.
지급 지점이 한 곳이라 이미 만드는 로직에 얹힙니다.

---

### D-10 · 카드 순서 재시도는 3회로 제한한다

[open-questions Q-15](../../docs/open-questions.md) 해소.

`attempt_count` 컬럼이 재시도를 전제하지만 제한 규칙이 없어 무한 재시도가 됩니다.
아이가 활동에 갇혀 세션이 완료되지 않고, 화면 명세 D-3의 "실패를 지적하지 않는다" 원칙과도 어긋납니다.

```
1~2회 오답 → { isCorrect: false, attemptCount: N }
3회 오답   → { isCorrect: false, attemptCount: 3, correctOrder: [...], retellingKeywords: [...] }
정답       → { isCorrect: true,  attemptCount: N, retellingKeywords: [...] }
```

- **`correctOrder`는 3회째에만** 실어 보냅니다. [api.md 3.6](../../docs/spec/api.md)의 "내려주지 않는다"는 **처음에** 주지 말라는 뜻입니다
- 3회로 통과시켜도 `is_order_correct = false`로 저장합니다. 기록은 사실대로 남기되 아이 화면에는 실패를 표시하지 않습니다

---

### D-11 · 단어장은 후순위, `highlightWords`는 빈 배열

[open-questions Q-06](../../docs/open-questions.md) 해소.

| 항목 | 결정 |
| --- | --- |
| `wordbook` 테이블 + API 3개 | **선택-후순위.** 필수 완료 후 착수 |
| `highlightWords` | **필드 유지, 빈 배열 `[]` 응답** |

`highlightWords`를 채울 수 없는 이유가 둘입니다.

- 어떤 단어에 밑줄을 칠지, 그 뜻을 누가 쓸지가 **어느 문서에도 없습니다**
- 캐릭터 대사는 LLM이 실시간 생성하므로, 고정 목록을 만들어도 그 단어가 안 나올 수 있습니다

빈 배열이면 계약이 깨지지 않고 프론트는 밑줄을 안 그립니다. 채우려면 → 미결 U-06.

---

### D-12 · 장면 번호를 DB 단위와 화면 단위로 분리한다

[open-questions Q-10](../../docs/open-questions.md) 해소.

DB는 콘텐츠 단계 9개(`scene_order` 1~9), 화면은 전개+대화를 묶은 4구간입니다.
한 필드에 섞으면 진행바가 깨집니다.

```json
"currentSceneOrder": 5,                         // DB 기준 1~9. 복원용
"sceneProgress": { "current": 2, "total": 4 }   // 화면 기준. 진행바용
```

변환은 나눗셈 하나입니다.

```
sceneProgress.current = scene_order / 2   (소수점 버림)

  1 → 0   도입 (진행바 밖)
  2,3 → 1     4,5 → 2     6,7 → 3     8,9 → 4
```

[api.md 3.3](../../docs/spec/api.md)의 예시(`currentSceneOrder: 5` → `current: 2`)와 일치합니다.
`total`은 `scene_type = 'dialogue'` 개수를 세어 구합니다. 하드코딩하지 않습니다.

적용 대상: `GET /api/sessions/{id}`, `GET /api/home`

---

### D-13 · DB는 로컬 Docker, 배포는 Supabase Postgres

**Render 컨테이너 안에 Postgres를 띄우지 않습니다.** 무료 티어는 파일시스템이 영구 저장이 아니어서
재배포·재시작·슬립 복귀 때마다 초기화됩니다. 아이 세션과 발화 기록이 날아갑니다.

| 환경 | DB |
| --- | --- |
| 로컬 | Docker Compose Postgres |
| 배포 | **Supabase Postgres** (DB만 사용) |

Supabase **Auth는 쓰지 않습니다.** 문서의 Supabase 배제는 인증 한정입니다
([roles.md 3.3](../../docs/team/roles.md), [PRD I-10](../../docs/product/prd.md)).

전환은 `SPRING_DATASOURCE_URL` 교체만으로 끝납니다.

---

### D-14 · 스키마는 JPA `ddl-auto`로 관리한다 (Flyway 미도입)

Flyway가 값을 하는 건 여러 명이 같은 스키마를 고치거나 운영 데이터를 지켜야 할 때입니다.
백엔드 1명 + 시연용 데이터라 그 이점이 나오지 않습니다.

`element_criteria`를 재배포 없이 갈아끼우는 요구([PRD 8.7](../../docs/product/prd.md))는 그냥
`UPDATE` 문이라 마이그레이션 도구와 무관합니다.

*→ 팀이 스키마를 공유 편집하게 되면 그때 도입.* 주의사항은 [setup.md](setup.md).

---

### D-15 · 이미지는 URL 문자열만 내려주고, 백엔드가 서빙하지 않는다

PRD 8장 테이블에 이미지 컬럼이 아예 없어 추가합니다.

| 대상 | 처리 |
| --- | --- |
| 이야기 표지 | `stories.cover_image_url varchar` |
| 장면 배경 | `story_scenes.background_image_url varchar` |
| 캐릭터 초상 | **코드 상수.** 표시명과 같이 관리 ([PRD I-13](../../docs/product/prd.md)) |
| 후속 활동 카드 | `post_activity_config` jsonb에 `imageUrl` 추가. 스키마 변경 없음 |

**백엔드가 이미지 바이트를 서빙하지 않습니다.** 하면 아이가 화면을 넘길 때마다 슬립 상태의
Render를 깨우는 요청이 이미지 개수만큼 발생합니다. D-03에서 방어한 지연이 이미지 로딩에서 되살아납니다.

URL의 실제 형태(Supabase Storage 절대 URL vs 프론트 정적 상대경로)는 **에셋 수령 시 확정**합니다
→ 미결 U-03. **어느 쪽이든 스키마가 같아서** 지금 결정하지 않아도 작업이 막히지 않습니다.

---

### D-16 · OpenAI 키를 파트별로 분리한다

| 용도 | 키 소유 |
| --- | --- |
| Whisper (STT) · OpenAI TTS | **백엔드 담당** |
| `gpt-5-mini` (분석·캐릭터 응답) | **AI 담당** |

비용도 분리 집계됩니다. [PRD 10.4](../../docs/product/prd.md)의 "8턴 기준 1.5만~2만 토큰" 상한은
AI 담당 쪽에만 걸립니다. **음성 비용 상한은 어느 문서에도 없습니다** → 미결 U-04.

---

### D-17 · 이 폴더에 값을 복사하지 않는다

스키마·콘텐츠·엔진 규칙의 값은 [PRD](../../docs/product/prd.md)가 정본이고, 여기는 링크만 겁니다.

특히 `element_criteria`는 AI 담당이 발화 샘플로 튜닝하며 계속 바뀔 예정입니다
([roles.md 4.4](../../docs/team/roles.md)). 복사해두면 확실히 낡습니다.

> [docs/README.md](../../docs/README.md): *"같은 값이 두 곳에 있으면 반드시 한쪽이 낡습니다."*

---

### D-18 · 카카오 로그인은 백엔드 리다이렉트 방식(Spring Security `oauth2Login`)으로 구현한다

api.md 3.1의 원안(`POST /api/auth/{provider}` — 프론트가 카카오 SDK로 code를 받아 백엔드에
전달)을 **폐기합니다.** 대신 Spring Security의 `oauth2Login`이 인가 코드 발급·토큰 교환·
사용자 정보 조회를 전부 처리하는 리다이렉트 방식을 씁니다.

**근거**: 프론트에 카카오 SDK 연동이나 앱키 관리가 전혀 필요 없습니다. 브라우저가
`GET /oauth2/authorization/kakao`로 이동하기만 하면 로그인이 끝나고, 백엔드가 JWT를
HttpOnly 쿠키로 심어 프론트로 리다이렉트합니다. 참고 프로젝트 두 곳을 비교해 결정했습니다 —
`yeogiyeogi-backend`(프론트 SDK 방식)가 아니라 `wcp-backend`(Spring Security 리다이렉트 방식)의
구조를 따랐습니다.

**흐름**

```
GET /api/oauth2/authorization/kakao  → 302 카카오
GET /api/login/oauth2/code/kakao     → (code, Spring이 자동 처리)
                                      → CustomOAuth2UserService: parents 조회/생성
                                      → OAuth2SuccessHandler: JWT 쿠키 설정
                                      → 302 {FRONTEND_URL}/auth/callback?hasCompletedOnboarding=
```

**해커톤 규모로 덜어낸 것** — 참고 프로젝트 대비:

| 참고 프로젝트에 있던 것 | 우리 | 이유 |
| --- | --- | --- |
| Refresh Token + Redis 블랙리스트 | ❌ | Redis 미사용. **access token만, 유효기간 7일** — 시연 중 만료 없음 |
| 쿠키 값 AES 암호화 | ❌ | JWT 자체가 서명되어 변조를 검증함. 이중 암호화 불필요 |
| Rate Limiting(Bucket4j) | ❌ | Redis 의존 + 해커톤 범위에 불필요 |
| Role/Status 기반 세밀한 인가 | ❌ | 로그인 사용자는 전부 `ROLE_PARENT` 하나 |
| 매 요청 DB 조회 인증 | ❌ | JWT의 `parentId`만 principal로 사용 |

**추가한 것** — 참고 프로젝트에 없던 것:

- **`Authorization: Bearer` 헤더 지원.** 쿠키(브라우저)뿐 아니라 헤더로도 인증 가능 —
  Postman/curl로 테스트하는 프론트·AI 담당이 쿠키 핸들링 없이 바로 쓸 수 있게 하기 위함
- **`POST /api/auth/dev-login`.** 카카오 앱 등록 전에도 dev parent로 JWT를 즉시 발급받아
  다른 파트가 막히지 않게 함. **시연 배포 전 반드시 제거**
- **`parents`에 `provider`·`provider_id`·`email` 컬럼 추가.** PRD 8.3 원안은 `id`·`name`·
  `created_at`뿐이라 재방문 사용자를 조회할 방법이 없었음. `email`은 **nullable** — 카카오
  이메일 동의항목이 선택 동의로 빠질 수 있고, 식별은 `provider_id`로 하므로 이메일 없이도
  서비스가 완전히 동작함

**쿠키 설정**: `HttpOnly`, `Path=/`, `SameSite`는 `app.cookie-secure` 하나로 전환
(`false`→`Lax`, `true`→`None; Secure`). 로컬(http)과 배포(https, Vercel↔Render 크로스 도메인)의
차이를 환경변수 하나로 흡수합니다.

**실측 검증 완료** (2026-08-12, 로컬):
- `POST /api/auth/dev-login` → parent 생성 + 쿠키 설정 + `{parentId, accessToken}` 응답
- 재호출 시 같은 parent 재사용 확인 (중복 생성 없음)
- `GET /api/auth/me`를 `Authorization: Bearer`로 호출 → 200
- 토큰 없이 호출 → 401 `{"code":"UNAUTHORIZED","message":"..."}` (api.md 2.3 포맷)
- **`KAKAO_CLIENT_ID`가 비어 있으면 애플리케이션이 부팅 자체를 거부합니다** (Spring이 OAuth2
  클라이언트 등록을 기동 시점에 검증). 카카오 앱 등록 전에는 `.env`에 placeholder 값을
  넣어둬야 다른 작업(스키마 확인, dev-login 등)이 가능합니다.

**실카카오 계정 로그인 검증 완료** (2026-08-12): 카카오 개발자 앱 등록 완료 후 브라우저로
`/oauth2/authorization/kakao`부터 실제로 끝까지 진행했습니다. 동의 화면에 앱 이름·닉네임 항목만
정확히 뜨고(`redirect_uri` 불일치 오류 없음), 동의 후 실제 카카오 회원번호로 `parents` 레코드가
생성되고, `{FRONTEND_URL}/auth/callback?hasCompletedOnboarding=false`로 리다이렉트되고,
쿠키만으로 `GET /api/auth/me`가 인증됨을 확인했습니다. `client-authentication-method:
client_secret_post` + 실제 Client Secret 조합이 정상 동작합니다.

---

### D-19 · 대화 장면 4건의 `scene_description`은 팀이 한 줄로 작성한다

[PRD 7.4](../../docs/product/prd.md)는 도입·전개 장면의 `scene_description`만 제공합니다.
대화 장면(대화1~4)의 `scene_description`은 제공 자료에 없는데, [PRD 7.5.1](../../docs/product/prd.md)은
`sceneContext`(발화 분석 입력)를 `scene_description` + `conflict`로 구성하도록 정의하고 있어
값이 없으면 그 조립 자체가 안 됩니다.

**결정**: `conflict`·`element_criteria`와 같은 성격의 팀 창작 값으로 취급하고, 각 대화 장면이
시작되는 상황을 한 문장으로 적었습니다 (`story/ContentSeeder.java`). 자문위원 검수 대상이
아니므로 다른 팀 창작 값과 함께 실제 발화 샘플 검증 후 조정될 수 있습니다 (PRD 7.5.4).

**추가로 정한 것 — `remainingWorries`·`guidanceStyle`·캐릭터 표시명 (M-19, B-08)**: DB 컬럼이
아니라 `story/constant/DialogueContents.java`에 `scene_order` 키로 둡니다. 며느리가 대화1·4에
모두 등장하지만 심리 상태가 달라 캐릭터 단위가 아니라 캐릭터+장면 조합 단위로 관리해야 하기
때문입니다 (PRD 7.5.4). DB에 두지 않는 이유는 D-17(이 폴더에 값을 복사하지 않는다)과 같은
결로, 자문위원 검수 대상이 아닌 팀 창작물이라 재배포로 바꾸는 편이 시드 데이터 `UPDATE`보다
다루기 쉽기 때문입니다.

---

### D-20 · 미션 노출 조건(M-47~M-49)은 AI 계약 확장 없이 기존 필드로 판정한다

[PRD 7.6](../../docs/product/prd.md)의 미션1 조건 4개를 **전부** 구현합니다. 노출 시점은
백엔드가 결정하며([roles.md 3.7](../../docs/team/roles.md)) AI 서버에 새 필드를 요청하지 않습니다.

| PRD 조건 | 판정식 |
| --- | --- |
| 며느리의 **방귀를 활용**할 수 있다고 제안 | `childIntent == SOLUTION` **&&** 발화 원문에 "방귀" 포함 |
| 해결 **방향은 말했지만 구체적이지 않음** | `childIntent == SOLUTION` **&&** `SOLUTION ∉ accumulatedElements` |
| **2회 이상**인데 실행 방법이 안 나옴 | `turnCount >= 2` **&&** `SOLUTION ∈ missingElements` |
| 캐릭터 **질문만으로 구체화하기 어려움** | 직전 턴이 `GUIDED` + `guidanceTarget == SOLUTION` **&&** `SOLUTION ∈ missingElements` |

**핵심 — "구체적인가"를 새로 판정하지 않습니다.** 그 판정은 이미 `element_criteria`가 하고
있습니다. [PRD 6.4](../../docs/product/prd.md)가 *"막연한 당위·예의 표현만으로는 해결 방법을
인정하지 않는다"*, 대화3 기준이 *"실제 행동이 드러나야 함"*으로 규정하므로 **구체성 미달 발화는
애초에 `detectedElements`에 들어오지 않습니다**. 따라서 `childIntent`(무엇을 하려 했는가)와
누적 요소(무엇이 기준을 통과했는가)의 **차이**가 곧 조건 2입니다. `/analyze` 응답에 구체성
점수 같은 필드를 추가할 필요가 없습니다.

**조건 4에 카운터 컬럼을 두지 않은 이유**: 대화 장면의 `max_turns`가 4~5라 유도 횟수가 2를
넘길 수 없습니다. 기존 `last_response_mode`·`last_guidance_target`으로 충분해 스키마를
늘리지 않았습니다.

**미션2**는 PRD가 조건식 대신 흐름만 줍니다 — "부끄러워하지 않아도 된다고 말함 → 긍정하는
이유 확인 → 관점 확장". 대화4의 `element_criteria`상 앞 두 단계가 각각 `PERSPECTIVE`
(*"특징을 그 사람 입장에서 바라보고 말한 경우"*)와 `REASON`(까닭)에 대응하므로,
**둘이 모두 누적된 시점**을 노출 시점으로 봅니다.

**남는 리스크는 계약이 아니라 튜닝입니다.** 조건 2가 성립하려면 AI가 `element_criteria`를
일관되게 적용해야 합니다. 기준이 느슨하면 미달 발화도 SOLUTION으로 잡혀 조건 2가 안 뜨고,
너무 엄격하면 계속 떠서 미션이 과다 노출됩니다. [PRD 7.5.4](../../docs/product/prd.md)가 이미
`element_criteria`를 "실제 발화 샘플 검증 후 조정" 대상으로 두었으므로 그 검증에 함께 포함합니다.

> **정정 이력**: 최초 구현에서는 조건 2·4를 "AI 계약 확장이 필요해 구현 불가"로 판단해
> 빼고, 조건 1을 `childIntent == SOLUTION` 단독으로 두었습니다. 후자는 "장대를 쓰면 돼요"처럼
> **방귀와 무관한 제안에도 미션1이 뜨는 과잉 발동**이었습니다. `element_criteria`가 이미
> 구체성 판정을 수행한다는 점을 놓친 것이 원인이며, 위 표대로 4개 조건 전부 재구현했습니다.

---

### D-21 · STT/TTS 모델·목소리, TTS 생성 타임아웃 값

PRD·api.md 어디에도 구체적인 모델명이 없어 팀이 정합니다.

| 항목 | 값 | 근거 |
| --- | --- | --- |
| STT 모델 | `whisper-1` | [PRD 9.3](../../docs/product/prd.md)·[decisions.md D-01](decisions.md)이 "Whisper"까지만 지정 |
| TTS 모델 | ~~`tts-1`~~ **`gpt-4o-mini-tts`로 교체(D-35)** | 캐시를 쓰므로(D-05) 지연시간보다 비용이 우선 — `tts-1-hd`는 쓰지 않음 |
| TTS 목소리 | ~~`alloy` 전체 공통~~ **캐릭터별로 분리(D-35)** | 다국어 목소리 중 하나. 한국어 전용 옵션이 없어 팀이 임의 선택 |
| TTS 생성 타임아웃 | 8초 | [D-03](decisions.md)의 표에 TTS가 빠져 있음(Whisper만 명시). 캐시 미스 시에만 타는 경로라 실제 호출은 드물지만, Whisper와 같은 값으로 맞춰 둠 |

TTS 실패(타임아웃 포함)는 `/analyze`·`/respond`처럼 별도 폴백을 두지 않습니다.
api.md 2.3의 일반 `5xx/타임아웃` 처리로 충분합니다 — 캐릭터 대사가 안 나오는 것과 달리,
오디오 재생 실패는 대화 진행 자체를 막지 않기 때문입니다 (프론트가 I-3으로 처리).

**구현 중 발견한 것**: Spring의 `MultipartBodyBuilder`로 Whisper에 오디오를 보내면
`NoClassDefFoundError: org/reactivestreams/Publisher`가 났습니다. 이 클래스가 WebFlux 전용
`reactive-streams` 의존성을 참조하는데, 이 프로젝트는 서블릿(MVC) 기반이라 클래스패스에 없기
때문입니다. `LinkedMultiValueMap<String,Object>` + `ByteArrayResource`로 바꿔 해결했습니다 —
새 의존성을 추가하지 않고 이미 있는 `FormHttpMessageConverter`가 처리하게 한 것입니다.
`ApplicationRunner`에서 예외가 나면 `ApplicationContext` 기동 자체가 막힌다는 점도 이때
확인했습니다 — `TtsPrewarmRunner`가 항목 하나 실패로 서버 전체를 못 띄우던 걸 항목별
try/catch로 고쳤습니다.

---

### D-22 · `highlightWords`를 채우는 방식 — "포함될 때만" 골라낸다

D-11이 남겨둔 미결(U-06)을 해소합니다. D-11이 지적한 문제는 "고정 목록을 만들어도 LLM이
그 단어를 안 쓸 수 있다"였는데, **목록을 그대로 내려주는 게 아니라 그 턴의 캐릭터 응답 텍스트에
후보 단어가 실제로 포함되는지 검사한 뒤 포함된 것만 골라내는 방식**으로 이 문제 자체를
없앴습니다. 안 나오면 이번 턴은 빈 배열이고, 다음 턴에 나오면 그때 뜹니다 — 항상 정답입니다.

- 후보 단어·뜻은 `story/constant/HighlightWords.java`에 장면(`scene_order`)별로 팀이 만들어
  둡니다. `DialogueContents`와 같은 이유(자문위원 검수 대상 아닌 팀 창작물)로 DB가 아니라
  코드 상수입니다.
- 검사는 대화 장면의 `character_opening`에는 적용하지 않습니다 — 그 응답 스키마
  (`SceneCompleteResponse`)에 애초에 `highlightWords` 필드가 없습니다. `POST .../messages`가
  만드는 캐릭터 응답(NORMAL/GUIDED 텍스트, CLOSING의 `character_closing`)에만 적용됩니다.
- 후보는 각 장면 1개씩만 넣어뒀습니다 — 선정 기준 자체가 문서에 없어 팀 재량이고(D-11),
  개수를 늘리는 건 언제든 `HighlightWords`만 고치면 됩니다.

**`wordbook`(O-06~O-10)도 이참에 같이 구현합니다.** 진입점(밑줄 단어 탭)이 막혀 있어 후순위로
미뤄뒀었는데, 위 방식으로 `highlightWords`가 실제로 채워지게 되어 막힌 이유가 해소됐습니다.

PRD 8.12 원 스키마(`id`, `child_id`, `word`, `meaning`, `source_scene_id`)에 팀이 2개를 더합니다.

| 컬럼 | 근거 |
| --- | --- |
| `liked` | D-11에서 이미 결정 |
| `context_sentence` | api.md 3.7 프론트 응답 예시에 있는 필드인데 PRD 스키마엔 없음. 저장 시점에 화면에 떠 있던 대사 원문을 서버가 역산할 방법이 없어(같은 장면이라도 세션마다·턴마다 캐릭터 대사가 다름 — LLM 실시간 생성) `POST /api/wordbook` 요청에 선택 필드로 함께 받는다 |

`GET /api/wordbook`의 `total`은 api.md 3.7 표에 "필터와 무관한 전체 개수"라고 명시돼 있어
`filter` 적용 전 전체 개수를 반환합니다 — 필터링된 `words.length`가 아닙니다.

---

### D-23 · O-13 NORMAL soft-cue 구현 — 새 AI 필드 없이 기존 유도 필드를 재사용한다

work-items.md·plan.md는 O-13을 "미구현 시 NORMAL 일반 반응으로 동작. 새 필드 불필요"로
적어두고 사실상 스킵 대상처럼 남겨뒀습니다. 그런데 [PRD 6.14](../../docs/product/prd.md)를
다시 읽어보니 **"새 필드가 불필요하다"는 건 맞지만 "백엔드 코드가 불필요하다"는 뜻이
아니었습니다** — [api.md 4.2](../../docs/spec/api.md)가 이미 명시적으로 방법까지 정해뒀습니다.

> ⚠️ soft-cue를 구현할 때: `responseMode = NORMAL`인데도 `remainingWorry`를 실어 보내면
> 됩니다. 새 필드는 필요 없습니다.

즉 **GUIDED와 똑같은 `guidanceTarget`/`remainingWorry`를, `responseMode`는 `NORMAL`로 둔 채
같이 보내는 것**이 구현입니다. `story_sessions.last_guidance_target` 컬럼 설명도 처음부터
"GUIDED **또는 soft-cue** 대상 사고 요소"였습니다 — 같은 컬럼을 공유하도록 설계돼 있었습니다.

**트리거 조건은 우연이 아니라 규칙 엔진의 빈틈을 정확히 메웁니다.** `ProgressJudge`의 2단계
"강한 유도 제한"은 신규 요소가 막 잡힌 턴을 **항상 NORMAL로 강제**합니다(축하하는 턴에 바로
유도를 얹지 않기 위함). PRD 6.14의 soft-cue 조건("NORMAL + 신규 요소 + missing 남음")은 바로
그 턴을 가리킵니다 — 강제로 NORMAL이 됐지만 아직 부족한 요소가 있으면, 약하게만 다음 요소를
곁들이라는 것입니다. 두 규칙이 서로를 위해 설계된 것처럼 맞물립니다.

**구현**: `GuidanceSelector.selectForTurn(mode, reactionKey, missing, hasNewlyAccumulatedElement,
previousGuidanceTarget)`. `MessageServiceImpl`이 `reactionKey`를 계산한 직후 호출한다 —
soft-cue 스킵 대상(`playfulUtterance`·`questionFromChild`·`unclearUtterance`)을 걸러내려면
reactionKey가 있어야 하기 때문에, 기존에 바깥에서 미리 계산하던 `guidanceTarget`을
`resolveCharacterResponse` 안으로 옮겼다. 대상 선택 자체는 `GuidanceSelector.select()`를
그대로 재사용한다(직전 유도 요소 반복 회피 원칙도 soft-cue에 동일 적용).

**검증**: mock 스텁으로 신규 요소가 잡히는 턴을 재현해 `responseMode: "normal"`이면서
`story_sessions.last_guidance_target`이 채워지는 것을 DB로 직접 확인했다. `GuidanceSelector`
단위 테스트 6건(GUIDED/소프트큐 성립·신규요소 없음·missing 없음·스킵 반응 3종·CLOSING) 추가.

---

### D-24 · 보호자 리포트(O-01~O-05) — `reports`는 세션 완료 시 1회 생성해 jsonb로 저장한다

**배경**: `backend/docs/reports.md`로 전달받은 자료가 저장소에 이미 있던
[리포트 가이드](../../docs/reference/guardian-report-guide.md)(주최측 원문)와 같은 내용이었고,
프론트가 이 가이드를 기준으로 `frontend/src/lib/api/{types.ts, mock-parent.ts}`에 응답 형태와
계산 로직을 이미 구현해 둔 상태였다. **추론하지 않고 이 두 자료를 그대로 따랐다.**

**저장 시점 — 세션 완료(M-57) 시 1회.** 조회할 때마다 다시 계산하는 방식(테이블 없이)도
검토했으나, 계산 로직을 나중에 바꿔도 이미 만들어진 리포트가 그대로 남아야 한다는 이유로
저장 방식을 택했다(PRD 8.12 원안과도 일치). `ActivityServiceImpl.submitRetelling`에서
`child.addStarDust()`와 같은 자리에 `parentReportService.generateReportIfAbsent(session)`을
얹었다 — 이미 있으면 아무것도 하지 않는다.

**스키마 — PRD 8.12(`summary`·`strengths`·`next_focus` 3컬럼)를 그대로 쓰지 않는다.**
가이드가 요구하는 구조(어휘 집계, 역량 5개 카드, 사고 요소 4그룹 집계, 대표 발화, 가정 가이드)를
3개의 평평한 컬럼에 담을 수 없어, `summary`(text)만 남기고 나머지는 jsonb 5개로 확장했다
(`vocabulary`·`competencies`·`element_counts`·`representative`·`guide`). `tts_cache`·`wordbook`과
같은 이유 — 원안이 실제 요구사항보다 먼저 쓰였다.

**계산 로직은 새로 설계하지 않고 `mock-parent.ts`를 그대로 포팅했다** (`parent/report/ReportGenerator.java`):

| 값 | 알고리즘 |
| --- | --- |
| `vocabulary` | 아이 발화 원문을 공백·문장부호로 분리, 2글자 이상만, 빈도순 상위 6개가 주요 어휘, 2회 이상이 반복 표현 |
| `competencies` | 역량 5개 **항상 전부** 반환. 해당 사고 요소가 세션 어디에든 있으면 "있음" 문구+가장 긴 발화를 근거로, 없으면 "없음" 문구(부정적이지 않게)+근거 `null` |
| `elementCounts` | 사고 요소 8종 → 아이 화면과 같은 4그룹(마음/이유/생각/방법)으로 집계. **장면 초기화와 무관하게 세션 전체**를 본다 — `story_sessions.accumulated_elements`(장면 전환 시 초기화)가 아니라 `utterance_analyses`를 세션 전체로 훑는다 |
| `representative` | 문장 수 많은 순 → 길이 순으로 1개만 선정 (가이드 5절, Q-08) |
| `guide` | 평균 발화 길이 15자 미만이면 SHORT, 아니면 표현·논리 사고 요소 개수 비교로 4가지 질문 세트 중 하나 선택 (가이드 7절) |

**대표 발화·질문 세트 선택 알고리즘은 가이드 원문이 아니라 프론트가 정한 휴리스틱이다** — 가이드는
"무엇을 볼지"만 정하고 "어떻게 계산할지"는 안 정했다. 사용자 확인 후 **프론트와 동일하게** 가기로
했다 — 프론트/백엔드가 각자 다른 기준으로 리포트를 만들면 나중에 프론트가 서버 응답을 그대로
쓰도록 바꿀 때 결과가 달라진다.

**AI를 호출하지 않는다.** 근거는 이미 저장된 `utterance_analyses.detected_elements`뿐이고,
문구도 전부 역량별로 미리 써둔 고정 텍스트(있음/없음 두 버전)를 조건에 따라 골라 쓴다.
새 LLM 호출 경로가 생기지 않는다.

**검증**: 세션을 대화4까지 완주 → `POST .../retelling` → `reports` 테이블에 행 1개 생성,
`reportAvailable: true` 확인. `GET /api/parent/{summary,reports,reports/{sessionId}}` 3개
전부 curl로 응답 형태 확인. 완료 전 세션의 `reports/{sessionId}` → 404, 다른 보호자 접근 → 403.
`ReportGeneratorTest` 18건(포화 케이스 포함) 단위 테스트.

---

### D-25 · 마이페이지(F-1) — 문서 전체 점검 중 발견한 미추적 엔드포인트를 포팅으로 완료

`GET /api/mypage`는 [api.md 3.9](../../docs/spec/api.md)에 스펙까지 있었는데
`work-items.md`·`plan.md` 어느 Phase 표에도 걸린 적이 없어 계속 놓치고 있었다. 사용자 요청으로
전체 문서 대조 점검(2026-08-12)을 하다가 발견했다. `screens.md` F-1은 이미 "✅ 구현"으로
표시돼 있어 프론트가 화면 자체는 만들어 뒀었다 — 다만 이 엔드포인트 없이 기존 엔드포인트
조합으로 그리고 있어서 프론트가 막혀 있지는 않았다.

D-24와 같은 방식 — **추론하지 않고 프론트 mock(`frontend/src/lib/api/mock-content.ts`
`getMypage()`)을 그대로 포팅했다.**

- `stats.activeDays`는 세션의 **아이 발화만이 아니라 모든 메시지**(캐릭터·시스템 포함)의
  날짜를 모아 distinct 개수를 센다 — mock 원본이 그렇게 짜여 있다. 실질적으로는 아이가
  말한 날에만 캐릭터 응답도 생기므로 결과는 같지만, 기준 자체는 "화자 무관"이다
- `completedAt`/`createdAt`은 보호자 리포트(api.md 3.8)와 달리 **`yyyy.MM.dd`로 가공하지
  않은 원본 `Instant`** 그대로 내려간다 — mock도 이 두 값만은 `formatDate()`를 거치지 않는다
- 새 테이블 없음. 전부 기존 테이블(`story_sessions`·`messages`·`wordbook`·`post_activity_results`)
  조회로 계산한다

**검증**: 완료 세션 2건·단어 1건이 있는 아이로 조회 → 통계·목록 값 확인. 활동이 없는 아이로
조회 → 에러 없이 전부 0/빈 배열. 다른 보호자 접근 → 403, 없는 `childId` → 404.

---

### D-26 · TTS 계약 정정 — 프론트 통합 검증 결과를 반영해 `?text=` 추가, 응답 필드명 수정

프론트가 실제 구현·헤드리스 브라우저 검증(17건)을 마친 뒤 보낸
[tts-audio-contract.md](../../docs/request/backend/tts-audio-contract.md) 3개 항목 중
2개가 실제로 어긋나 있었다. `api.md`·`api-spec.md`는 백엔드가 설계·구현한 시점의 기록이라
이 문서보다 오래됐고, **이 요청 문서 쪽이 실제 통합 결과를 반영한 최신 사실**이라 이 문서를
기준으로 고쳤다.

1. **`GET /api/tts?text=` 추가.** 기존엔 `messageId`만 필수 파라미터였는데, 도입/전개
   내레이션(`story_scenes.scene_description`)·단어 발음처럼 `messages` 행이 아닌 텍스트는
   요청할 방법이 없었다. `TtsServiceImpl`이 이미 텍스트 해시로 캐싱하고 있어서(D-05) 서비스
   계층은 그대로 두고 `getAudioForText(text)`만 추가, 컨트롤러가 `messageId`/`text` 중 있는
   쪽으로 분기하도록 했다. 둘 다 없으면 400 `INVALID_REQUEST`.
2. **`MessageCreateResponse.characterMessageId` → `messageId`로 필드명 변경.** 프론트
   타입(`frontend/src/lib/api/types.ts`)과 실제 fetch 코드가 `messageId`를 읽도록 이미
   구현·검증까지 끝나 있었다 — 백엔드가 다른 이름으로 보내고 있어서 실제로 연동하면 이 값이
   `undefined`가 되는 상태였다(조용히 깨지는 버그). 프론트를 바꾸는 대신 백엔드 필드명을
   프론트가 이미 검증한 이름에 맞췄다.

CORS(GET 메서드·`allowCredentials`)는 이미 충족돼 있어 변경 없음.

**검증**: `POST /messages` 응답에 `messageId` 확인 → `GET /tts?messageId=`(200, 오디오) →
`GET /tts?text=`(200, 오디오) → 파라미터 둘 다 없음(400) → 비로그인(401).

---

### D-27 · O-12 캐릭터 마음 변화 — `characterState` 필드를 AI 응답에서 직접 받는다 (D-41로 뒤집힘)

PRD 11.3 O-12(주최측 추가 요건 A-03, "아이의 발화 내용에 따라 캐릭터 표정 또는 태도
변화")는 원래 담당이 "프론트·AI"로만 적혀 있어 백엔드 문서 어디에도 추적되지 않고
있었다(D-25 마이페이지와 같은 종류의 누락). 이번에 이미지 에셋을 AI로 재생성하는
작업([docs/request/ai/story-image-assets.md](../../docs/request/ai/story-image-assets.md))을
정리하면서 함께 설계했다.

**상태값을 백엔드가 `reactionKey`로 미리 분류하지 않고 AI가 직접 판단해서 준다.**
백엔드가 발화 성격으로 미리 분류해 둔 값(예: `reactionKey`)과 AI가 실제로 생성한
문장의 뉘앙스가 어긋날 수 있어서다 — 대사를 실제로 쓴 쪽(AI)이 그 대사에 맞는
표정을 고르는 게 더 정확하다는 판단.

- 상태값 5종 고정(모든 캐릭터 공통): `NEUTRAL`/`HAPPY`/`WORRIED`/`SURPRISED`/`MOVED`
  (`message/enums/CharacterState.java`)
- `AiRespondClientImpl`이 `/respond` 응답의 `characterState` 문자열을 파싱한다. 없거나
  5종 밖의 값이면 **예외를 던지지 않고 `null`로 폴백**한다 — 실제 AI 서버가 아직 이
  필드를 안 보내는 과도기에도 기존 흐름(캐릭터 대사 자체)이 깨지면 안 되기 때문이다
- `CLOSING`(장면 마무리, `character_closing` 고정 문구 사용)과 `/respond` 실패 폴백은
  애초에 AI를 안 부르므로 `characterState`가 항상 `null`이다 — 프론트는 이 두 경우 이전
  상태를 유지하거나 기본 이미지를 쓰면 된다
- 로컬 `AiMockController`도 `characterState: "MOVED"`를 같이 내려주도록 갱신 — 실제 AI
  서버가 붙기 전에도 필드 배관을 끝까지 검증할 수 있게

이미지 파일(캐릭터 3명 × 상태 5종 = 15장) 자체는 아직 없다 — 이번 작업은 필드
배관까지만이고, 프론트가 이 값으로 실제 이미지를 바꾸는 것은 이미지 도착 후 별도 작업이다.

**검증**: 대화 중 턴(`normal`/`guided`) 응답에 `characterState: "MOVED"`(목 서버 고정값)
확인 → 마지막 턴(`closing`) 응답에 `characterState: null` 확인.

---

### D-28 · 미션2 노출 조건 정정 — REASON 제거, PERSPECTIVE 단독

D-20에서 미션2 조건을 `PERSPECTIVE && REASON`(둘 다 누적)으로 정했는데, 그 근거가
"대화4(장면9)의 `element_criteria`에 REASON이 있다"는 **잘못된 전제**였다. 실제 장면9
`required_elements`는 `EMOTION`·`PERSPECTIVE`·`RESULT`·`SOLUTION` 4개뿐이라 REASON은
애초에 감지될 수 없는 요소였다 — `/analyze` 요청의 `targetElements`에도 안 들어가고,
로컬 mock 서버도 REASON을 낸 적이 없어 **한 번도 실제로 트리거된 적 없는 조건**이었다.
사용자가 "미션2도 트리거가 있냐"고 물어본 것을 계기로 발견했다(D-20의 검증 부채가
실현된 사례 — D-20이 이미 "조건 2가 성립하려면 AI가 element_criteria를 일관되게 적용해야
한다"며 검증이 더 필요하다고 남겨뒀었다).

**정정**: `PERSPECTIVE` 단독으로 판정한다(`turnCount >= 1 && PERSPECTIVE ∈ accumulatedElements`).
PRD 흐름의 마지막 단계("관점 확장")만 잡고, 앞 두 단계("부끄러워 안 해도 됨 → 긍정하는
이유")는 별도 요소로 강제하지 않는다 — `RESULT`로 대체하는 대안도 검토했으나(장면9
opening/closing이 "좋은 일에 씀"을 언급해 `RESULT`가 의미상 더 가깝다), 사용자가
PERSPECTIVE 단독을 선택했다.

**검증**: 로컬 mock 기준 전체 세션 주행(장면1→9) → 장면9 첫 턴에 `missionTriggered.id ==
"mission_2"` 확인. 단위 테스트(`MissionTriggerTest`) 3건 갱신.

---

### D-29 · 미션 "반드시 노출" 보장 — GOAL_MET 유예 + 강제 노출 턴

주최측이 미션1·미션2를 조건부가 아니라 **항상 노출돼야 한다**고 확정했다. 확인해보니 실제
경쟁 조건이 있었다: `ProgressJudge`의 `GOAL_MET`(필수 요소 충족 시 조기 종료) 판정이
`MissionTrigger`의 조건 판정보다 먼저 장면을 닫아버릴 수 있다 —
`MessageServiceImpl.createMessage()`가 `characterTurn.sceneEnded()`인 턴엔 `judgeMission(...)`을
아예 호출하지 않기 때문이다. 특히 장면9(대화4, 미션2)는 `preferredTurns=2`라, 필요한 요소
4개(`EMOTION`·`PERSPECTIVE`·`RESULT`·`SOLUTION`)가 2턴 안에 다 채워지면 미션 조건이 한 번도
평가되지 못한 채 장면이 닫힐 수 있었다(D-28에서 이미 이 경로가 실제로 한 번도 트리거된 적
없다는 걸 확인한 것과 같은 성격의 위험).

**2단계로 고쳤다.**

1. **`ProgressJudge` — GOAL_MET 유예.** `ProgressInput`에 `hasUnrevealedMission` 필드를
   추가하고, 이 값이 `true`이고 `turnCount < maxTurns`이면 `GOAL_MET`으로 닫는 대신 이번
   턴을 NORMAL/GUIDED로 흘려보내 `judgeMission`이 실행될 기회를 준다. **`MAX_TURNS`(대화
   길이 하드 한도) 분기는 그대로 무조건 종료** — 미공개 미션이 있어도 최대 턴을 넘겨
   대화가 늘어지지는 않는다. 판단 순서(1→2→3→4)는 바꾸지 않고 1단계 안에 게이트 하나만
   추가했다.
2. **`MissionTrigger` — 강제 노출.** `MissionTriggerContext`에 `maxTurns`를 추가하고,
   `turnCount >= maxTurns - 1`(장면 종료 직전 턴)이면 내용 조건(미션1의 4개, 미션2의
   `PERSPECTIVE`)과 무관하게 무조건 노출하는 `forcedByApproachingMaxTurns`를 OR로 붙였다.

두 장치는 짝을 이룬다 — 1번이 없으면 강제 노출 턴에 도달하기 전에 장면이 먼저 닫혀버릴 수
있고, 2번이 없으면 유예만 하고 실제로 노출은 안 될 수 있다.

**전제 조건**: 이 방식은 `maxTurns > preferredTurns`(여유 턴이 최소 1턴)를 가정한다. 장면7은
5 vs 3, 장면9는 4 vs 2로 둘 다 여유 2턴이라 안전하다. 앞으로 미션이 딸린 장면을 새로 추가할
때 `maxTurns == preferredTurns`로 두면 이 보장이 깨진다 — 코드에 짧은 주석으로 남겨뒀다.

**해소됨(D-40)**: `/respond` AI 실패 폴백(B-12)이 `character_closing`으로 장면을 즉시 강제
종료하던 문제 — 장면마다 대체용 "중간 대사"(`character_midline`)를 준비해 D-40에서 고쳤다.
더 이상 `hasUnrevealedMission`과 무관하게 장면을 강제로 닫지 않는다.

**검증**:
- 단위 테스트: `ProgressJudgeTest`에 GOAL_MET 유예/`MAX_TURNS` 하드 한도 유지 2건,
  `MissionTriggerTest`에 미션1·미션2 강제 노출 2건 추가. 전체 88건 통과.
- 라이브: 장면9에서 `PERSPECTIVE`가 전혀 안 쌓이도록(evidence 문구를 뺀 발화) 유도해도
  `turnCount == maxTurns-1(=3)`에 `mission_2`가 강제로 뜨는 것 확인. GOAL_MET 유예 자체는
  로컬 mock이 고정 `PERSPECTIVE`만 내놔서 `missingEmpty`를 실제로 재현할 수 없어 라이브
  검증은 못 했고, 위 단위 테스트로 대신 검증했다.

---

### D-30 · 미션 체크리스트 항목 단위 진행 — `missionProgress` 필드 신설

프론트 요청([request/backend/mission-progress.md](../../docs/request/backend/mission-progress.md))
— 미션을 한 항목씩 순차로 보여주는 화면으로 바뀌면서 "몇 번째까지 끝났는지"가 필요해졌다.
문제는 미션1 체크리스트의 1·2번이 **둘 다 `SOLUTION`**이라는 점이다 — `accumulatedElements`는
집합이라 "SOLUTION을 두 번 채웠다"를 표현하지 못하고, 서버가 `SOLUTION`을 처음 확정하는
순간 1·2번이 동시에 완료된 것처럼 보인다.

**해결**: 미션 노출 이후 아이 발화를 **턴 순서대로** 훑어서, 각 턴에서 확인된 요소 종류마다
아직 안 채워진 같은 종류의 체크리스트 칸을 하나씩 채운다(`MissionProgressCalculator`,
순수 함수). 데이터 출처는 `accumulatedElements`(집합, 순서 정보 없음)가 아니라
`utterance_analyses.detected_elements`를 메시지(턴) 단위로 그대로 읽는다 — 이건 이미
저장돼 있는 값이라 새 컬럼이 필요 없다.

- `POST /messages` 응답에 `missionProgress: { missionId, satisfiedIndexes }` 추가.
  미션이 없거나 아직 노출 전이면 `null`, 장면이 이번 턴에 닫히면(`CLOSING`) 그것도 `null`
  — 프론트가 "미션 진행 중일 때만" 값을 받는다는 요청 그대로
- 한 턴에 서로 다른 요소가 여러 개 확인되면 그 턴에서 체크리스트 칸 여러 개가 동시에
  채워질 수 있다(요청 문서가 명시적으로 금지하지 않았고, 실제로 그런 발화가 가능함)
- `MessageRepository`에 미션의 `system` 메시지를 턴 순서까지 포함해 찾는 메서드,
  `UtteranceAnalysisRepository`에 메시지 단건 조회 메서드를 추가

**검증**: `MissionProgressCalculatorTest` 6건(반복 요소 순서대로 채움, 세 번째 확인은
더 채울 칸이 없어 무시, 한 턴에 여러 칸 동시 충족, 체크리스트에 없는 요소 무시, 전체
충족 시 순서 등). 라이브로는 로컬 mock이 `PERSPECTIVE`만 내놔서 실제로 칸이 채워지는
모습은 못 봤지만, `missionProgress`가 노출 전 `null` → 노출 시점부터 `{missionId,
satisfiedIndexes:[]}` → 장면 종료 시 다시 `null`로 정확히 전환되는 건 확인했다.

---

### D-31 · 메시지 히스토리에 `characterDisplayName` 추가

프론트 요청([request/backend/message-character.md](../../docs/request/backend/message-character.md))
— C-3 우측 패널이 "그 캐릭터와 나눈 이야기 전체"를 보여주도록 바뀌었는데, 같은 캐릭터가
여러 장면에 재등장한다(PRD I-13, 며느리가 장면3·9). `GET /sessions/{id}`의 `messages[]`엔
`sceneId`만 있고 캐릭터 정보가 없어서, 지난 장면 대사가 누구 것인지 응답만으로 알 수 없었다.

**해결**: `SessionMessageResponse`에 `characterDisplayName`을 추가하고,
`DialogueContents.forSceneOrder(message.getScene().getSceneOrder()).characterDisplayName()`으로
그 메시지가 속한 장면 기준 캐릭터를 채운다. `messages[]`에 담기는 메시지는 전부 대화
장면(3·5·7·9) 소속이라(도입·전개 장면엔 메시지가 안 생김) `forSceneOrder`가 항상 성립한다.

- **`child` 발화에도 채운다** — 프론트가 요청한 그대로. 아이 발화 자체엔 캐릭터가 없지만
  "그 대화 상대"를 의미하므로, 같은 장면의 캐릭터 이름을 그대로 쓴다
- `POST /messages`는 안 건드렸다 — 그 응답엔 애초에 `messages[]` 배열이 없고(단일 턴
  응답), 이미 `characterName`으로 현재 턴의 캐릭터를 알려주고 있어 요청 문서가 말한
  간극이 없다. 요청 문서 제목에 두 엔드포인트가 같이 적혀 있었지만 실제 간극은
  `GET /sessions/{id}` 쪽뿐이라고 판단해 그쪽만 고쳤다

**검증**: 세션을 장면3→9까지 진행(같은 캐릭터 며느리가 재등장) → `GET /sessions/{id}`로
전체 `messages[]` 조회 → 장면3·장면9 메시지 전부 `"방귀쟁이 며느리"`로, 장면5는
`"시아버지"`로, 장면7은 `"마을 이장"`으로 정확히 태그됨을 확인. `child` 발화도 같은 값이
채워짐, `system` 메시지(미션 노출)는 기존대로 목록에서 빠짐.

---

### D-32 · 카드 순서 — 칸별 정오 `slotResults` 추가

프론트 요청([request/backend/order-slot-results.md](../../docs/request/backend/order-slot-results.md))
— 오답일 때 배치 전체가 아니라 **틀린 칸만** 표시하고 싶은데, 정답 판정은 서버만 한다는
원칙(PRD 8.11)상 프론트가 정답을 몰라 어느 칸이 틀렸는지 계산할 수 없었다.

**해결**: `POST .../activity/order` 응답에 `slotResults: boolean[]`를 추가한다 —
`correctOrder[i].equals(submittedOrder[i])`를 칸(인덱스)별로 계산만 하고, 정답 **순서
자체는 여전히 내려주지 않는다**(요청 문서가 강조한 대로 정답 역산 불가 유지).

- `isCorrect: true`이거나 3회째(정답 공개로 전환)면 `slotResults`를 안 보낸다 —
  기존에 `correctOrder`·`retellingKeywords`가 조건부로 **키 자체를 생략**하던
  `@JsonInclude(NON_NULL)` 관례를 그대로 따랐다(이 셋 다 같은 레코드)
- 맞은 칸에 대한 별도 신호는 없다 — `false`만 의미 있게 쓰고, 나머지는 프론트가
  "표시 안 함"으로 처리하는 게 요청 문서의 의도(정답 개수를 세는 화면이 되지 않도록)

**검증**: 1·2회째 오답 제출 → `slotResults`가 실제 오답 위치와 정확히 일치(`[true,false,
false,true]`류) 확인. 3회째 오답 → `slotResults` 키 자체가 응답에서 빠지고 `correctOrder`로
전환됨 확인. 정답 제출(1회째) → `slotResults` 없음 확인.

---

### D-33 · 별가루 잔액·적립량 응답 노출

프론트 요청([request/backend/star-dust-exposure.md](../../docs/request/backend/star-dust-exposure.md))
— 별가루 UI(B-20)는 이미 화면에 그려져 있는데 그 값을 읽을 응답이 없어서, 실서버로 붙이면
별가루 UI가 통째로 안 보이는 상태였다. `children.star_dust` 컬럼은 이미 있어서(D-09)
응답에 실어주기만 하면 됐다.

- `GET /api/home`·`GET /api/mypage`의 `child` 객체에 `starDust`(누적 잔액) 추가
- `POST .../activity/retelling` 응답에 `earnedStarDust`(이번 활동으로 적립된 양) 추가.
  `ActivityServiceImpl.submitRetelling`이 이미 계산해 두던 "처음 완료라 지급했는지"
  분기(`alreadyCompleted`)를 그대로 재사용 — 이미 완료된 세션이면 0

**검증**: 완료 세션 2건(각 +100) 있는 아이로 `GET /home`·`GET /mypage` → 둘 다
`starDust: 200` 확인. 새 세션 완주 → `retelling` 응답에 `earnedStarDust: 100` 확인.

---

### D-34 · 도입부 텍스트 4~6문장 확장 요청 반려

프론트 요청([request/backend/star-dust-exposure.md](../../docs/request/backend/star-dust-exposure.md)
"함께 요청" 항목) — C-1 도입부가 "다음"으로 한 문장씩 넘기는 화면인데 지금 3문장뿐이라
너무 빨리 끝난다며 4~6문장으로 늘려달라는 요청이었다.

**반려 사유**: 도입부 `scene_description`은 [PRD 7.4](../../docs/product/prd.md)에 명시된
**주최측 제공·자문위원 난이도 검수 완료 텍스트**로 "원칙적으로 수정할 수 없다"고 규정되어
있다. 유일한 예외인 전개2([I-04](../../docs/open-questions.md))도 팀이 늘리거나 새로 쓴 게
아니라 "이미 주최측이 제공한 두 버전 중 하나를 정본으로 택한" 경우였다 — 이번처럼 검수
완료 텍스트에 팀이 문장을 새로 창작해 끼워 넣는 것과는 성격이 다르다. `conflict`·
`elementCriteria`(D-19)처럼 애초에 주최측 값이 없어 팀이 채운 항목도 아니다.

**처리**: 도입부 텍스트는 3문장 그대로 유지. 페이싱 문제는 프론트 쪽 UI 처리로 넘긴다 —
[request/frontend/intro-pacing-declined.md](../../docs/request/frontend/intro-pacing-declined.md)로 회신.

---

### D-35 · TTS 캐릭터별 목소리·연기 지시 — `tts-1`→`gpt-4o-mini-tts` 교체

사용자 요청 — 나레이션·며느리·시아버지·마을 이장이 전부 같은 목소리(`alloy`, D-21)로 나가서
캐릭터 구분이 안 됐다. `tts-1`은 목소리(`voice`)만 고를 수 있고 말투를 지시하는 방법이 없어,
**`gpt-4o-mini-tts`로 모델을 교체**하고 `instructions`(억양·감정·속도·톤 지시, 공식 문서 확인—
`developers.openai.com/api/docs/guides/text-to-speech`)를 함께 쓰기로 했다.

- **비용**: `tts-1`은 $15/1M자, `gpt-4o-mini-tts`는 텍스트 $0.60/1M토큰 + 오디오 출력
  $12/1M토큰(공식 pricing 문서 확인). D-21이 `tts-1`을 고른 이유가 "캐시로 커버되니 비용 우선"
  이었는데, 사용자 판단으로 "대사가 짧아서 차이가 크지 않다"고 보고 교체를 확정했다 — 캐릭터
  응답(NORMAL/GUIDED)은 매 턴 새 텍스트라 캐시가 안 먹는다는 점은 그대로 남는 트레이드오프다.
- **voice 매핑** — `DialogueSceneConstants`에 `ttsVoice` 필드 추가, 같은 캐릭터(며느리:
  대화1·4)는 같은 값을 쓴다.

  | 캐릭터 | voice |
  | --- | --- |
  | 나레이션(도입/전개, 단어 발음, `?text=` 전체) | `alloy` |
  | 며느리 (대화1·4) | ~~`shimmer`~~ **`marin`로 교체(D-36)** |
  | 시아버지 (대화2) | `onyx` |
  | 마을 이장 (대화3) | `echo` |

- **instructions는 새로 만들지 않고 기존 `guidanceStyle`(PRD 7.5.3, GUIDED 유도 재료)을
  그대로 재사용**한다 — "조심스럽고 걱정이 많은 말투" 같은 문구가 텍스트 생성 지시와 TTS
  연기 지시로 동시에 맞는 내용이라 별도 필드를 만들 이유가 없었다. 나레이션은 새 상수
  하나(`VoiceProfile.NARRATOR`)만 추가. **→ D-36에서 전용 필드로 분리.**
- **목소리 선정 방법**: `tts-1`이 지원하는 9종 목소리를 실제로 같은 문장으로 생성해서
  들어보고 골랐다(스크립트로 6종 우선 비교 후 사용자 확인).
- **캐시 키 확장**: `TtsCache`는 텍스트 해시만 키였는데(D-05), 같은 문장이라도 화자가 다르면
  다른 오디오여야 하므로 해시 입력을 `voice + "|" + instructions + "|" + text`로 바꿨다.
  스키마 변경은 없다 — 해시 함수에 넣는 입력만 바뀐 것이라 `ddl-auto: update`로 충분하다.
- **API 계약은 안 바뀐다.** `GET /tts`의 `messageId`/`text` 파라미터·응답 형태 그대로 —
  어떤 목소리를 쓸지는 서버가 메시지의 장면·화자 정보로 알아서 정한다. `api.md`/`api-spec.md`
  수정 없음.
- Custom Voice(성우 클로닝)는 문서상 "eligible customers" 제한이 있어 이번엔 쓰지 않았다.

**검증**: `DialogueContentsTest`에 ttsVoice 일관성 테스트 2건 추가(대화1·4 같음, 대화2·3 다름),
`./gradlew test` 전체 통과. 서버 기동 후 새 문장으로 `GET /tts?text=` → 200·오디오 생성 확인.
같은 원문("그랬구나, 네 말을 들으니 마음이 좀 놓이는구나.")을 며느리(대화9) 메시지와
마을 이장(대화7) 메시지 각각의 `messageId`로 요청 → 둘 다 200, 바이트 크기·해시가 서로 다름을
확인(같은 문장·다른 목소리가 실제로 다른 오디오를 만든다는 증거). 404(`messageId` 없음)·400
(`messageId`/`text` 둘 다 없음) 기존 에러 케이스 회귀 없음 확인.

---

### D-36 · TTS instructions — `guidanceStyle` 재사용을 그만두고 `ttsGuideStyle` 필드로 분리

D-35에서 "재료를 새로 안 만들고 `guidanceStyle`을 재사용한다"고 했었는데, 사용자가 `/grill-me`로
검토하다가 이 재사용 전제 자체를 짚었다 — `guidanceStyle`은 **AI가 대사 "내용"을 생성할 때** 쓰는
지시고, TTS instructions는 **이미 만들어진 대사를 "어떻게 읽을지"** 지시하는 것이라 목적이 다르다.
"조심스럽고 걱정이 많은 말투" 한 줄로는 둘 다 대충 맞았지만, 목소리 연기를 더 다듬으려면(자연스러운
발화 vs 성우 연기 톤 구분 등) 결국 TTS 전용 문구가 따로 필요해져서, 처음부터 필드를 분리하기로
했다. `guidanceStyle`(AI 프롬프트용)은 전혀 안 건드렸다.

- `DialogueSceneConstants`에 `ttsGuideStyle` 필드 추가(`guidanceStyle` 옆). `VoiceProfile.forScene`이
  이제 `ttsGuideStyle()`을 읽는다.
- **며느리 voice를 `shimmer`→`marin`으로 교체.** `tts-1`용으로 골랐던 D-35의 6종 후보에는
  `marin`이 없었다(`gpt-4o-mini-tts` 전용 목소리라 그때는 들어볼 수 없었음) — 이번에
  `marin`/`shimmer`/`coral`을 실제 `guidanceStyle` instructions로 생성해서 비교 후 확정.
- **instructions 작성 원칙이 바뀌었다** — "she is warm, shy, considerate..." 식 성격 나열이
  아니라, TTS가 실제로 수행할 수 있는 발화 지시(속도·쉼·톤 변화) 중심으로 쓴다. "young"처럼
  나이를 과하게 반복하면 모델이 그 특징을 과장 연기하는 경향이 있어 한 번만 언급한다. 캐릭터
  구분은 "감정"보다 "말하는 방식"(며느리: 짧은 pause·부드러운 말끝 / 시아버지: 반응이 커지고
  빨라짐·안 위협적 / 이장: 발음 명확·여유 있는 반응)으로 준다. 4개 장면 전부 영문으로 작성했다
  (D-35 예시가 한국어 지시보다 자연스러운 결과를 냈다는 것을 확인 후 결정).
- **며느리 대화1·4는 같은 사람이 성장하는 것으로 쓴다** — voice·기본 성격은 그대로 두고,
  대화4 쪽 문구에만 "지금은 더 편안해졌다", "예전보다 망설이는 pause가 적다", "같은 사람인데
  조금 더 자신감 있다"는 지시를 넣어 톤만 바꿨다. 목소리 자체가 바뀌는 게 아니라 "같은 목소리가
  자란다"는 느낌을 노린 것이다.
- **speed 파라미터는 도입하지 않는다.** `gpt-4o-mini-tts`가 `speed`(0.25~4.0, 공식 문서 확인)를
  지원하긴 하지만, 실측 근거 없이 캐릭터마다 숫자를 추측해 넣지 않기로 하고 전부 기본값(1.0,
  파라미터 자체를 안 보냄)으로 뒀다. 필요해지면 `OpenAiTtsClient`에 파라미터 하나만 추가하면
  되는 구조라 지금 안 만들어도 나중에 붙이기 쉽다.
- **목소리·문구 확정 방법**: 이번에도 텍스트 설명만으로 정하지 않고, 후보 조합을 실제
  `gpt-4o-mini-tts` API로 생성해서 들어보고 골랐다(며느리 voice 후보 3종 1차 비교, 최종
  대화1~4 4개 장면 전부 실제 대사+instructions로 생성해서 확인).

**검증**: `DialogueContentsTest`에 2건 추가(`ttsGuideStyle`이 `guidanceStyle`과 다른 값인지,
같은 캐릭터라도 대화1·4의 `ttsGuideStyle`이 다른지), `./gradlew test` 전체 통과. 서버 재기동 후
같은 `messageId`(며느리 대화9, 마을 이장 대화7) 두 건을 D-35 적용 당시 저장해둔 오디오와
재비교 — 둘 다 바이트 크기가 달라짐을 확인(voice·instructions가 실제로 바뀌어 반영됐다는 증거).
404·400 에러 케이스 회귀 없음 재확인.

---

### D-37 · Render↔Supabase 배포 연결은 Session Pooler로, 신규 테이블은 RLS만 켜둔다

M-59(Render 배포)·B-21(Supabase 연결) 첫 실제 연결 시도에서 두 가지가 막혔다.

1. **Direct connection(`db.<ref>.supabase.co:5432`)은 Render 무료 티어에서 연결이 안 된다.**
   Supabase가 direct connection host를 IPv6 전용으로 바꿔서다(유료 IPv4 add-on 없이는
   해당 호스트에 도달 불가). Render는 아웃바운드 IPv6을 지원하지 않아 `The connection
   attempt failed`로 타임아웃난다. **Session Pooler**(`aws-0-<region>.pooler.supabase.com:5432`,
   IPv4)로 바꾸니 바로 붙었다. 이후 배포 환경(`SPRING_DATASOURCE_URL` 등)은 항상 pooler
   호스트를 쓴다 — direct host는 로컬에서 psql로 직접 붙을 때만 의미가 있다.
2. **Supabase는 새 테이블을 만들면 기본적으로 PostgREST(REST API)에도 노출한다.** JPA
   `ddl-auto=update`(D-14)로 12개 테이블이 생성되자마자 Supabase 보안 advisor가 전부
   RLS 비활성(critical)으로 잡았다 — anon key만 있으면 `parents`·`children`·`messages` 등을
   REST로 직접 읽고 쓸 수 있는 상태였다는 뜻이다. 이 프로젝트는 Supabase Auth·클라이언트
   라이브러리를 쓰지 않고(D-13) 백엔드가 `postgres` 계정으로 JDBC 직접 연결만 하므로,
   **정책(policy) 없이 RLS만 `ENABLE`** 했다 — 테이블 소유자/superuser는 RLS를 안 받아
   백엔드 동작에는 영향이 없고, PostgREST 경로(안 쓰는 경로)만 전부 막힌다. 정책을 실제로
   설계해서 붙이는 일은 지금 하지 않는다 — PostgREST를 쓸 계획이 생기기 전까지는 불필요한
   선행 작업이다.

**검증**: `GET https://good-question-7yyt.onrender.com/api/health` → `{"status":"ok"}` 200
(pooler 연결 전: `Connection to localhost:5432 refused` → direct connection 시도: `The
connection attempt failed` → pooler로 교체 후 정상). RLS 적용 전후로 헬스체크 재호출해
백엔드 접근에 영향 없음을 확인. Supabase 보안 advisor 재조회 → critical 항목 0건(RLS
활성화 후 정책 없음을 알리는 INFO만 남음, 의도된 상태).

---

### D-38 · B-23 슬립 방지 크론은 GitHub Actions가 아니라 cron-job.org로 한다

처음엔 레포에 이미 있는 GitHub Actions로 `schedule: */10 * * * *` 워크플로우를 만들었다
(계정 추가 가입이 필요 없어서). 그런데 실측해보니 등록 후 **첫 자동 실행까지 1시간 11분**,
그 뒤로도 10분 주기면 4번은 돌았어야 할 41분 동안 **0번** 돌았다. YAML·레포 권한·fork 여부
전부 정상이었으므로 우리 설정 문제가 아니라 **GitHub `schedule` 트리거 자체의 알려진 한계**다
(GitHub 공식 문서도 "고부하 시 지연되거나 스킵될 수 있다"고 명시. 특히 10분처럼 짧은 주기가
더 자주 조용해진다).

슬립 방지는 "정해진 간격보다 늦지 않게 도는 것"이 핵심 요구인데, GitHub Actions는 그 보장을
안 해준다. **외부 전용 크론 서비스(cron-job.org)로 교체.** 정확히 설정한 주기대로 돈다.
GitHub Actions 워크플로우(`​.github/workflows/keep-alive.yml`)는 지워도 그만이라 백업으로
그냥 남겨뒀다 — 가끔 더 도는 건 손해가 아니다.

**검증**: work-items.md B-23 참조.

---

### D-39 · U-01 해소 — `/analyze`·`/respond`에 `X-Internal-Token` 헤더 추가

AI 파트가 `docs/request/backend/ai-service-integration-v1.md`로 실 AI 서버 연동 스펙을 넘겼다.
헤더명(`X-Internal-Token`)·값 출처(`AI_SERVER_INTERNAL_TOKEN`)·엔드포인트 경로가 이걸로
확정돼 U-01 중 인증 부분을 닫는다. 배포 주소 자체는 여전히 미결이라 U-01은 남겨두되
범위를 좁힌다.

- `AiAnalyzeClientImpl`·`AiRespondClientImpl` 생성자에서 `RestClient.Builder.defaultHeader`로
  헤더를 얹는다 — 요청마다 헤더를 붙이는 코드를 반복하지 않으려고 클라이언트 초기화 시점에
  고정했다.
- `ai.server.internal-token` 프로퍼티 기본값은 빈 문자열이다. 로컬 mock 서버(`AiMockController`)는
  인증을 보지 않으므로 토큰 값이 없어도 그대로 동작한다. 실 토큰 값은 AI 서버 쪽에서 받는 대로
  `.env`에만 넣는다.

**검증**: `AiAnalyzeClientImplTest`·`AiRespondClientImplTest` — JDK 내장 `HttpServer`로 로컬
엔드포인트를 띄우고 실제 요청에 `X-Internal-Token` 헤더가 주입한 값 그대로 실리는지 확인.

---

### D-40 · `/respond` 실패 폴백 — 장면 강제 종료 대신 고정 중간 대사 유지 (D-44로 원복)

AI 파트가 `docs/request/backend/free-speech-provider-and-ai-fallback.md`에서 지적한 문제.
기존 B-12는 `/respond`가 실패하면 무조건 `character_closing`으로 장면을 즉시 닫았다 —
AI 서버 장애 한 번으로 아이의 생각과 무관하게 이야기가 넘어가 버린다. D-28~D-29 미션 강제
노출 작업 때도 "미반영 잔여 위험"으로 남겨뒀던 항목이다.

**바꾼 것**: `story_scenes`에 `character_midline`(nullable text) 컬럼을 추가했다.
`/respond` 실패 시 이 값으로 대체하고 `sceneEnded=false`로 응답한다 — `effectiveMode`는
실패 전에 이미 `ProgressJudge`가 정한 `decision.mode()`(NORMAL/GUIDED)를 그대로 쓴다.
새 모드를 만들지 않은 이유는 `story_sessions.last_response_mode`로 이어지는 다음 턴 진행
판단(연속 GUIDED 제한 등)이 기존 두 값만 안다고 가정하고 있어서다.

- `character_midline` 문구는 장면마다 캐릭터 말투에 맞춰 팀(AI 파트 요청을 받아 백엔드가
  임시 작성)이 채웠다 — 원본 데이터가 없어 자문위원 검수 전 임시 문구다. 실제로는 무엇을
  말했는지 모르는 상태에서 재생하는 문구라 장면 내용을 언급하지 않고 "계속 말해봐" 취지로만
  썼다.
- 작성 후 `docs/reference/characters.md`(캐릭터 성격 정본)와 대조해 검증했다. 시아버지(대화2)
  1차 문구가 "익살스러운 어른"이라는 원문 특징을 못 살리고 명령조로만 읽혀서 호기심 어조를
  더한 문구로 교체했다(`"허, 그래서? 어디 계속 말해 보아라, 궁금하구나."`). 나머지 3건은
  원문 성격과 부합해 그대로 뒀다.
- `guidanceTarget`은 `null`로 보낸다 — 고정 문구가 실제로 그 방향을 유도하지 않는데
  값을 채우면 프론트·분석 로그가 오해한다.
- `characterState`는 기존과 동일하게 `null`(D-35의 5종 밖 폴백과 같은 취급).

**검증**: `AiMockController.respond()`가 빈 텍스트를 반환하도록 임시로 바꿔 `/respond` 실패를
재현 → `POST .../messages` 응답이 `sceneEnded: false`, `characterMessage`가 해당 장면의
`character_midline` 값, 다음 턴도 정상 진행되는 것을 확인 후 원복.

---

### D-41 · O-12 `characterState` — D-27을 뒤집는다. AI 판단 대신 `reactionKey` 고정 매핑 (D-44로 원복)

AI 파트가 `docs/request/backend/ai-service-integration-v1.md`에서 캐릭터 LLM 응답을
`{ "text": "..." }` 하나로 못박았다 — "AI 응답에 이미지 URL·이미지 프롬프트·표정 판정을
추가하지 않는다"고 명시했고, 실제 `ai-server`의 `RespondResponse`(`schemas.py`)도
`text` 필드 하나뿐인 `StrictModel`(`extra="forbid"`)이라 다른 값을 얹을 수 없다.
`docs/request/frontend/static-visual-assets.md`도 "표정 상태의 파일 매핑은 프론트/백엔드가
고정 목록으로 관리한다"고 같은 방향으로 요청했다.

D-27은 "AI가 실제로 쓴 대사에 맞는 표정을 AI 스스로 고르는 게 더 정확하다"는 이유로
`reactionKey` 기반 매핑을 **일부러 피했었다.** 지금은 AI 쪽이 그 값 자체를 안 주기로
계약을 못박아서 선택지가 없다 — 대사 뉘앙스와 완벽히 일치하지 않을 수 있다는 D-27의
우려는 감수한다.

**바꾼 것**: `session/engine/CharacterStateMapper.java` 신설. `/respond` 호출 *전에* 이미
계산해 둔 `reactionKey`(+ 신규 사고요소 감지 여부)로 5종 상태를 고정 매핑한다.

| `reactionKey` | `characterState` |
| --- | --- |
| `playfulUtterance`, `empathyFromChild` | `HAPPY` |
| `proposalFromChild` (신규 요소 채움) | `MOVED` |
| `proposalFromChild` (신규 요소 못 채움) | `SURPRISED` |
| `unclearUtterance`, `disagreement` | `WORRIED` |
| 그 외(`questionFromChild`, `directResponse`) | `NEUTRAL` |

- `RespondAiResult`·`AiRespondClientImpl`·`AiMockController`에서 `characterState` 파싱을
  전부 걷어냈다 — AI가 그 필드를 절대 안 보내므로 계속 두면 항상 `null`만 나오는 죽은
  분기였다.
- `CLOSING`과 `/respond` 실패 폴백(D-40)은 여전히 `characterState: null`이다 — 이 매핑은
  AI를 실제로 호출해 대사를 받은 턴에만 적용된다.
- `MessageCreateResponse.characterState`(프론트 응답 필드)는 이름·타입 그대로 유지 —
  프론트는 값의 출처(AI 직접 판단 → 백엔드 매핑)가 바뀐 걸 몰라도 된다.

**검증**: `CharacterStateMapperTest` 8건(7개 `reactionKey` × `proposalFromChild`의 신규
요소 여부 분기 포함) + 전체 빌드 106/106 통과.

---

### D-42 · STT 환각 문제 — `language=ko` 고정 + `no_speech_prob` 구간 필터링 (D-43으로 대체)

프론트에서 신고: 아이가 아무 말도 안 했는데 STT 결과로 일본어(`チャンネル登録をお願いいたします`)나
한국어 유튜브 자막체 상투구(`시청해주셔서 감사합니다`)가 나온다. Whisper가 무음·저품질
구간에서 학습 데이터(유튜브 자막)의 상투구를 지어내는 것으로 널리 알려진 문제(hallucination)다.

**재현**: `ffmpeg`로 무음 1·3초, 옅은 핑크노이즈 2초를 만들어 `response_format=verbose_json`으로
직접 Whisper API를 호출해 재현했다.

| 입력 | 결과 텍스트 | `no_speech_prob` | `avg_logprob` |
| --- | --- | --- | --- |
| 무음 3초 | "고맙습니다." | 0.94 | -0.79 |
| 무음 1초 | "고맙습니다." | 0.94 | -0.79 |
| 옅은 잡음 2초 | "시청해 주셔서 감사합니다." | 0.93 | -0.53 |
| TTS 라운드트립("배가 아파요") | "배가 아파요." | **0.0075** | -0.41 |

`no_speech_prob`는 환각 3건 모두 0.93 이상, 실제 발화는 0.0075로 확실히 갈린다.
반면 `avg_logprob`는 -0.79~-0.41로 겹쳐서 **신뢰할 수 없는 신호였다** — Whisper는 지어낸
문장의 토큰도 확신 있게 고른다. 처음엔 `no_speech_prob > 0.6` **그리고** `avg_logprob < -1.0`을
동시에 요구했는데, 무음 3초 케이스(`avg_logprob -0.79`)가 그 AND 조건을 통과하지 못해
필터를 빠져나가는 걸 실측으로 확인하고 `no_speech_prob` 단독 조건으로 정정했다.

**바꾼 것**:
- `OpenAiSttClientImpl`이 `/audio/transcriptions` 요청에 `language=ko`, `response_format=verbose_json`을
  추가한다. `language`를 안 주면 짧고 모호한 오디오에서 Whisper가 언어 자체를 잘못 추측할 수
  있다(신고된 일본어 케이스).
- `voice/support/WhisperHallucinationFilter.java` 신설 — `no_speech_prob > 0.6`(OpenAI 기본
  디코딩 임계값과 동일)인 구간을 버리고 나머지만 이어 붙인다. 전 구간이 걸러지면 빈 문자열 —
  기존 "빈 결과면 /messages를 호출하지 않는다"(B-13) 계약 그대로 이어진다.
- `verbose_json`이 `segments`를 안 주는 경우(빈 응답 등)를 대비해 최상위 `text`로 폴백한다.

**검증**: `WhisperHallucinationFilterTest` 5건(위 실측값 그대로 케이스화) + 재빌드한
서버에 같은 무음·잡음·실발화 4개 파일을 다시 `POST /api/stt`로 올려 **무음·잡음 3건 모두
빈 문자열, 실제 발화만 정확히 복원**되는 것을 실제 OpenAI API로 확인. 전체 빌드 111/111 통과.

**D-43으로 대체됨** — 근본 원인(모델 자체의 환각 성향)을 사후 필터링으로 완화하는
방식이었는데, 모델을 바꾸는 게 더 근본적인 해결이라 판단해 하루 만에 뒤집었다.

---

### D-43 · STT 모델을 `whisper-1` → `gpt-4o-mini-transcribe`로 교체

D-42가 사후 필터링(구간별 `no_speech_prob`)으로 환각을 걸러내는 방식이었다면, 이번엔
**환각을 덜 일으키는 모델로 원인 자체를 바꾼다.** `whisper-1`은 GPT 계열이 아니라 OpenAI의
구형 전용 음성인식 모델이고, 무음·저품질 구간에서 유튜브 자막 학습 데이터의 상투구를
지어내는 게 문서로 잘 알려진 특성이다. `gpt-4o-mini-transcribe`는 GPT-4o 오디오 기반 신형
모델로, 같은 `/v1/audio/transcriptions` 엔드포인트를 쓰되 단어 오류율·언어 인식이
Whisper 대비 개선됐다고 OpenAI가 공식 문서에서 밝히고 있다.

**제약**: 이 모델은 `response_format=verbose_json`을 지원하지 않는다 — 시도하면
`response_format 'verbose_json' is not compatible with model 'gpt-4o-mini-transcribe-api-ev3'`
400 에러가 난다(실측 확인). D-42의 구간별 필터링(`WhisperHallucinationFilter`)이 애초에
호출될 수 없어져 통째로 삭제했다 — 죽은 코드를 남겨두지 않았다.

**검증**: 실제 OpenAI API로 D-42와 동일한 3개 파일(무음 3초·옅은 잡음 2초·TTS 발화
"배가 아파요")을 `gpt-4o-mini-transcribe`로 재실행.

| 입력 | `whisper-1` (D-42) | `gpt-4o-mini-transcribe` (이번) |
| --- | --- | --- |
| 무음 3초 | "고맙습니다." (환각) | `""` — 5회 반복 전부 동일 |
| 옅은 잡음 2초 | "시청해 주셔서 감사합니다." (환각, 신고된 것과 동일) | `""` — 5회 반복 전부 동일 |
| 실제 발화 | "배가 아파요." (정상) | "배가 아파요." (정상) |

직접 API 호출 10회(무음 5·잡음 5) 전부 빈 문자열로 일관됐고, 재빌드한 서버의 실제
`POST /api/stt`로도 무음×3·잡음×3·실발화×2 총 8회를 다시 확인 — 전부 같은 결과.
전체 빌드 106/106 통과(D-42 전용 테스트 5건 삭제로 111 → 106).

**남은 트레이드오프**: 응답 속도가 `whisper-1`(~0.86초) 대비 다소 느려질 수 있음(참고:
`gpt-4o-transcribe` 기준 ~1.6초, mini는 더 빠를 것으로 추정) — STT 타임아웃 8초·전체
15초 예산 안에는 들어오지만, 배포 후 실측이 필요하면 U-02와 함께 재확인한다. 가격은
`whisper-1`과 동일(2026-04 기준 $0.006/분 보고 사례 기준).

---

### D-44 · D-40·D-41 원복 — AI 파트가 `ai-service-integration-v1.md`를 다시 뒤집었다

D-40·D-41을 커밋(18:16)하기 13분 전(18:03, `9c6628c docs(ai): align audio scope with backend`)에
AI 파트가 같은 문서를 다시 고쳤는데, 그 사실을 모르고 예전(v3) 버전 기준으로 구현했다.
main이 그 사이 `ai/quality-service-v4`를 머지해서 지금은 최신 버전이 정본이다.

**`/respond` 실패 처리 — B-12로 원복**. v3는 "장면을 닫지 않는 고정 중간 대사"였는데, 현재
문서(제약 조건)는 "응답 실패 시 백엔드는 현재 운영 규칙(D-03)에 따라 검수된
`character_closing`으로 장면을 이어서 종료한다"로 되돌아갔다. D-40에서 만든 `character_midline`
컬럼·`resolveCharacterResponse()`의 폴백 분기를 전부 되돌렸다 — `MessageServiceImpl`은
다시 실패 시 `CLOSING`+`character_closing`으로 장면을 닫는다.

**`characterState` — D-27로 원복**. v3는 `/respond` 응답이 `{ "text": "..." }` 뿐이었는데,
현재 문서·실제 `ai-server` 코드(`schemas.py`) 둘 다 `characterState`를 다시 요구한다.

```python
class RespondResponse(StrictModel):
    text: CharacterLine
    characterState: CharacterState   # 이제 필수 필드
```

D-41에서 만든 `CharacterStateMapper`(`reactionKey` 기반 백엔드 추측)는 삭제하고,
`AiRespondClientImpl.parseCharacterState()`(AI가 준 값을 파싱, 모르는 값이면 null 폴백)를
그대로 복원했다.

**교훈**: 공용 요청 문서를 오래 열어두고 여러 결정을 순차로 내리기보다, 구현 직전에
한 번 더 최신 상태를 확인해야 한다 — 이번엔 세션 안에서 문서가 바뀌는 바람에 13분 차이로
엇갈렸다.

**되돌린 파일**: `MessageServiceImpl`, `StoryScene`(`character_midline` 컬럼 제거),
`ContentSeeder`(중간 대사 4건 제거), `RespondAiResult`, `AiRespondClientImpl`,
`AiMockController`, `CharacterState` 주석. `CharacterStateMapper`·그 테스트 삭제.

**검증**: 전체 빌드 98/98 통과(D-41 전용 테스트 8건 삭제로 106 → 98). 로컬 DB의
`character_midline` 컬럼도 `ALTER TABLE ... DROP COLUMN`으로 정리.

---

### D-45 · 정적 배경 이미지 경로 연결 — 장면 1·2·4·6·8

`docs/request/backend/banggui-static-asset-paths.md`(AI 파트, 2026-08-14, 필수). 프론트
저장소에 `frontend/public/story-assets/banggui/sc_banggui_{01,02,04,06,08}.webp`가
실제로 도착해 있는 것을 확인하고, `ContentSeeder`의 해당 5개 장면 `backgroundImageUrl`을
`null`에서 지정된 상대 경로로 채웠다.

- 대화 장면(3·5·7·9)은 이번 요청 대상이 아니다 — 문서가 "새 배경 없는 장면은 프론트가
  직전 배경을 유지한다"고 명시해서 그대로 `null`로 둔다.
- 같은 김에 `frontend/public/story-assets/banggui/`에 `ch_banggui_*_{NEUTRAL,HAPPY,
  WORRIED,SURPRISED,MOVED}.png` 15장(O-12 `characterState` 이미지)도 이미 도착해 있는
  걸 확인했다 — 이 문서 범위 밖이라 손대지 않았지만, 프론트가 이 값으로 이미지를
  바꾸는 작업(work-items.md O-12 "남은 일")이 이제 가능한 상태다.

**검증**: 로컬 DB에 5개 행 직접 백필(`ContentSeeder`는 재기동 시 기존 스토리가 있으면
재시드를 건너뛰므로) 후, 실제로 세션을 새로 만들어 `POST /sessions` 응답의
`currentScene.backgroundImageUrl`이 `/story-assets/banggui/sc_banggui_01.webp`로
정확히 내려오는 것을 확인. 전체 빌드 98/98 통과.

---

### D-46 · STT 모델을 `gpt-4o-mini-transcribe` → `gpt-4o-transcribe`로 교체

프론트 실사용 테스트 중 "가족들은 크게 신경쓰지않을거야"라는 정상적인 한국어 발화를
STT에 넣었더니 중국어 텍스트가 반환되는 사례가 보고됐다. D-43에서 `language=ko`를
같이 보내고 있었는데도 뚫린 것이 이번 문제다.

**원인**: OpenAI 문서를 다시 확인해 보니 `language`·`prompt` 파라미터는 `gpt-4o-transcribe`
모델에만 공식 지원되고, `gpt-4o-mini-transcribe`는 문서상 지원 대상이 아니다(커뮤니티
보고로는 에러 없이 받아주지만 실제로 언어 추정에 영향을 주는지는 보장되지 않음). D-43
당시엔 이 차이를 모르고 mini 모델에 `language=ko`를 보내고 있었다.

**결정**: `gpt-4o-transcribe`로 올린다. 공식 문서상 `language` 파라미터가 보장되는
유일한 모델이라, 완전한 차단은 아니어도 오인식 빈도는 줄어들 것으로 기대한다. 비용은
$0.003/분(mini) → $0.006/분으로 정확히 2배지만, 세션당 아이 발화 시간이 짧아 절대
비용 증가는 미미하다고 판단해 감수하기로 했다. 같은 김에 `prompt`도 추가했다 —
"이것은 한국어를 사용하는 7~9세 아동의 발화입니다"라는 문맥을 함께 보내 언어 추정을
추가로 편향시킨다. `prompt`도 `gpt-4o-mini-transcribe`에선 비공식이라 `language`와
같은 이유로 모델을 올린 뒤에야 의미가 있다.

**남은 한계**: 이 두 파라미터도 100% 강제가 아니다 — `gpt-4o-transcribe`조차 언어 강제가
불안정하다는 커뮤니티 리포트가 있다. 완전히 막으려면 STT 결과 텍스트의 한글 비중을
검사해 낮으면 버리는 하드 필터가 별도로 필요하다는 걸 확인했지만, 이번 요청 범위는
모델 교체(+`prompt`)까지로 한정하고 필터는 보류했다 — 필요해지면 다시 논의한다.

---

### D-47 · STT 모델을 `gpt-4o-transcribe` → `gpt-transcribe`로 교체

D-46 커밋 직후 OpenAI가 2026-07-28에 낸 신형 추천 모델 `gpt-transcribe`가 있다는 걸
확인했다. D-46에서 쓴 근거(공식 `language`/`prompt` 지원)보다 더 나은 조건이라 바로
갈아탔다.

**근거**: Artificial Analysis의 AA-WER 벤치마크(교차 데이터셋 가중 평균) 기준
`gpt-transcribe` 3.31% vs `gpt-4o-transcribe` 4.01% — 정확도가 더 높다. 가격도
$0.0045/분으로 `gpt-4o-transcribe`($0.006/분)보다 싸다. 즉 정확도·비용 둘 다 개선되는
드문 경우라 트레이드오프 없이 교체했다.

**검증**: 실제 API로 10회 테스트(TTS로 생성한 한국어 문장, D-46 신고 문장 "가족들은
크게 신경쓰지않을거야" 포함). 언어 전환(한→중/일) 환각 0/10 — 신고됐던 문장도 이번엔
정확히 나왔다. 8/10 완전 일치, 2/10은 "바구니"→"가분이", "방귀를 뀔게요"→"방비를
끌게요"처럼 동화 안에서만 쓰는 단어의 발음 오인식(언어 전환은 아님) — 이 정도는
`gpt-4o-transcribe`에서도 있을 수 있는 수준이라 이번 교체로 새로 생긴 문제는 아니다.
전체 빌드·테스트 통과.

**남은 한계**: D-46과 동일 — 파라미터 기반 언어 유도는 여전히 100% 강제가 아니다.
하드 필터는 이번에도 범위 밖으로 보류.

---

### D-48 · 상세 화면 `existingSession`이 `stopped`/`completed` 세션까지 이어가기 대상으로 잡히던 문제

팀원 보고: 홈에서는 `inProgress`가 `null`로 정상인데, 같은 이야기의 상세 화면
(`GET /stories/{storyId}`)에 들어가면 `existingSession`이 채워져서 "이어서 할까요?"
모달이 뜬다. 확인해보니 아이가 "이야기 나가기"(C-13)로 나간(`stopped`) 세션도, 이미
다 끝낸(`completed`) 세션도 여기 걸렸다.

**원인**: `HomeServiceImpl`은 처음부터 `IN_PROGRESS`·`POST_ACTIVITY`만 "이어가기
대상"으로 걸렀는데(구 이름 `RESUMABLE_STATUSES`), `StoryServiceImpl.getStoryDetail()`은
상태 필터 없이 그냥 "가장 최근 세션"을 `existingSession`에 그대로 담아 보내고 있었다.
`SessionServiceImpl.createSession()`도 별도로 같은 필터(`ACTIVE_STATUSES`)를 복붙해
셋이 제각각이었다 — 상세 화면만 필터가 아예 빠진 상태.

`api.md` 3.3을 다시 보니 `existingSession` 필드의 스펙 의도 자체가 명확했다:
"있으면 프론트가 B-4 모달을 띄웁니다. 없으면 `null`" — 예시도 `in_progress`만 보여준다.
즉 상세 화면 쪽이 스펙과 어긋난 구현이었다.

**결정**: 프론트는 건드리지 않는다. `StoryDetailScreen.tsx`가 `existingSession.status`를
아예 안 읽고 존재 여부만 보므로(`onStart()`), 백엔드가 `null`/값 하나로 완전히 제어
가능하다. `SessionStatus`에 `isResumable()`(+ `resumableStatuses()`)을 추가해 세 곳
(`HomeServiceImpl`, `SessionServiceImpl.createSession`, `StoryServiceImpl.getStoryDetail`)이
전부 이 하나만 쓰도록 통일했다. `COMPLETED`도 `STOPPED`와 동일하게 `null` 처리한다 —
프론트가 상태를 구분 못 하는 이상 "이어가기"는 이분법(가능/불가능)일 수밖에 없고,
완료작을 "이어간다"는 개념 자체가 없기 때문이다.

**같이 처리한 방어 가드**: 위 수정만으로 정상 흐름에선 막히지만, `stopped`/`completed`
세션 ID로 `POST /messages`·`POST /scenes/{id}/complete`를 직접 호출하면 막을 장치가
없었다 (`MessageServiceImpl`·`SessionServiceImpl.completeScene()` 둘 다 세션 상태를
안 봄). `IN_PROGRESS`가 아니면 `ErrorCode.INVALID_REQUEST`로 막는 가드를 추가했다 —
`isResumable()`이 아니라 **`IN_PROGRESS` 단독** 조건이다. `POST_ACTIVITY`는
`startPostActivity()`가 `currentScene`을 안 바꿔서(장면9를 계속 가리킴) 이미 닫힌
장면에 또 발화를 보낼 수 있는 별개의 구멍이라, "이어가기 가능" 범위보다 좁게 잡았다.
새 `ErrorCode`는 안 만들었다 — 같은 메서드 안에 이미 `INVALID_REQUEST`를 이런 용도로
쓰는 선례가 있어 재사용, `api.md` 2.3 에러 코드 표 변경 없음.

**검증**: 실제 프론트+백엔드+AI 서버를 띄우고 브라우저로 직접 확인. `stopped`로 바꾼
세션의 이야기 상세 화면에 "이어서 할까요?" 없이 "이야기 시작하기" 버튼만 뜨는 것,
눌렀을 때 기존 세션이 아니라 새 세션 ID로 이동하는 것, 콘솔 에러 없는 것까지 확인.
`POST /messages`도 실제 API로 `stopped` 세션에 호출해 `400 INVALID_REQUEST`로 막히는
것 확인. 전체 테스트 98/98 통과. API 응답 스키마·에러 코드 표 변경 없음 — 프론트
작업 불필요.

---

### D-49 · 미션 노출 후 턴 예산을 대화 세션의 `max_turns`와 분리

사용자(백엔드 담당) 지적: 미션2(장면9, `max_turns=4`)는 강제 노출 조건(D-29)이
`turnCount >= maxTurns - 1`이라 3턴째 뜨는데, 뜬 직후 남는 대화 턴이 4턴째 딱 1턴뿐이라
"미션 진행 한 번 하자마자 클로징 멘트"가 나온다. 미션이 대화 세션의 턴 예산을 그대로
나눠 쓰는 게 아니라 **자기 턴 예산을 따로 가져야** 한다는 요구.

**로컬 DB로 실측**: `mission_revealed_at_turn` 도입 전, 오늘(2026-08-15) 이전 세션 중
장면9에서 `current_child_turn_count=4`(=`MAX_TURNS`로 종료)까지 갔는데 `SYSTEM` 메시지가
0건인 세션이 다수 있었다 — 단, 전부 D-29 커밋(2026-08-13 15:36, `1f2e4d4`) **이전**인
2026-08-12 데이터였다. D-29 이후(8/14~) 세션은 전부 미션이 뜨긴 뜨되, 뜬 뒤 남는 턴이
1턴뿐인 패턴(`ccc9cc2b` 세션: 3턴째 노출 → 4턴째 "싫어싫어싫어싫어" → 즉시 클로징)이
확인됐다 — 사용자가 설명한 증상과 정확히 일치.

**바꾼 것**:
1. `MissionTrigger.FORCE_REVEAL_TURNS_BEFORE_MAX`를 1→2로 당겼다 — 강제 노출이 장면
   종료 두 턴 전에 뜬다.
2. `StorySession`에 `mission_revealed_at_turn`(nullable) 컬럼을 추가해 미션이 노출된
   턴을 기록한다(`recordMissionRevealed()`, `advanceToScene()`에서 초기화).
3. `ProgressJudge`에 `MISSION_TURN_BUDGET=2`를 도입해 `effectiveMaxTurns =
   max(maxTurns, missionRevealedAtTurn + 2)`를 계산하고, GOAL_MET 유예와 MAX_TURNS
   하드컷 둘 다 이 값을 기준으로 판단하도록 일반화했다(기존 D-29의 `hasUnrevealedMission`
   유예를 노출 *이후*까지 확장한 형태). 미션이 늦게 뜨더라도(이론상) 원래
   `max_turns`를 넘겨서까지 최소 2턴은 보장한다 — 강제 노출 오프셋(1)과 이 예산(2)이
   짝을 이루므로 실제로는 거의 항상 `effectiveMaxTurns == maxTurns`가 된다.

**API 계약은 안 바꿨다**: 응답의 `maxTurns` 필드는 여전히 `scene.getMaxTurns()` 그대로
내려간다(사용자 결정) — 프론트가 이미 `missionProgress != null` 여부로 "미션 진행 중"을
판별하고 있어, 진행률 표시용 `maxTurns`를 굳이 동적으로 바꿀 필요가 없다고 봤다.

**검증**: `ProgressJudgeTest`·`MissionTriggerTest`에 각각 신규 케이스 추가, 전체 테스트
통과. 로컬 앱 기동 후 실제 세션으로 장면9까지 진행 — 미션2가 2턴째(예전 3턴째)에 뜨고,
`mission_revealed_at_turn=2`로 저장되며, 3·4턴 두 번 다 대화가 이어진 뒤 4턴째에
`MAX_TURNS`로 종료되는 것을 DB·API 응답 양쪽에서 확인. 응답 `maxTurns`는 4로 고정 유지됨.

**별개로 확인, 미해결로 남긴 것 — "미션2가 아예 안 떴다" report 관련**: 사용자가 같이
요청한 "프론트에서 미션2가 강제발동 조건(3턴)에도 안 뜨고 대화가 끝나버렸다"는 별도
제보를 로컬 DB로 재현하려 했으나, 재현되지 않았다(8/14 이후 세션은 전부 미션이 떴다).
가능성 있는 원인 두 가지를 남긴다 — 둘 다 이번 커밋 범위 밖이라 고치지 않았다:
1. **`/respond` AI 호출 실패 시 즉시 `character_closing`으로 장면을 강제 종료하는
   경로(B-12, D-44에서 재확정)**가 `judgeMission()` 호출(`!sceneEnded`가 조건)보다
   먼저 장면을 닫아버릴 수 있다 — 로컬 mock은 항상 성공해서 재현 불가, 실 AI 서버
   장애 시에만 발생 가능한 경로로 추정.
2. **이미 문서화된 별개 이슈(U-08,
   [mission2-success-signal-gap.md](../../docs/request/frontend/mission2-success-signal-gap.md))**
   — 미션2가 *자연 발동*(내용 조건으로, 강제 아님)하면 `mission2Satisfied` 프론트
   판정이 구조적으로 절대 `true`가 될 수 없어 성공 표시 없이 조용히 닫힌다. 사용자가
   말한 "강제발동 조건(3턴)"과는 결이 다르지만, 테스터 입장에서는 둘 다 "미션2가
   제대로 안 나타났다"로 보일 수 있어 함께 남긴다.

---

### D-50 · 미션 턴 예산을 최소1~최대4로, GUIDED 턴은 최대 2회까지만 무료로 재설계

D-49는 미션 노출 후 "고정 2턴"만 보장했다. 사용자(백엔드 담당) 요구: 미션은 대화 세션의
`max_turns`와 완전히 무관하게 **자체 예산(최소 1 ~ 최대 4턴)**을 가져야 하고, 그 안에서
캐릭터가 GUIDED(유도)로 응답한 턴은 턴 소모 없이 지나가야 한다 — 아이가 방향을 못 잡고
있을 때 유도 한 번 했다고 기회가 줄어들면 안 된다는 취지.

**1차 구현**: `ProgressJudge`의 판단 1단계를 미션 활성 여부로 완전히 분기했다.
- 미션 비활성: 기존 D-29 로직 그대로(장면 `max_turns` 기준).
- 미션 활성: 장면의 `max_turns`는 더 이상 보지 않고, `StorySession.missionEngagedTurns`
  (미션 노출 후 GUIDED가 아닌 턴 수)만 본다 — `< 1`이면 GOAL_MET 유예, `>= 4`면
  MAX_TURNS로 무조건 닫는다. `MessageServiceImpl`이 각 턴 응답의 `effectiveMode`가
  `NORMAL`일 때만 `session.recordMissionEngagedTurn()`을 호출해 카운트한다.

**문제 발견**: 로컬에서 실제로 돌려보니(필수 요소가 채워지지 않는 발화를 반복 입력)
`ProgressJudge` 2·3단계(강한 유도 제한 → 정체 시 GUIDED) 특성상 GUIDED 다음 턴은
`previousWasGuided` 규칙으로 무조건 NORMAL이 되고, NORMAL 다음엔 정체 조건이 다시
쌓여 GUIDED가 재발동되는 식으로 **NORMAL·GUIDED가 거의 1:1로 번갈아 나왔다**. GUIDED가
전부 무료면 이 패턴이 무한히 반복돼도 안 닫힌다 — 장면7·9 둘 다 10턴까지 진행되는 것을
실측으로 확인(사용자가 우려한 "가이드가 반복되면 턴이 무한대로 반복될 수 있겠다"가
그대로 재현됨).

**2차 구현 (사용자 요청)**: GUIDED 무료 횟수에도 상한을 뒀다.
`MissionTrigger.FREE_GUIDED_TURNS_AFTER_REVEAL = 2` — 미션 노출 후 GUIDED 응답은
**2회까지만** 무료로 넘어가고, 3회째부터는 `NORMAL`과 똑같이 `missionEngagedTurns`를
소모한다. `StorySession`에 `missionFreeGuidedTurnsUsed`(장면 전환·미션 재노출 시 0으로
초기화)를 추가해 세었다. `ProgressJudge`의 판단 로직 자체는 안 건드렸다 — "이 턴이
예산을 쓰는가"는 여전히 `MessageServiceImpl`이 `effectiveMode`와 무료 횟수를 보고
정하고, `ProgressJudge`는 그 결과(`missionEngagedTurns`)만 본다.

- ponytail: 이 상한(2회)도 궁극적으로는 무한 루프를 아예 막는 하드 캡은 아니다 —
  GUIDED가 아니라 NORMAL/GUIDED가 아닌 다른 사유로 대화가 안 끝나는 경로가 새로
  생기면 같은 문제가 재발할 수 있다. 지금은 실측으로 확인된 유일한 무한 루프
  경로(GUIDED 반복)만 막았다. 다른 경로가 보고되면 그때 다시 본다.

**변경 파일**: `MissionTrigger`(`FREE_GUIDED_TURNS_AFTER_REVEAL` 추가),
`ProgressJudge`(`MISSION_MIN/MAX_TURNS_AFTER_REVEAL`로 D-49의 `MISSION_TURN_BUDGET`
대체, 판단 1단계를 미션 활성/비활성으로 분기), `ProgressInput`(`missionEngagedTurns`
추가), `StorySession`(`missionEngagedTurns`·`missionFreeGuidedTurnsUsed` 컬럼 추가),
`MessageServiceImpl`(카운팅 연동).

**로컬 DB 마이그레이션 주의**: `ddl-auto=update`는 기존 행이 있는 테이블에
`NOT NULL` 컬럼을 기본값 없이 추가하지 못한다(`contains null values` 에러). 로컬은
`ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT 0`으로 직접 백필했다 — Flyway
미도입(D-14) 상태라 배포 시에도 기존 세션 행이 있다면 같은 문제가 날 수 있다는 점을
남겨둔다.

**검증**: 전체 테스트 통과. 로컬 앱으로 장면7·9를 실제로 진행 — GUIDED 응답이 2회까지는
무료로 넘어가고 3회째부터 예산을 소모해, 예전엔 10턴까지 갔던 반복이 9턴에 종료되는
것을 DB(`mission_engaged_turns=4`, `mission_free_guided_turns_used=2`)·API 응답
양쪽에서 확인.

---

### D-51 · `/respond` 실패로 장면이 통째로 강제 종료되는 문제 — AI 서버 재시도 + 백엔드 타임아웃 5→10초

실 AI 서버(`gpt-5-mini`)로 직접 테스트하다가 같은 세션 안에서 `/respond`가 `502
MODEL_UPSTREAM_ERROR`로 두 번 실패했다. B-12/D-44 정책상 `/respond` 실패는 재시도 없이
즉시 `character_closing`으로 장면을 강제 종료하는데, 두 번 다 `ProgressJudge`가 정상
NORMAL을 냈어야 할 턴(미션 노출 직후, 필수 요소 미충족)에서 발생해 대화1·미션1이 각각
1턴만에 스킵됐다 — 아이 진행과 무관하게 AI 서버가 한 번 삐끗한 것만으로 장면 전체가
날아가는 셈이다.

**바꾼 것**: 완전한 해결(D-40 방식 재도입 등)은 AI 파트 스펙 재확인이 필요해 이번엔
손대지 않고, 재발 빈도를 낮추는 선에서 처리했다.
- `ai-server`: OpenAI 호출 타임아웃 5→10초 (사용자가 직접 적용). SDK `max_retries`는 0을
  유지하고, 재시도(최대 3회, 전체 10초 예산)는 AI 서버가 자체적으로 제어한다 — 최초 서술
  ("SDK 0→3")이 틀려 정정한다 ([ai-retry-deadline-v2.md](../../docs/request/backend/ai-retry-deadline-v2.md)).
- `backend`: `ai.server.timeout-seconds`(`AI_SERVER_TIMEOUT_SECONDS`) 5→10 — AI 서버
  쪽 재시도가 원래 타임아웃(5초) 안에서 다 안 끝날 수 있어 백엔드 쪽도 맞춰 올렸다.
  `AiAnalyzeClientImpl`·`AiRespondClientImpl` 둘 다 이 값을 공유해서 씀.

- ponytail: 재시도 최대 3회 × 10초면 ai-server 쪽 최악 응답 시간이 이론상 10초를
  넘을 수 있는데(SDK 재시도가 외부 `asyncio.wait_for(timeout=10)` 안에서 도는 구조라
  실제로는 10초에서 잘릴 가능성이 큼), 백엔드 타임아웃(10초)과 정확히 안 맞을 수 있다.
  근본 해결은 아니고 발생 빈도만 줄인 완화책이다 — 재발하면 D-40처럼 "실패해도 장면을
  안 닫고 계속 진행" 쪽을 다시 검토해야 한다.

**변경 파일**: `application.yml`(`AI_SERVER_TIMEOUT_SECONDS` 기본값), `.env`,
`.env.example`.

---

### D-52 · GUIDED 2회 보호 턴 — `ProgressJudge` 판단 순서에 새 단계 삽입

AI팀 요청([low-engagement-turn-protection.md](../../docs/request/backend/low-engagement-turn-protection.md)):
통합 테스트에서 아이가 "싫어"·"닥쳐"만 반복하면 `maxTurns` 종료가 GUIDED 판단보다 먼저 실행돼
세 번째 발화에서 바로 다음 장면으로 넘어가 버렸다. GUIDED가 아이를 밀어내는 장치가 아니라
"대화를 다시 이야기 안으로 이끄는 보호 구간"이어야 한다는 요구.

**바꾼 것**: `story_sessions.guided_turn_protection_used` 컬럼을 추가하고(장면당 초기화),
`ProgressJudge`의 판단 순서에 GOAL_MET과 MAX_TURNS 사이에 "GUIDED 후보 + 보호 확인" 단계를
새로 끼워 넣었다 — 이 파일 맨 위 주석에 있던 "판단 순서를 바꾸지 않는다"는 순서 자체를
리팩터링하지 말라는 뜻이었지, 새 요구사항에 맞춰 단계를 추가하지 말라는 뜻이 아니다. 이번
삽입은 기존 4단계를 재배치한 게 아니라 GOAL_MET(1)과 MAX_TURNS(기존 2)의 순서는 그대로 두고
그 사이에 새 단계 하나를 끼워 넣은 것이다.

- `guidedCandidate` = missing 있음 + 신규 요소 없음 + (명백한 0정보 거절·회피·거친 말
  `싫어`·`몰라`·`모르겠어`·`닥쳐`·`닥처` **또는** 기존 정체·저정보·턴 부족 조건).
  `guidedTurnProtectionUsed < 2`면 보호 GUIDED를 즉시 반환 — MAX_TURNS/미션 최대 턴
  종료보다 먼저 본다.
- **강한 유도 제한(옛 2단계, 현재 4단계) 완화**: `hasNewlyAccumulatedElement`는 여전히
  무조건 NORMAL을 강제하지만, `isFirstUtterance`·`previousWasGuided`는 `guidedCandidate`가
  아닐 때만 NORMAL을 강제하도록 좁혔다. 보호 예산(2회)이 소진된 뒤에도 정체가 이어지면
  "직전이 GUIDED였다"는 이유만으로 NORMAL로 되돌리지 않고, 예산을 소모하는 일반 GUIDED를
  낸다 (AI팀 요구사항 5). 이 완화가 없으면 3번째 "싫어"가 다시 NORMAL로 튕겨 나가
  대화가 부자연스러워진다 — 검증 시나리오(진행턴 0,0,1 / 보호 1,2,2)로 직접 확인.
- 보호 턴은 `currentChildTurnCount`·`missionEngagedTurns`를 늘리지 않는다 —
  `MessageServiceImpl`에서 candidate turnCount를 계산해 `ProgressJudge`에 넘긴 뒤,
  `decision.protectedTurn()`이면 세션에는 이전 값을 그대로 기록한다. 미션의 기존
  `missionFreeGuidedTurnsUsed`(D-50)와는 별개 카운터 — 보호 턴이면 미션 쪽 회계
  블록 자체를 건너뛴다(이중 소모 방지).
- AI 서버가 위 5개 키워드를 `SHORT_RESPONSE`+`SHORT`로 보정해 준다는 전제 위에,
  백엔드도 발화 원문을 한 번 더 키워드로 대조한다(방어적 이중 확인, `MissionTrigger`의
  `FART_KEYWORD` 패턴과 동일).
- `AiMockController`(B-11 mock)에도 같은 키워드 분기를 추가해 실서버 없이 이 경로를
  로컬에서 재현할 수 있게 했다.

**검증**: `ProgressJudgeTest`에 신규 6건 추가 + 기존 23건 전부 통과(회귀 없음). 로컬
mock AI로 대화3(maxTurns=4)에서 "싫어"를 6회 연속 실제 호출 — 1~3턴째는 진행턴 0,0,1로
보호 GUIDED, 4~6턴째는 진행턴 2,3,4로 예산을 소모하는 일반 GUIDED/CLOSING까지 정상 진행
확인. `guided_turn_protection_used`가 2에서 멈추고 `mission_engaged_turns`는 영향받지
않음을 DB로 확인.

**변경 파일**: `ProgressJudge.java`, `ProgressInput.java`, `ProgressDecision.java`,
`StorySession.java`(신규 컬럼), `MessageServiceImpl.java`, `AiMockController.java`.

---

### D-53 · 팀원 보고 3건 — 미션 중 turnCount 폭주, missionProgress 노출 전 턴 누락, STOPPED 이어가기 불가

systematic-debugging으로 3건 모두 원인을 먼저 확정한 뒤 고쳤다.

**1) 미션 진행 중 `turnCount`가 `maxTurns`를 넘어 계속 쌓임 (미션1·2 공통)**

`missionRevealedAtTurn`이 채워진 뒤에도 `MessageServiceImpl`은 GUIDED 보호 턴
(`decision.protectedTurn()`)에서만 `currentChildTurnCount` 증가를 막았다. 그런데 D-50의
"미션 자체 2회 무료 GUIDED"(`missionFreeGuidedTurnsUsed`)는 `missionEngagedTurns`만 안
늘릴 뿐 `currentChildTurnCount`는 그대로 늘렸다 — 두 "무료 턴" 장치가 서로 다른 걸 얼렸다.
그 결과 미션 노출 후 실제 발화가 쌓일수록 `turnCount`가 (노출 시점 값) + (예산 소모 턴) +
(미션 자체 무료 턴, 최대 2) 만큼 계속 올라가는데 `maxTurns`는 원래 장면 값(4)에 고정돼
있어 "7/4" 같은 응답이 나갔다.

**수정**: `missionRevealedAtTurn != null`이면(=미션이 이미 노출된 상태) 보호 턴 여부와
무관하게 무조건 `currentChildTurnCount`를 그대로 둔다. 미션은 자기 턴 예산
(`missionEngagedTurns`)만으로 종료를 판단하므로(D-50), 응답의 `turnCount`는 미션 노출
순간 값에 고정하는 게 맞다 — 프론트에 별도 미션 턴 카운터를 내려주지 않으므로(체크리스트로만
진행 표시) `turnCount`가 미션 중 움직일 이유가 없다.

**검증**: 로컬 mock AI로 미션1(대화3=장면7)까지 실제로 진행 — 노출 후 "방귀를 또 이용하자"를
7회 반복해도 `turnCount`가 계속 1로 고정되고, 6번째 호출에서 `CLOSING`+`nextSceneId`로
정상 종료됨을 확인.

**2) `missionProgress.satisfiedIndexes`가 노출 이전 턴의 요소를 누락**

`missionProgress()`가 SYSTEM(미션 노출) 메시지보다 `turnOrder`가 큰 CHILD 턴만
`perTurnDetectedTypes`에 넣었다. 그런데 미션1의 노출 조건 대부분(`proposedUsingFart`,
`directionWithoutConcreteMethod` 등, `MissionTrigger.java`)이 "이번 턴 발화가 SOLUTION
방향"이라는 **바로 그 턴의 내용**으로 발동한다 — 노출을 유발한 턴 자체가 항상 노출 시점보다
먼저 저장되므로(SYSTEM 메시지는 그 다음에 붙는다) 구조적으로 `perTurnDetectedTypes`에서
빠진다. `accumulatedElements`에는 이미 SOLUTION이 들어가 있는데 체크리스트는 하나도 안
채워진 것처럼 보이고, 이후 같은 유형을 다시 말해야 그제서야 슬롯 하나가 채워지는 원인이었다.

**수정**: `turnOrder > systemMessage.turnOrder()` 필터를 없애고 장면 전체의 CHILD 턴을
순서대로 본다. `accumulatedElements`도 장면 전체 누적이라 기준이 일치한다. SYSTEM 메시지
존재 여부는 "미션이 노출됐는가"를 판단하는 게이트로만 남긴다(`existsBySessionAndSceneAndSpeakerType`).

**검증**: 미션1 노출 트리거 턴("방귀로 배를 떨어뜨리자")에서 바로 `satisfiedIndexes: [0]`이
찍히는 것, 같은 유형을 한 번 더 말하면 `[0, 1]`로 두 슬롯이 채워지는 것을 실호출로 확인.

**3) `STOPPED` 세션은 이어가기 대상에서 완전히 빠짐**

D-48이 "완료작을 이어간다는 개념이 없다"는 이유로 `STOPPED`을 `COMPLETED`와 동일하게
이어가기 불가로 묶었는데, 사용자 확인 결과 `STOPPED`(아이가 "이야기 나가기"로 스스로 나간
경우)는 `COMPLETED`(끝까지 마친 경우)와 달리 다시 이어갈 수 있어야 한다는 요구가 있었다.

**수정**: `SessionStatus.RESUMABLE`에 `STOPPED` 추가. `StorySession.resume()` 신규 —
`SessionServiceImpl.createSession()`이 재시작(`restart`)이 아니라 기존 세션을 찾았는데
그 상태가 `STOPPED`일 때만 `resume()`으로 `IN_PROGRESS`로 되돌린다. `POST_ACTIVITY`는
건드리지 않는다 — D-48이 만든 "`POST_ACTIVITY`는 `IN_PROGRESS` 전용 가드로 발화 재개를
막는다"는 설계와 충돌하지 않도록, `STOPPED`일 때만 좁게 되살린다.

**검증**: 세션을 `PATCH .../stopped`로 멈춘 뒤 (a) `GET /stories/{id}`의 `existingSession`,
(b) `GET /home`의 `inProgress`가 둘 다 값이 채워지는 것, (c) `POST /sessions`(restart:false)
호출 시 status가 `in_progress`로 되돌아오는 것, (d) 그 세션 ID로 `POST .../scenes/{id}/complete`가
정상 200으로 진행되는 것까지 실호출로 확인.

**변경 파일**: `MessageServiceImpl.java`(1, 2), `SessionStatus.java`·`StorySession.java`·
`SessionServiceImpl.java`(3).

---

### D-54 · 미션1 체크리스트 2번 항목이 1번과 같은 SOLUTION이라 절대 안 채워지던 문제

PRD 7.6 미션1 확인 항목 2번("주변에 있는 마을 사람들과 시아버지는 어디로 피해야 할지")이
1번("무엇을 사용할 것인지")과 똑같이 `SOLUTION`으로 매핑돼 있었다. 장면7의
`element_criteria`는 타입별로 **한 번만** 정의돼 있고(SOLUTION="배를 떨어뜨릴 실행 방법"
하나만), `MissionProgressCalculator`는 "이번 턴에 감지된 타입 종류마다 아직 안 채워진
같은 타입 슬롯을 하나 채운다"는 규칙이라 — 아이가 SOLUTION을 언급한 **서로 다른 두 턴**이
있어야만 두 슬롯이 다 채워진다. 그런데 element_criteria의 SOLUTION 정의 자체가 "실행
방법"으로 뭉뚱그려져 있어, "무엇을 쓸지"와 "어디로 피해야 할지"를 같은 턴에 한 번에
말하면 SOLUTION 하나로만 잡히고, 둘을 따로 말해야 하는데 그럴 이유를 아이가 알 방법이 없다.

**바꾼 것**: 2번 항목의 element를 장면7에 이미 있는 `REASON`("그 방법이 가능하다고 보는
까닭")으로 바꾸고, 라벨도 "그 방법이 왜 가능한지"로 정정했다. PRD 7.6 원문과 다르다 —
`docs/product/prd.md`의 확인 항목 목록도 이 정정을 반영해 갱신했다(주최측 원문이 아니라
팀이 확인 항목의 element 매핑을 창작한 부분이었다는 건 이전부터 그랬다 — 코드 주석 참고).
`backend/docs/api-spec.md`의 예시 JSON도 함께 갱신.

**대안으로 검토했다가 버린 것**:
- REASON 매핑 없이 라벨만 유지 → element_criteria가 SOLUTION만 정의하므로 AI가 절대
  REASON을 안 냄. 두 번째 슬롯이 영원히 안 채워지는 건 똑같다.
- 새 ThoughtElement 타입 추가 → 8개로 고정된 스키마 전체(PRD 6.3)를 건드리는 큰 변경이라
  이번 스코프를 벗어난다.

**검증**: 단위 테스트(`MissionsTest`, `ProgressJudgeTest` 등) 전부 통과 — 이 항목을 직접
검증하는 테스트는 없어서(체크리스트 값 자체가 콘텐츠 상수) 로컬 mock AI로 장면7까지 진행해
`missionTriggered.checklist[1]`이 `{"label":"그 방법이 왜 가능한지","element":"REASON"}`로
내려오는 것을 실호출로 확인.

**추가 검증 (satisfiedIndexes 채워지는 패턴)**: `AiMockController`에 요소별 키워드
매칭(방귀→SOLUTION, 세게→REASON, 부탁→REQUEST, 떨어질→RESULT)을 추가해 한 발화에 여러
키워드가 있으면 detectedElements도 여러 개 나오도록 확장했다. 이걸로 장면7에서 (1) 한 턴에
1개 요소만 말한 경우 `satisfiedIndexes`가 정확히 1개만 늘어나는 것("부탁을 해야겠어요" →
`[0]`→`[0,2]`), (2) 한 턴에 REASON+RESULT를 동시에 말한 경우 2개가 한꺼번에 늘어나는 것
(`[0,2]`→`[0,2,1,3]`)을 실호출로 확인. 같은 턴에 SOLUTION을 다시 언급해도(체크리스트에
SOLUTION 슬롯이 이제 1개뿐이라) 중복으로 안 채워지는 것도 함께 확인 — D-54 수정이 실제로
효과가 있음을 보여준다.

**변경 파일**: `Missions.java`, `docs/product/prd.md`, `backend/docs/api-spec.md`,
`AiMockController.java`(검증용 확장).

---

### D-55 · 보호자 리포트 AI 고도화 백엔드 구현 (parent-report-ai-generation.md)

설계는 그릴링으로 [parent-report-ai-generation.md](../../docs/request/ai/parent-report-ai-generation.md)에
확정해뒀고, AI Worker의 실제 `/report` 엔드포인트가 아직 없어 로컬 mock(`AiMockController`)에
같은 스키마로 구현해 백엔드 쪽을 먼저 완성했다.

**구현**:
- `parent/report/ai` 패키지 신규 — `ReportAiClient`/`ReportAiClientImpl`(RestClient, 응답
  60초·재시도 없음), `ReportAiRequest`/`ReportUtterance`/`CompetencyHint`(요청),
  `ReportAiResult`/`CompetencyAiCard`(응답). `AiRespondClientImpl`과 같은 패턴 — 실패는
  전부 `ReportAiResult.failure()`로 묶는다.
- `ReportAiClientImpl.isWellFormed()`가 완료조건에 적힌 제약을 전부 검증한다: `storyQuestions`·
  `dailyQuestions` 정확히 2개, `representativeIndex`·`evidenceIndex`가 요청에 보낸 발화 개수
  범위 안, matched=true인데 `evidenceIndex`가 `null`이면 실패. 검증을 클라이언트에서 끝내
  서비스 레이어는 index를 그대로 믿고 조회한다.
- `ReportGenerator.competencyHintsOf()` 신규 — matched 여부 계산은 `competenciesOf()`와 같은
  판정식을 재사용(사실 판정은 백엔드가 하고 AI에는 힌트로만 준다는 설계 원칙 그대로).
- `Report.updateFromAi()` 신규 — `summary`·`vocabulary`·`elementCounts`는 안 건드리고
  `competencies`·`representative`·`guide`만 덮어쓴다.
- `ParentReportServiceImpl.enhanceReportWithAi()` — 세션의 아이 발화 전체를 index 순으로
  `ReportUtterance`로 조립하고, AI가 성공하면 `evidenceIndex`·`representativeIndex`로 원문을
  백엔드가 직접 채워 넣는다(AI가 발화 원문을 직접 쓰지 않는다는 설계 원칙).

**막힌 지점과 해결 — 트랜잭션 커밋 전 비동기 호출 경쟁 조건**: 처음엔
`ActivityServiceImpl.submitRetelling()`이 `generateReportIfAbsent()` 바로 뒤에
`parentReportService.enhanceReportWithAi(sessionId)`(`@Async`)를 직접 불렀는데, `@Async`는
호출 즉시 다른 스레드에서 실행을 시작하는 반면 `submitRetelling()`의 트랜잭션은 메서드가 끝나야
커밋된다 — 백그라운드 스레드가 방금 저장한 `Report` 행을 아직 못 보고 조용히 리턴할 위험이
있었다. `ReportSessionCompletedEvent` + `ReportEnhancementListener`
(`@TransactionalEventListener(phase = AFTER_COMMIT)`)로 바꿔, 커밋이 끝난 뒤에만 이벤트가
발행되도록 했다. 리스너는 반드시 **다른 빈**(`ParentReportServiceImpl`)의 `@Async` 메서드를
호출해야 한다 — 같은 클래스 안에서 자기 자신의 `@Async`·`@Transactional` 메서드를 부르면
프록시를 안 거쳐 두 어노테이션이 조용히 무시된다(Spring 자기호출 함정).
`GoodQuestionApplication`에 `@EnableAsync` 추가.

**검증**: 로컬 mock으로 이야기 1편을 처음부터 끝까지(장면1~9 + 활동 + 재구성 발화 제출)
완주 — `submitRetelling` 응답은 그대로 즉시 오고, 곧바로 `GET /parent/reports/{id}`를 폴링해
AI 버전으로 덮어써진 것을 확인. 5개 역량 카드의 `evidence`가 카테고리마다 다른 발화를 가리키는
것(matched=false 2개는 `null`, 나머지 3개는 실제 발화 원문)까지 확인 — 배포에서 봤던 "5개 카드
전부 동일 문장" 문제가 해소됐다. `AiMockController`의 `/report`를 일부러 예외를 던지게 바꿔
재기동한 뒤 같은 시나리오를 다시 돌려, 규칙 기반 리포트(하드코딩된 질문·재사용 evidence)가
그대로 유지되는 것도 확인 — 완료조건 3번(AI 실패 시 규칙 기반 유지). 단위 테스트
`ReportAiClientImplTest`(6건), `ReportGeneratorTest`(신규 3건) 추가, 전체 120/120 통과.

**아직 안 한 것**: 실제 AI Worker `/report`는 AI팀 몫(request 문서 완료조건 1). "다른 이야기에도
하드코딩 없이 생성"(완료조건 5)은 지금 시스템에 이야기가 1편뿐이라 직접 검증은 못 했다 —
다만 `storyTitle`을 매 요청에 실어 보내고 백엔드 코드 어디에도 이야기별 분기가 없어 구조적으로는
막혀있지 않다.

**변경 파일**: `parent/report/ai/*`(신규), `Report.java`, `ReportGenerator.java`,
`ParentReportService(Impl).java`, `ReportSessionCompletedEvent.java`(신규),
`ReportEnhancementListener.java`(신규), `ActivityServiceImpl.java`, `GoodQuestionApplication.java`,
`application.yml`, `AiMockController.java`(검증용 `/report` mock).

---

### D-56 · missionProgress는 미션 노출 이후 턴만 반영한다 — 노출 전 턴은 트리거 턴도 제외 (D-53 뒤집음)

**증상**: 팀원 보고 — 미션1에 진입한 직후, 아직 미션 관련 대화를 하지도 않았는데 체크리스트
3번 항목(RESULT)이 이미 채워진 상태로 나옴. "미션이 열리기도 전에 미션 요소에 해당하는 말을
하면 그게 충족되어 나온다"는 재현 조건까지 제보됨.

**원인**: D-53(2)가 "노출을 유발한 그 턴"의 요소가 체크리스트에 반영되게 하려고
`missionProgress()`의 `turnOrder > systemMessage.turnOrder()` 필터를 통째로 제거했다.
의도는 트리거 턴 한 개만 포함시키는 것이었는데, 실제로는 하한이 아예 없어져 **장면 시작부터의
모든 CHILD 턴**이 스캔 대상이 됐다 — 미션 조건과 전혀 상관없이 오간 장면 초반 대화에서
우연히 겹친 요소(예: "떨어질 것 같아요" → RESULT)까지 노출 즉시 체크리스트에 반영됐다.

**1차 수정 (기각)**: 턴 순서가 `child(N) → character(N+1) → system(N+2)`로 저장되는 걸 이용해
트리거 턴(`system.turnOrder - 2`)부터만 보도록 하한만 되살렸다. 이러면 무관한 초반 턴은
제외되지만 트리거 턴 자체는 D-53대로 여전히 즉시 반영됐다.

사용자가 이 동작 자체를 원점에서 뒤집었다: **satisfiedIndexes는 미션이 생긴 뒤 아이가 미션에
대해 한 말만 반영해야 한다.** 트리거 턴도 미션이 존재하기 전에 한 말이므로 제외해야 한다는
것 — D-53(2)의 "노출 즉시 트리거 턴만큼은 채워져 보이게 하자"는 목적 자체가 틀린 전제였다는
뜻이다. 노출 직후 체크리스트가 전부 빈 상태로 보이는 게 맞고, 아이가 노출 이후 다시 말해야
채워지는 게 의도된 동작이다.

**최종 수정**: `turnOrder > systemMessage.turnOrder()`로 원래 D-53 이전 필터를 그대로
되살렸다. `missionProgress()`가 system 메시지 존재 여부(`existsBy...`)만 보던 걸
`findFirstBySessionAndSceneAndSpeakerTypeOrderByTurnOrderDesc`로 바꿔 system 메시지의
`turnOrder`를 직접 쓰는 것만 남는다.

**검증**: mock AI로 장면7(미션1) 직전까지 진행 → (1) 미션과 무관한 RESULT 턴을 먼저 쌓고
(2) SOLUTION 키워드("방귀")로 미션 발동 → 노출 직후 `missionProgress.satisfiedIndexes`가
**빈 배열**임을 확인 (트리거 턴도 반영 안 됨) → (3) 노출 이후 다시 SOLUTION+RESULT를 말하면
그제서야 `[0, 3]`으로 채워짐을 실호출로 확인. 전체 단위 테스트 120/120 통과.

**변경 파일**: `MessageServiceImpl.java`(`missionProgress()`).

---

## 2. 문서 권고를 따르지 않은 것

나중에 "왜 명세와 다르지?"가 나올 지점입니다.

| 문서 | 문서의 내용 | 실제 | 근거 |
| --- | --- | --- | --- |
| [api.md 3.5](../../docs/spec/api.md) | 2안이면 `POST /messages`에 오디오를 실어 보냄 | **별도 `POST /api/stt`로 분리** | D-02 — F-05의 확인 단계 |
| [api.md 1절](../../docs/spec/api.md) | 문서 전체가 1안(Web Speech) 기준 | **2안 채택** | D-01 |
| [open-questions Q-12](../../docs/open-questions.md) | 별가루 MVP 제외 권고 | **채택 (후순위)** | D-09 — 담당자 결정 |
| [PRD 9.3](../../docs/product/prd.md) | 1안 권장, TTS만 2안 교체 | **처음부터 2안 전면** | D-01 — iPad 안정성 |
| [api.md 3.1](../../docs/spec/api.md) | `POST /api/auth/{provider}` — 프론트가 code 전달 | **백엔드 리다이렉트 방식** (`oauth2Login`) | D-18 |
| [PRD 7.4](../../docs/product/prd.md) | 도입·전개 장면만 `scene_description` 제공 | **대화 장면 4건도 팀이 한 줄씩 작성** | D-19 |

---

## 3. 미결

작업을 막지는 않지만 아직 못 정한 것들입니다.

| ID | 항목 | 상태 | 막히는 시점 |
| --- | --- | --- | --- |
| **U-01** | AI 서버 **배포 주소 · 엔드포인트 경로 · 내부 인증 토큰** | AI 담당 명세 수령 대기. `POST /analyze`·`POST /respond` 가정 | Phase 6. **mock 스텁으로 우회 가능** |
| **U-02** | 프론트 15초 타임아웃 유지 가능 여부 | **실측 후 확정.** 요청을 3개로 나눠 각 구간을 줄여둔 상태 | Phase 6 배포 후 측정 |
| ~~U-03~~ | 이미지 URL 실제 형태 | **해소(D-45).** Supabase Storage가 아니라 프론트 저장소 정적 파일 상대 경로(`/story-assets/banggui/...`, `frontend/public/` 서빙)로 확정 — 배경 5종 연결 완료 | — |
| **U-04** | 음성(Whisper·TTS) 비용 상한 | 문서에 예산 없음. [PRD 10.4](../../docs/product/prd.md)는 대화 LLM 토큰만 규정 | 사용량이 늘면 |
| **U-05** | Supabase 무료 티어 일시정지 기간·용량 한도 | 신규 가입. 가입 시 확인 필요 | 시연 전 확인 |
| **U-06** | `highlightWords` 데이터 출처 | 장면별 고정 목록(팀 창작) vs `/respond` 응답 확장(AI 재합의) | 단어장 구현 시 |
| **U-07** | 보호자 리포트 응답 스키마 | 선택 항목(O-01). 내부 분석 태그를 보호자 화면에 노출 금지 | Phase 7 착수 시 |
| **U-08** | 미션2 성공 판정 — 자연 발동 시 `mission2Satisfied`(프론트, before/after diff)가 항상 실패 | 원인·해결 방향 정리 완료, 프론트 확인 대기. `missionProgress` 체크리스트 1항목 채우는 안 제안 | 프론트 확인 후 구현 |

### 프론트에 알려야 할 것

D-01·D-02가 프론트 작업 범위를 바꿉니다.
→ [docs/request/frontend/stt-tts-integration.md](../../docs/request/frontend/stt-tts-integration.md)

D-34 — 도입부 텍스트 확장 요청 반려, 페이싱은 프론트 UI로 처리 요청.
→ [docs/request/frontend/intro-pacing-declined.md](../../docs/request/frontend/intro-pacing-declined.md)

U-08 — 미션2 성공 판정이 자연 발동 시 항상 실패하는 구조적 문제, 해결 방향 확인 요청.
→ [docs/request/frontend/mission2-success-signal-gap.md](../../docs/request/frontend/mission2-success-signal-gap.md)
