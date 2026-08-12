# 백엔드 작업 플랜

- **작성일**: 2026-08-12
- **기준**: [work-items.md](work-items.md) 항목을 **의존 순서**로 재배열

날짜를 배분하지 않습니다. **앞 Phase의 완료 조건이 충족되면 다음으로 넘어갑니다.**
항목의 상세와 값 위치는 [work-items.md](work-items.md)를, 결정 근거는 [decisions.md](decisions.md)를 보세요.

---

## 전체 의존 관계

```
Phase 1  기반           스키마 → 시드
                          │
        ┌─────────────────┴─────────────────┐
        ▼                                   ▼
Phase 2  인증·계정                    Phase 4  대화 엔진
        │                              (mock AI 스텁 위에서)
        ▼                                   │
Phase 3  세션·조회  ──────────────────────▶ │
                                            ▼
                                     Phase 5  음성 (STT/TTS)
                                            │
                                            ▼
                                     Phase 6  후속 활동 · 실 AI · 배포
                                            │
                                            ▼
                                     Phase 7  선택 (후순위)
```

**Phase 2와 Phase 4는 병행 가능합니다.** 대화 엔진은 인증과 무관하고, 규칙 엔진은
[roles.md 5장](../../docs/team/roles.md)이 "계약 확정 전에도 진행 가능"으로 분류한 작업입니다.

---

## Phase 1 · 기반

**선행**: 없음

| 순서 | 작업 | 항목 |
| --- | --- | --- |
| 1 | Spring Boot 프로젝트 생성, 로컬 Docker Postgres 기동 | [setup.md](setup.md) |
| 2 | 엔티티 9개 정의 + 팀 추가 컬럼 | M-58, M-15, B-01~B-05 |
| 3 | `text[]` · `jsonb` 타입 매핑 확인 | [setup.md](setup.md) |
| 4 | 조건부 NOT NULL 완화 (`scene_type = dialogue`만 필수) | [PRD I-05](../../docs/product/prd.md) |
| 5 | ~~콘텐츠 시드 — 이야기 1건 + 장면 9건~~ | M-13, M-14, M-16~M-18 — **완료** |
| 6 | ~~코드 상수 — `remainingWorries`·`guidanceStyle`·캐릭터 표시명·미션 정의~~ | M-19, B-08 — **완료** |

**완료 조건**
- [x] 기동 시 테이블이 전부 생성되고, 시드가 **두 번 기동해도 중복되지 않는다** — 재기동 2회 확인 (2026-08-12)
- [x] `story_scenes` 9건 조회 시 `scene_type`이 `intro` 1 / `narrative` 4 / `dialogue` 4 — psql로 확인
- [x] `dialogue` 장면 4건에 `conflict`·`element_criteria`·`preferred_turns`·`max_turns`가 채워져 있다 — psql로 확인

> **Phase 1 완료** (2026-08-12). `story/ContentSeeder.java`(시드), `story/constant/`(코드 상수 —
> `DialogueContents`, `Missions`) + 단위 테스트. `scene_description`이 대화 장면 4건에는 PRD에
> 없어 팀이 작성했다 (D-19).

> `tts_cache`(B-06)는 여기서 테이블만 만들어 두고 Phase 5에서 씁니다.

---

## Phase 2 · 인증 · 계정 · 동의

**선행**: Phase 1

| 순서 | 작업 | 항목 |
| --- | --- | --- |
| 1 | ~~Spring Security + JWT 발급·검증~~ | M-02 — **완료** (D-18) |
| 2 | ~~카카오 OAuth2 리다이렉트 로그인 → `parents` 생성/조회~~ | M-01, M-03 — **완료** (D-18) |
| 3 | ~~아이 프로필 CRUD + 3명 제한 검증~~ | M-04 — **완료** |
| 4 | ~~동의 기록 동시 생성 (`POST /api/children`)~~ | M-05 — **완료** |
| 5 | 세션 시작 시 동의 검증 게이트 | M-05 — **Phase 3(세션 생성) 착수 시 구현** |
| 6 | ~~CORS 설정~~ | B-24 — **완료** |

