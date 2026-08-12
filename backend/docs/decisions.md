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
| `/respond` 실패 | `character_closing`을 조회해 **장면 종료**, 다음 장면으로 |

**원칙: AI가 죽어도 이야기가 멈추지 않습니다.** 실패를 에러 화면으로 올리지 않고
검수된 고정 대사로 장면을 닫아 앞으로 보냅니다.

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

### D-20 · 미션 노출 조건(M-47~M-49)은 서술형 조건을 신호 기반으로 조작화한다

[PRD 7.6](../../docs/product/prd.md)의 미션1 노출 조건 4가지 중 사용 가능한 신호로 그대로
판정할 수 있는 것은 둘뿐입니다 — "며느리의 방귀를 활용할 수 있다고 제안"(→ `childIntent == SOLUTION`),
"2회 이상 대화했지만 실행 방법이 안 나옴"(→ `turnCount >= 2 && SOLUTION ∈ missingElements`).
나머지 둘("방법이 구체적이지 않음", "캐릭터 질문만으로 구체화하기 어려움")은 지금 갖고 있는
신호(사고 요소 탐지 결과, 발화 유효성)로는 판별할 수 없어 반영하지 않았습니다.

미션2는 PRD가 노출 조건을 조건식이 아니라 대화 흐름 서술로만 제공합니다. "자신의 특징을 긍정하는
이유 확인 → 관점 확장 필요"를 `turnCount >= 2 && (RESULT 또는 SOLUTION이 이미 누적됨)`으로
근사했습니다.

**결정**: `session/engine/MissionTrigger.java`에 위 근사 규칙을 구현합니다. `conflict`·
`element_criteria`와 같은 성격의 팀 해석이므로, 실제 발화 샘플로 미노출·과다노출을 확인한 뒤
조정하는 것을 전제로 합니다 (PRD 7.5.4에 준하는 취급).

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
| **U-03** | 이미지 URL 실제 형태 | Supabase Storage 우선. **에셋 수령 시 확정** | 에셋 도착 시. 컬럼은 미리 만들어 둠 |
| **U-04** | 음성(Whisper·TTS) 비용 상한 | 문서에 예산 없음. [PRD 10.4](../../docs/product/prd.md)는 대화 LLM 토큰만 규정 | 사용량이 늘면 |
| **U-05** | Supabase 무료 티어 일시정지 기간·용량 한도 | 신규 가입. 가입 시 확인 필요 | 시연 전 확인 |
| **U-06** | `highlightWords` 데이터 출처 | 장면별 고정 목록(팀 창작) vs `/respond` 응답 확장(AI 재합의) | 단어장 구현 시 |
| **U-07** | 보호자 리포트 응답 스키마 | 선택 항목(O-01). 내부 분석 태그를 보호자 화면에 노출 금지 | Phase 7 착수 시 |

### 프론트에 알려야 할 것

D-01·D-02가 프론트 작업 범위를 바꿉니다.
→ [docs/request/frontend/stt-tts-integration.md](../../docs/request/frontend/stt-tts-integration.md)