**완료 조건**
- ✅ ~~카카오 로그인 → `accessToken` + `hasCompletedOnboarding` 응답~~
  → **리다이렉트 방식으로 변경**되어 `GET /api/oauth2/authorization/kakao` 진입 후
  `{프론트}/auth/callback?hasCompletedOnboarding=` 리다이렉트로 확인 (D-18). 실제 검증 완료 —
  `POST /api/auth/dev-login` → `GET /api/auth/me`(200) / 토큰 없이 요청(401) 둘 다 확인
- [x] 아이 4명째 등록 시 409 `CHILD_LIMIT_EXCEEDED` — curl로 검증 완료 (2026-08-12)
- [x] 다른 보호자의 아이 조회 시 403 `FORBIDDEN` — curl로 검증 완료 (2026-08-12)
- [ ] 동의 없는 아이로 세션 시작 시 403 `CONSENT_REQUIRED` — 세션 생성 엔드포인트(Phase 3)가 아직 없어 미착수

> **카카오 실로그인 검증 완료** (2026-08-12). 카카오 앱 등록 후 브라우저로 동의→콜백→쿠키 인증까지
> 실계정으로 확인했습니다. `POST /api/auth/dev-login`은 카카오 계정 없이 빠르게 테스트할 때
> 계속 씁니다. `KAKAO_CLIENT_ID`가 비어 있으면 Spring이 부팅 자체를 거부하니, 값을 뺄 일이
> 있으면 `.env`에 placeholder를 넣어두세요.

---

## Phase 3 · 세션 · 조회

**선행**: Phase 2

| 순서 | 작업 | 항목 |
| --- | --- | --- |
| 1 | ~~이야기 목록 · 주제 필터 · 상세~~ | M-10, M-11 — **완료** |
| 2 | ~~홈 (진행 중 + 추천)~~ | M-08 — **완료** |
| 3 | ~~세션 생성 · 재시작~~ | `POST /api/sessions` — **완료** |
| 4 | ~~세션 조회 (이어하기 복원)~~ | `GET /api/sessions/{id}` — **완료** |
| 5 | ~~**아이 이름 치환**~~ | M-26 — **완료** |
| 6 | ~~장면 전환 — `intro`/`narrative` 완료 → 다음 장면~~ | M-46 — **완료** |
| 7 | ~~`dialogue` 진입 시 `character_opening`을 `messages`에 저장 후 응답~~ | M-33 일부 — **완료** |
| 8 | ~~`sceneProgress` 화면 단위 변환~~ | D-12 — **완료** (`GET /api/home`에서 검증) |

**완료 조건**
- [x] 세션 생성 → 도입(1) → 전개1(2) → 대화1(3)까지 장면이 넘어간다 — curl로 `POST .../scenes/{id}/complete`를 연속 호출해 확인 (2026-08-12)
- [x] 대화1 진입 시 `character_opening`에 **아이 이름이 치환되어** 저장된다 (받침 유무 반영) — "민준"(받침 O) → "민준아", "지호"(받침 X) → "지호야" 둘 다 curl로 확인. 단위 테스트 6건 포함
- [x] `GET /api/sessions/{id}`로 중간 상태가 복원된다 — curl로 세션 생성 → 재조회 일치 확인, restart:true로 신규 세션+기존 세션 stopped 전환 확인
- [x] `currentSceneOrder: 5` → `sceneProgress: { current: 2, total: 4 }` — Phase 3 항목 2(`GET /api/home`)에서 검증 완료

> **Phase 3 완료** (2026-08-12). 다음은 Phase 4(대화 엔진) — AI mock 스텁부터 시작한다.

> **다음 작업**: 항목 5~7(이름 치환 + 장면 전환 + character_opening 저장)이 한 덩어리다.
> `POST /api/sessions/{id}/scenes/{sceneId}/complete`에서 함께 구현한다.

---

## Phase 4 · 대화 엔진

**선행**: Phase 1 (Phase 2·3과 병행 가능)

**AI 서버 mock 스텁을 먼저 만들고 그 위에서 구현합니다.** 고정 JSON을 반환하는 스텁이면 충분하고,
AI 서버 완성을 기다리지 않고 전체 흐름을 검증할 수 있습니다 ([roles.md 5장](../../docs/team/roles.md)).

| 순서 | 작업 | 항목 |
| --- | --- | --- |
| 1 | ~~**AI mock 스텁** — `/analyze`·`/respond` 고정 JSON~~ | B-11 — **완료** |
| 2 | ~~아이 발화 `messages` 저장~~ | M-33 — **완료** |
| 3 | ~~`/analyze` 입력 조립 + 호출~~ | M-35, B-09 — **완료** |
| 4 | ~~**서버 후처리** — `evidence` 원문 대조 · 중복 제거 · 스키마 외 값 제거~~ | M-36 — **완료** |
| 5 | ~~누적 요소 갱신 · `missingElements` 계산~~ | M-37 — **완료** |
| 6 | ~~**진행 판단 규칙 엔진** (판단 순서 고정)~~ | M-38, M-39 — **완료** |
| 7 | ~~`reactionKey` 매핑~~ | M-40 — **완료** |
| 8 | ~~GUIDED 유도 대상 선택 + `remainingWorry` 조회~~ | M-41 — **완료** |
| 9 | ~~`/respond` 호출~~ | M-42, B-10 — **완료** |
| 10 | ~~`CLOSING` — AI 미호출, `character_closing` 사용~~ | M-43 — **완료** |
| 11 | ~~`story_sessions` 상태 갱신 + 장면 전환 시 초기화~~ | M-44 — **완료** |
| 12 | ~~`utterance_analyses` 저장~~ | M-45 — **완료** |
| 13 | ~~AI 실패 폴백~~ | B-12 — **완료** |
| 14 | ~~미션 노출 판정 + system 메시지~~ | M-47~M-49 — **완료.** PRD 7.6 조건 4개 전부 (D-20) |

**완료 조건**
- [x] 존재하지 않는 `evidence`를 반환하는 mock을 물리면 **해당 요소가 삭제된다** — mock을 임시로 편집해 확인. 진짜 evidence는 유지되고 조작한 것만 삭제됨을 같은 턴에서 대조 확인
- [x] 짧은 발화를 2회 연속 넣으면 `GUIDED`가 나온다 — "남은 턴 ≤ 2" 경로로 확인 (동일 판단 3단계, 단위 테스트로 저정보 2회 연속 경로도 별도 검증)
- [x] `max_turns` 도달 시 `CLOSING` + `character_closing` 원문이 응답에 실린다 (LLM 미호출) — 응답의 `characterMessage`가 mock의 `/respond` 고정 문구가 아니라 시드된 `character_closing` 원문과 정확히 일치함을 확인해 LLM 미호출을 증명
- [x] 장면이 넘어간 뒤 `accumulated_elements`가 **빈 배열로 초기화된다** — `GET /api/sessions/{id}`로 확인
- [x] mock을 죽여도 아이 화면 관점에서 대화가 계속된다 (`/analyze` 실패 → 진행 / `/respond` 실패 → 장면 종료) — mock에 예외를 임시로 심어 각각 확인. 둘 다 500이 아니라 200으로 응답함

> **Phase 4 완료** (2026-08-12). 규칙 엔진(`session/engine/*`)은 순수 함수로 분리하고 단위 테스트
> 39건을 붙였다 (판단 순서 고정 검증 포함). 미션 노출 조건은 PRD 7.6의 4개 조건을 전부 구현했고
> AI 계약 확장은 필요 없었다 — `element_criteria` 통과 여부가 이미 "구체성" 판정이기 때문 (D-20).

---

## Phase 5 · 음성 (STT / TTS)

**선행**: Phase 4

| 순서 | 작업 | 항목 |
| --- | --- | --- |
| 1 | ~~`POST /api/stt` — multipart 수신~~ | B-13 — **완료** |
| 2 | ~~Whisper 호출 + **오디오 즉시 폐기**~~ | B-14, B-15 — **완료** |
| 3 | ~~`tts_cache` 조회·저장~~ | B-17 — **완료** |
| 4 | ~~`GET /api/tts?messageId=`~~ | B-16 — **완료** |
| 5 | ~~기동 시 고정 대사 **11건** 프리워밍~~ | B-18 — **완료** |
| 6 | ~~타임아웃 값 적용 (STT 8초 / analyze 5초 / respond 5초)~~ | D-03 — **완료** |

**완료 조건**
- [x] 오디오 업로드 → 텍스트 반환. **디스크에 파일이 남지 않는다** — TTS로 만든 실음성을 STT에 그대로 넣어 원문과 사실상 동일한 텍스트로 복원 확인. 업로드 바이트는 메모리에서만 다룸
- [x] 빈 STT 결과면 `POST /messages`를 호출하지 않아 `messages`에 빈 레코드가 안 생긴다 — 빈 파일 업로드 시 OpenAI 호출 없이 `{"text":""}` 즉시 반환 확인 (프론트가 이때 ②를 안 부름)
- [x] 재기동해도 프리워밍이 다시 돌지 않는다 (캐시가 DB에 남아 있음) — 재기동 로그에 "신규 생성 0건"
- [x] 이름이 들어간 고정 대사 2건은 첫 재생 시 생성되어 캐시에 추가된다 — 대화1 "민준아…" 메시지 최초 재생 시 `tts_cache` 행이 늘어남을 확인

> **Phase 5 완료** (2026-08-12). 실 OpenAI 키로 TTS 생성·캐시 히트·STT 라운드트립까지 curl로
> 검증했다. 이 과정에서 버그 2건을 발견해 고쳤다 — ① `ApplicationRunner` 실패가 서버 기동
> 자체를 막던 것(TtsPrewarmRunner 항목별 예외 흡수로 해결), ② `MultipartBodyBuilder`가
> 서블릿 프로젝트에 없는 reactive-streams를 요구해 나던 `NoClassDefFoundError`
> (`LinkedMultiValueMap`+`ByteArrayResource`로 해결). 상세는 work-items.md 8장·decisions.md D-21.

---

## Phase 6 · 후속 활동 · 실 AI · 배포

**선행**: Phase 5

| 순서 | 작업 | 항목 |
| --- | --- | --- |
| 1 | ~~카드 조회 (셔플 고정)~~ | `GET /activity` — **완료** |
| 2 | ~~순서 정답 판정 + `attempt_count` 누적~~ | M-53 — **완료** |
| 3 | ~~**3회 제한** — 3회째 `correctOrder` 공개~~ | B-19 — **완료** |
| 4 | ~~정답 시 `retellingKeywords` 응답~~ | M-54 — **완료** |
| 5 | ~~재구성 발화 수신 · `post_activity_results` 저장~~ | M-56 — **완료** |
| 6 | ~~세션 완료 처리~~ | M-57 — **완료** |
| 7 | **AI 서버 실주소로 교체** (mock → 실서버) | U-01 — 미결(주소 미수령), mock으로 우회 중 |
| 8 | Supabase Postgres 연결 전환 | B-21 — 계정 필요, 사용자 확인 대기 |
| 9 | Render 배포 | M-59 — 계정 필요, 사용자 확인 대기 |
| 10 | ~~헬스체크~~ + 외부 크론 10분 핑 | B-22 **완료** · B-23은 배포 URL 필요 |
| 11 | **응답 시간 실측** → 프론트에 공유 | U-02 — 배포 후 측정 |

**완료 조건**
- [x] 이야기 1편을 처음부터 끝까지 완주해 `status = completed`가 된다 — 세션 2건을 인트로~대화4까지 curl로 완주, `story_sessions.status=COMPLETED` DB 확인
- [x] 3회 오답 후에도 다음 단계로 넘어간다 (`is_order_correct = false`로 저장) — 3회 오답 세션에서 `attempt_count=3, is_order_correct=f` DB 확인, 응답은 계속 200으로 진행 가능
- [ ] 배포 환경에서 15분 방치 후에도 첫 요청이 응답한다 — 배포 전이라 미착수
- [ ] STT / 발화 전송 / TTS 각 구간의 실측 시간을 프론트에 전달했다 — 배포 전이라 미착수

> **후속 활동(항목 1~6) 완료** (2026-08-12). `activity/{controller,service,dto}` 신규.
> `PostActivityResult`·`PostActivityConfig`는 Phase 1에서 이미 만들어둔 엔티티를 그대로 썼다.
> 남은 항목(7~11)은 배포·실 AI 서버 연동으로, 둘 다 팀 외부 요인(U-01 AI 주소, Supabase/Render
> 계정)에 막혀 있다 — 상세는 work-items.md 10·11장.

> **배포는 사용자 지시로 보류** (2026-08-12). "배포는 마지막에 진행할거야 우선 로컬로 테스트를
> 하고 내가 나중에 배포 진행하자 할 때 그때 작업해." 항목 7~11(U-01·B-21·M-59·B-23·U-02)은
> 사용자가 배포를 지시할 때 재개한다. 그때까지는 Phase 7(선택 항목) 중 로컬에서 끝낼 수
> 있는 것부터 진행한다.

---

## Phase 7 · 선택 (후순위)

**선행**: Phase 6의 필수 항목(1~6, 완료) — 배포(7~11)는 사용자 지시로 보류 중이라 기다리지 않는다.

| 순서 | 작업 | 항목 |
| --- | --- | --- |
| 1 | ~~별가루 — 이야기 완료 시 +100~~ | B-20 — **완료** |
| 2 | ~~단어장 — `wordbook` + API 3개~~ | O-06~O-10 — **완료** |
| 3 | ~~NORMAL soft-cue~~ | O-13 — **완료** |
| 4 | 보호자 리포트 + `reports` | O-01~O-05 — **계획 수립 완료, 구현은 사용자 확인 후 착수** |

별가루를 1순위에 둔 이유: 지급 지점이 M-57(세션 완료 처리) 한 곳이라 **이미 만든 로직에 얹히기 때문**입니다.

> **별가루 완료** (2026-08-12). `ActivityServiceImpl.submitRetelling`에서 세션이 이미
> `COMPLETED`가 아닐 때만 `child.addStarDust(100)`을 호출한다. 이미 완료된 세션에 재요청해도
> 중복 지급되지 않음을 curl+DB로 확인했다.

> **단어장 완료** (2026-08-12). 원래 순서를 건너뛰고 먼저 착수했다 — `highlightWords`가 항상
> 빈 배열이라 진입점이 없다는 걸 발견해, 그것부터 해소(D-22: 캐릭터 응답에 후보 단어가 실제로
> 포함될 때만 골라냄)한 뒤 그 위에 `wordbook` 3개 엔드포인트를 얹었다. 대화4 CLOSING까지
> 실제로 완주해 `highlightWords`가 응답에 실리는 것부터 저장·필터(all/liked/story:{id})·
> liked 토글까지 curl로 전부 확인.

> **NORMAL soft-cue 완료** (2026-08-12). "새 필드 불필요"를 "코드도 불필요"로 잘못 읽고
> 방치했던 항목 — PRD 6.14·api.md 4.2를 다시 읽어 GUIDED와 같은 필드를 NORMAL에도 함께
> 보내면 된다는 뜻임을 확인하고 구현했다 (D-23). `ProgressJudge`의 강한 유도 제한이 만드는
> "신규 요소 확인 → NORMAL 강제" 턴이 정확히 soft-cue 조건과 겹친다. mock으로 재현해
> `responseMode: normal`이면서 `last_guidance_target`이 채워짐을 DB로 확인, 단위 테스트 6건 추가.

> **보호자 리포트는 계획만 세우고 구현 전 멈췄다** (2026-08-12). 사용자가 준 리포트 가이드를
> 확인하는 과정에서 `docs/reference/guardian-report-guide.md`(주최측 원문)와 프론트의
> `frontend/src/lib/api/{types.ts, mock-parent.ts}`가 이미 응답 형태·계산 로직·문구를 전부
> 갖추고 있음을 발견했다 — 추론 없이 그대로 옮기면 된다. api.md 3.8에 응답 예시 3개를
> 확정해 반영했고, work-items.md 12장에 포팅해야 할 계산 로직 표와 새 코드 상수 목록을
> 정리했다. 구현 착수 전 확인할 것 2가지(`reports` 테이블 필요 여부, 대표 발화·질문 세트
> 선택 휴리스틱을 프론트와 동일하게 가져갈지)를 남겨뒀다 — 사용자 확인 후 이어간다.

---

## 병목 지점

| 지점 | 내용 |
| --- | --- |
| Phase 1 → 나머지 전부 | 스키마가 안 서면 아무것도 못 함. **가장 먼저** |
| Phase 4의 mock 스텁 | 없으면 AI 서버 완성까지 대화 엔진 검증이 막힘 |
| AI 서버 주소 (U-01) | 미결이지만 mock으로 우회 가능. Phase 6까지 늦출 수 있음 |
| 에셋 미수령 | 이미지 URL 컬럼만 만들어 두고 값은 나중에. 작업을 막지 않음 |
| 프론트 15초 예산 (U-02) | Phase 6 실측 전까지 확정 불가. 요청을 3개로 나눠 각 구간을 줄여둔 상태 |
