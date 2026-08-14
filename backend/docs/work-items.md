# 백엔드 작업 항목

- **작성일**: 2026-08-12
- **기준 문서**: [PRD 11.2](../../docs/product/prd.md), [roles.md 3장](../../docs/team/roles.md), [spec/api.md](../../docs/spec/api.md)

## 표기

| 표기 | 의미 |
| --- | --- |
| `M-xx` | PRD 11.2 구현 체크리스트 ID |
| `O-xx` | PRD 11.3 선택 항목 ID |
| `B-xx` | 본 문서에서 추가한 항목. 근거는 [decisions.md](decisions.md) |
| 등급 | **필수** / **필수-기반** / **선택-후순위** |

> 값이 필요하면 각 항목의 **값 위치** 링크로 가세요. 이 문서에 값을 옮겨 적지 않습니다.

---

## 1. 기반 — 스키마

| ID | 항목 | 등급 | 값 위치 |
| --- | --- | --- | --- |
| M-58 | PostgreSQL 스키마 구축 (테이블 9개) | 필수-기반 | [PRD 8.3~8.11](../../docs/product/prd.md) |
| M-15 | `story_scenes.scene_type` (`intro`/`narrative`/`dialogue`) | 필수-기반 | [PRD 8.7](../../docs/product/prd.md) |
| — | `story_scenes.element_criteria` jsonb | 필수-기반 | [PRD 8.7](../../docs/product/prd.md) |

### 팀 추가 컬럼·테이블

PRD 8장 정의에 없어 본 프로젝트에서 추가하는 것들입니다. 근거는 [decisions.md](decisions.md).

| ID | 대상 | 추가 | 근거 |
| --- | --- | --- | --- |
| B-01 | `stories` | `situation varchar`, `child_role varchar` | D-07 (Q-03) |
| B-02 | `children` | `avatar_id varchar` nullable | D-08 (Q-11) |
| B-03 | `children` | `star_dust integer NOT NULL DEFAULT 0` | D-09 (Q-12) |
| B-04 | `stories` | `cover_image_url varchar` | D-15 |
| B-05 | `story_scenes` | `background_image_url varchar` | D-15 |
| B-06 | **신규** `tts_cache` | 텍스트 해시 → 오디오 `bytea` | D-05 |
| B-07 | `wordbook` | PRD 8.12 정의 + `liked boolean` | D-11 (Q-06) · **선택-후순위** |

### 주의

- **NOT NULL 완화**: `conflict`, `character_name`, `character_opening`, `character_closing`, `scene_goal`, `required_elements`, `element_criteria`, `preferred_turns`, `max_turns`는 `scene_type = dialogue`일 때만 필수. 도입·전개 장면에는 값이 없음 ([PRD I-05](../../docs/product/prd.md))
- **타입 매핑**: `text[]`(`topics`, `required_elements`, `accumulated_elements`, `last_detected_elements`, `submitted_order`)와 `jsonb`(`element_criteria`, `post_activity_config`, `detected_elements`)는 JPA 엔티티에 타입을 명시해야 함 → [setup.md](setup.md)

---

## 2. 기반 — 콘텐츠 적재

| ID | 항목 | 등급 | 값 위치 |
| --- | --- | --- | --- |
| M-13 | ~~`stories` 1건~~ | 필수-기반 | **완료.** `story/ContentSeeder.java` |
| M-14 | ~~`story_scenes` 9건 (도입1 + 전개4 + 대화4)~~ | 필수-기반 | **완료.** 재기동 중복 삽입 없음 확인 (existsByTitle) |
| M-16 | ~~`conflict` 4건~~ | 필수-기반 | **완료** |
| M-17 | ~~`element_criteria` 4건~~ | 필수-기반 | **완료** |
| M-18 | ~~`preferred_turns` 4건~~ | 필수-기반 | **완료** |
| — | ~~`post_activity_config`~~ | 필수-기반 | **완료** |
| M-19 | ~~`remainingWorries` · `guidanceStyle` **코드 상수**~~ | 필수-기반 | **완료.** `story/constant/DialogueContents.java`, scene_order 키. 단위 테스트 포함 |
| B-08 | ~~캐릭터 **표시명** 매핑 코드 상수~~ | 필수-기반 | **완료.** `DialogueContents`에 함께 둠 (scene_order 단위라 별도 클래스로 안 나눔) |

### 주의

- `remainingWorries`·`guidanceStyle`은 **캐릭터+장면 조합 키**로 관리. 며느리가 대화1·대화4에 모두 나오지만 값이 다름 ([PRD 7.5.3](../../docs/product/prd.md))
- `character_name`에는 식별자(`ch_banggui_daughter_in_law`)를 저장하고 표시명은 별도 상수 (B-08)
- 시드는 **중복 삽입 방지 조건**을 걸 것. `ddl-auto`는 데이터를 넣어주지 않음 → [setup.md](setup.md)
- `element_criteria`는 AI 담당 튜닝 결과로 **재배포 없이 UPDATE**할 수 있어야 함 ([PRD 8.7](../../docs/product/prd.md))
- 대화 장면 4건의 `scene_description`은 PRD에 없어 팀이 작성 (D-19)

---

## 3. 인증 · 계정 · 동의

| ID | 항목 | 등급 | 비고 |
| --- | --- | --- | --- |
| M-02 | ~~Spring Security + JWT~~ | 필수-기반 | **완료.** Supabase Auth 미사용 ([PRD I-10](../../docs/product/prd.md)) · D-18 |
| M-01 | ~~카카오 소셜 로그인~~ | 필수 | **완료.** 카카오 단독, 리다이렉트 방식. 실계정으로 로그인→쿠키 인증까지 검증 완료 (D-06 · D-18) |
| M-03 | ~~보호자 계정 생성 (`parents`)~~ | 필수 | **완료.** `provider`·`provider_id`·`email` 컬럼 추가 (D-18) |
| M-04 | ~~아이 프로필 CRUD (`children`)~~ | 필수 | **완료.** 계정당 최대 3명 검증 → 409 `CHILD_LIMIT_EXCEEDED` |
| M-05 | 동의 관리 (`child_consents`) | 필수 | 등록 시 동시 생성은 **완료.** 세션 시작 시 검증 게이트는 **Phase 3(세션 생성 엔드포인트) 착수 시** 구현 |

### 엔드포인트

| 메서드 | 경로 | 스키마 | 상태 |
| --- | --- | --- | --- |
| GET | `/api/oauth2/authorization/kakao` | [api.md 3.1](../../docs/spec/api.md) | ✅ Spring Security 자동 처리 |
| GET | `/api/login/oauth2/code/kakao` | 〃 | ✅ 〃 |
| GET | `/api/auth/me` | 〃 | ✅ 완료 |
| POST | `/api/auth/logout` | 〃 | ✅ 완료 |
| POST | `/api/auth/dev-login` | 〃 | ✅ 완료. **시연 전 제거** |
| GET · POST | `/api/children` | [api.md 3.2](../../docs/spec/api.md) | ✅ 완료 |
| PATCH · DELETE | `/api/children/{childId}` | [api.md 3.2](../../docs/spec/api.md) | ✅ 완료 |

> `GET /api/parents/me`(api.md 3.1 원안)는 아직 없습니다. 지금은 `GET /api/auth/me`가
> 그 역할(로그인 확인 + `hasCompletedOnboarding`)을 겸합니다. Phase 3에서 아이 목록 등
> 프로필 조회가 필요해지면 그때 분리하거나 합칩니다.

### 주의

- `POST /api/children`은 **아이 등록과 동의 기록을 한 번에** 생성 (`consent_version = 'mvp_v1'`, `verification_method = 'authenticated_parent'`)
- `age`는 저장하지 않고 `현재 연도 - birth_year`로 계산해 응답 ([PRD I-11](../../docs/product/prd.md))
- `DELETE`는 `story_sessions`·`messages`·`wordbook` 캐스케이드. **DB FK 레벨**(`@OnDelete(CASCADE)`)로 구현했다 — 앱 코드에서 자식 테이블을 순회하며 지우지 않는다. `child_consents`·`story_sessions`→`messages`·`post_activity_results`→`utterance_analyses`까지 전부 연쇄 삭제된다. `wordbook`은 아직 테이블이 없어 해당 없음 (Phase 7에서 같은 방식으로 추가할 것)
- `avatar_id`는 **값 검증하지 않음** (D-08)

---

## 4. 조회 — 홈 · 탐색

| ID | 항목 | 등급 | 엔드포인트 |
| --- | --- | --- | --- |
| M-08 | ~~진행 중 이야기 · 이어하기~~ | 필수 | `GET /api/home?childId=` — **완료.** `child.starDust` 추가 (선택, 프론트 요청 — D-33) |
| M-10 | ~~이야기 목록~~ | 필수 | `GET /api/stories?childId=&topic=` — **완료** |
| M-11 | ~~주제별 필터링~~ | 필수 | 〃 (`stories.topics` 기준) — **완료** |
| — | ~~이야기 상세~~ | 필수 | `GET /api/stories/{storyId}?childId=` — **완료** |

스키마: [api.md 3.3](../../docs/spec/api.md)

### 주의

- **추천 로직 없음.** `status = published` 목록을 그대로 내려줌 ([PRD F-02](../../docs/product/prd.md))
- 이어하기 세션이 여러 개면 `last_activity_at` 최신 **1건만**
- `sceneProgress`는 화면 단위 4구간, `currentSceneOrder`는 DB 단위 1~9. **분리해서 내려줌** (D-12)
- 상세 화면의 `situation`·`childRole`은 `conflict`가 아니라 **B-01 컬럼** 값 (D-07)

---

## 5. 세션 · 장면 진행

| ID | 항목 | 등급 | 엔드포인트 |
| --- | --- | --- | --- |
| — | ~~세션 생성 · 재시작~~ | 필수 | `POST /api/sessions` — **완료** |
| — | ~~세션 조회 (이어하기 복원)~~ | 필수 | `GET /api/sessions/{sessionId}` — **완료.** `messages[].characterDisplayName` 추가 (선택, 프론트 요청 — D-31) |
| M-46 | ~~장면 전환 처리 (intro/narrative → 다음)~~ | 필수 | `POST /api/sessions/{id}/scenes/{sceneId}/complete` — **완료** |
| — | ~~이야기 나가기~~ | 선택 | `PATCH /api/sessions/{sessionId}` — **완료** (C-13). `{"status":"stopped"}`만 허용, 그 외 값은 400 |
| M-44 | ~~`story_sessions` 상태 갱신~~ | 필수 | [PRD 8.8](../../docs/product/prd.md) — `advanceToScene()` 초기화 필드 전부 반영. **완료** |
| M-26 | ~~**아이 이름 치환**~~ | 필수 | `session/support/NameSubstitutor.java`. 받침 유무 6가지 케이스 단위 테스트 + curl로 민준(받침 O)·지호(받침 X) 둘 다 검증. **완료** |
| M-05 | ~~세션 시작 시 동의 검증 게이트~~ | 필수 | `POST /api/sessions`에서 403 `CONSENT_REQUIRED` — **완료** |

스키마: [api.md 3.4](../../docs/spec/api.md)

### 주의

- `restart: true`면 기존 세션을 `stopped`로 바꾸고 **새 세션 생성.** 기존 `messages`는 삭제하지 않음
- `restart: false`(또는 생략)이고 진행 중(`in_progress`/`post_activity`) 세션이 **이미 있으면 새로 만들지 않고 그 세션을 그대로 반환**한다 (팀 결정 — api.md가 명시하지 않은 부분). 프론트가 B-4 모달 없이 실수로 두 번 호출해도 세션이 중복 생성되지 않는다
- 동의 없는 아이로 세션 시작 시 403 `CONSENT_REQUIRED`
- `dialogue` 장면 진입 시 `character_opening`을 **`messages`에 저장한 뒤** 함께 내려줌 ([PRD 6.2](../../docs/product/prd.md))
- **장면 전환 시 초기화**할 필드가 따로 있음 ([PRD 8.8](../../docs/product/prd.md)). 초기화하지 않으면 다음 장면이 이전 요소를 물려받아 첫 턴에 즉시 종료됨
- `POST .../complete`는 **intro/narrative 전용.** `dialogue` 장면을 이 엔드포인트로 종료하려 하면 400 `INVALID_REQUEST` — dialogue 종료는 대화 엔진(Phase 4)의 몫
- `sceneId`가 세션의 현재 장면과 다르면(이미 지나간 장면) 409 `SCENE_ALREADY_CLOSED`
- `messages.turn_order`는 **세션 전체 기준 연속 번호**다 (장면별로 리셋하지 않음). `openingMessage`가 그 세션의 첫 메시지면 1부터 시작
- 이름 치환은 **`messages` 저장 시점에** 수행. 치환 후 텍스트가 화면·TTS·AI 입력에 모두 쓰임 (D-04)
- "이야기 나가기"는 현재 상태와 무관하게 `stop()`을 호출한다 — 이미 `stopped`/`completed`여도
  에러 없이 그대로 둠(멱등). `restart:true`의 기존 세션 정지 로직과 같은 방식

### 검증 — 이야기 나가기 (2026-08-12)

- 정상: 진행 중 세션에 `PATCH {"status":"stopped"}` → 200, DB `status=STOPPED` 확인
- 에러: `status` 값이 `stopped`가 아니면 400 `INVALID_REQUEST`, 다른 보호자 세션이면 403 `FORBIDDEN`, 없는 `sessionId`면 404 `NOT_FOUND`

---

## 6. 대화 엔진 (백엔드 핵심)

파이프라인 4단계 중 **②③이 백엔드 직접 구현**, ①④는 AI 서버 위임입니다.
전체 구조는 [PRD 6.1](../../docs/product/prd.md), 백엔드 관점 요약은 [roles.md 3.5](../../docs/team/roles.md).

| ID | 항목 | 등급 | 규칙 위치 |
| --- | --- | --- | --- |
| M-33 | ~~`messages` 저장~~ | 필수 | [PRD 8.9](../../docs/product/prd.md) — **완료** |
| M-35 | ~~발화 분석 LLM 호출 (입력 조립)~~ | 필수 | [PRD 6.5](../../docs/product/prd.md) — **완료** |
| M-36 | ~~**서버 후처리** — 근거 검증 · 중복 제거~~ | 필수 | [PRD 6.7](../../docs/product/prd.md) — **완료.** `session/engine/AnalysisPostProcessor.java` |
| M-37 | ~~누적 요소 갱신~~ | 필수 | [PRD 6.8](../../docs/product/prd.md) — **완료.** `session/engine/AccumulatedElementsCalculator.java` |
| M-38 | ~~**진행 판단 규칙 엔진**~~ | 필수 | [PRD 6.9](../../docs/product/prd.md) — **완료.** `session/engine/ProgressJudge.java` + 단위 테스트 11건 |
| M-39 | ~~응답 모드 결정 (`NORMAL`/`GUIDED`/`CLOSING`)~~ | 필수 | [PRD 6.10](../../docs/product/prd.md) — **완료** |
| M-40 | ~~`reactionKey` 매핑~~ | 필수 | [PRD 6.13](../../docs/product/prd.md) — **완료.** `session/engine/ReactionKeyMapper.java` |
| M-41 | ~~GUIDED 유도 대상 선택 + 재료 구성~~ | 필수 | [PRD 6.9 · 6.15](../../docs/product/prd.md) — **완료.** `session/engine/GuidanceSelector.java`. O-13(NORMAL soft-cue, 아래)도 같은 클래스의 `selectForTurn()`으로 함께 구현 (D-23) |
| M-42 | ~~캐릭터 응답 LLM 호출~~ | 필수 | [PRD 6.12](../../docs/product/prd.md) — **완료** |
| M-43 | ~~`CLOSING` 시 고정 마지막 대사 재생~~ | 필수 | [PRD I-01](../../docs/product/prd.md) — **완료** |
| M-44 | ~~`story_sessions` 상태 갱신 (턴 단위)~~ | 필수 | [PRD 8.8](../../docs/product/prd.md) — **완료.** `StorySession.recordTurnResult()`·`closeScene()` |
| M-45 | ~~`utterance_analyses` 저장~~ | 필수 | [PRD 8.10](../../docs/product/prd.md) — **완료** |
| M-47~M-49 | ~~미션 노출 판정 + system 메시지~~ | 필수 | [PRD 7.6](../../docs/product/prd.md) — **완료.** `session/engine/MissionTrigger.java` (D-20, 조작화 근거 참조). 주최측이 "항상 노출"로 확정한 뒤 GOAL_MET 유예 + 강제 노출 턴 추가 (D-29) |
| B-12 | ~~AI 실패 폴백~~ | 필수 | `/analyze` 실패→빈 분석 진행, `/respond` 실패→`character_midline`으로 대체하고 장면 유지(D-40, 최초엔 `character_closing` 강제 종료였음). **완료** |

엔드포인트: `POST /api/sessions/{sessionId}/messages` — 스키마 [api.md 3.5](../../docs/spec/api.md). **완료**,
mock 스텁 상대로 curl 검증 (evidence 삭제, GUIDED 트리거, max_turns 종료, 장면전환 초기화,
analyze/respond 각각 실패 폴백, 미션 트리거+중복방지, STT_EMPTY, FORBIDDEN, non-dialogue 거절).

### 반드시 지킬 것

- **후처리를 AI에 맡기지 않는다.** `evidence`가 아이 발화 원문에 실제로 있는지 대조하고, 없으면 그 요소를 삭제. LLM이 없는 근거를 만들어내는 걸 막는 장치이므로 **LLM 밖에 있어야 의미가 있음**
- **판단 순서를 바꾸지 않는다.** 종료 조건 → 강한 유도 제한 → 유도 필요성 → NORMAL. 순서를 바꾸면 결과가 달라짐 ([PRD 6.9](../../docs/product/prd.md))
- **`CLOSING`이면 AI를 호출하지 않는다.** `character_closing`을 그대로 씀. 검수된 고정 텍스트라 LLM이 관여하면 안 됨
- **`missingElements`는 DB에 저장하지 않는다.** 매번 계산
- **`remainingWorry`가 없으면 아무것도 전달하지 않는다.** 대체 문구를 만들어 넣지 않음 ([PRD 6.14](../../docs/product/prd.md))
- 사고 요소는 **8개뿐**. 그 외 값은 제거 ([PRD 6.3](../../docs/product/prd.md))
- `missingElements`를 응답에 넣지 않음 — 아이에게 "못한 것"으로 읽힘 ([api.md 3.5](../../docs/spec/api.md))
- **O-13 NORMAL soft-cue는 "새 필드 불필요"이지 "코드 불필요"가 아니다.** `responseMode`가
  `NORMAL`이어도 신규 요소가 막 잡히고 missing이 남아 있고 장난·질문·불명확 반응이 아니면
  GUIDED와 같은 `guidanceTarget`/`remainingWorry`를 함께 실어 보낸다 ([api.md 4.2](../../docs/spec/api.md) · D-23)

---

## 7. AI 서버 연동

| ID | 항목 | 등급 | 비고 |
| --- | --- | --- | --- |
| B-09 | ~~`POST /analyze` 클라이언트~~ | 필수 | 타임아웃 5초 · 재시도 0회 — **완료.** `message/service/ai/AiAnalyzeClientImpl.java` |
| B-10 | ~~`POST /respond` 클라이언트~~ | 필수 | 타임아웃 5초 · 재시도 0회 — **완료.** `message/service/ai/AiRespondClientImpl.java` |
| B-11 | ~~**AI 서버 mock 스텁**~~ | 필수-기반 | `aimock/AiMockController.java` — `POST /api/mock-ai/analyze`·`/respond`, 고정 JSON, 인증 불필요. **완료** |
| B-12 | ~~실패 폴백 처리~~ | 필수 | 아래 표 — **완료** (6장에도 같은 항목 있음, Phase 4에서 구현 후 이 표 갱신을 놓쳤었음) |

계약: [api.md 4.1 · 4.2](../../docs/spec/api.md)

### 실패 시 동작 (D-03)

| 실패 지점 | 동작 |
| --- | --- |
| `/analyze` | 빈 분석(`detectedElements: []`, `utteranceValidity: UNCLEAR`)으로 **정상 진행.** `/respond`는 호출됨. 아이는 아무것도 못 느낌 |
| `/respond` | `character_midline`(검수된 고정 중간 대사)으로 대체. **장면은 끝내지 않고** 다음 아이 차례를 유지 (D-40) |

**어느 쪽도 에러 화면을 띄우지 않습니다.** AI가 죽어도 이야기가 멈추지 않는 것이 목표입니다.

### 주의

- AI 서버는 **상태가 없고 DB에 접근하지 않음.** 매 호출마다 필요한 값을 전부 실어 보냄
- `/analyze` 입력에 **넣지 않는 값**: 이야기 제목, 캐릭터 이름, 누적 요소, 턴 카운트 (의도적 설계)
- `/respond`에 `detectedElements`·`utteranceValidity`를 넘기지 않음. `childIntent`와 `mainPoint`만
- 배포 주소·경로는 **미결**. mock으로 선행하고 URL만 교체 → [decisions.md](decisions.md) 미결 U-01
- mock 스텁은 **요청 내용을 보지 않고 고정 JSON만 반환**한다. "존재하지 않는 evidence를 반환하면 해당 요소가 삭제되는지" 같은 케이스는 `AiMockController.java`의 값을 직접 바꿔 재기동해 확인한다 (plan.md Phase 4 완료 조건)
- mock은 `SecurityConfig.PUBLIC_ENDPOINTS`에 있어 **인증이 필요 없다** — 실제 AI 서버도 부모 JWT가 아니라 별도 내부 토큰(`AI_SERVER_INTERNAL_TOKEN`, U-01)으로 인증하므로 같은 성격
- **실 AI 서버로 교체할 때 이 컨트롤러를 지운다** (U-01 확정 시)

---

## 8. 음성 — STT / TTS (C안)

[decisions.md](decisions.md) D-01·D-05에 따라 **OpenAI API를 백엔드가 호출**합니다.
PRD 9.3의 2안이며, api.md 1절 기준과 다릅니다.

| ID | 항목 | 등급 | 비고 |
| --- | --- | --- | --- |
| B-13 | ~~`POST /api/stt` — 오디오 업로드 → 텍스트~~ | 필수 | **완료.** `voice/controller/SttController.java`. `multipart/form-data`. 타임아웃 8초 |
| B-14 | ~~STT 연동~~ | 필수 | **완료.** `voice/client/OpenAiSttClientImpl.java`. `whisper-1`(D-21) → 무음 환각 문제로 `gpt-4o-mini-transcribe`로 교체(D-43, D-42는 대체됨) |
| B-15 | ~~**오디오 즉시 폐기**~~ | 필수 | **완료.** 오디오는 바이트 배열로 메모리에서만 다루고 디스크에 별도로 쓰지 않음 ([PRD 10.3](../../docs/product/prd.md)) |
| B-16 | ~~`GET /api/tts?messageId=` — 오디오 반환~~ | 필수 | **완료.** `voice/controller/TtsController.java`. 캐시 히트 시 즉시, 미스 시 생성 후 저장. `?text=`도 지원(D-26, `messageId` 없는 내레이션/단어 발음용). 둘 다 없으면 400. 캐릭터별 목소리·연기 지시(D-35, 문구 분리·확정 D-36) |
| B-17 | ~~`tts_cache` 저장·조회~~ | 필수 | **완료.** DB(`bytea`). **파일시스템 금지** — Render 재배포 시 초기화됨 |
| B-18 | ~~기동 시 고정 대사 **프리워밍 11건**~~ | 필수 | **완료.** `voice/support/TtsPrewarmRunner.java` (`@Order(2)`, ContentSeeder 다음). 없는 것만 생성 |

### 검증 (2026-08-12)

실 OpenAI 키로 성공 경로까지 curl로 확인했습니다.

- **TTS 캐시 미스→생성**: 캐시에 없는 캐릭터 대사를 요청 → `audio/mpeg` 200, 실제 MP3(57600바이트) 반환
- **TTS 캐시 히트**: 같은 메시지 재요청 → 1.2초→0.02초, 바이트 완전 동일, `tts_cache` 행 추가 안 됨
- **STT 라운드트립**: 위에서 생성한 TTS 오디오를 그대로 `/api/stt`에 업로드 → 원문 "그랬구나, 네 말을…"과 사실상 동일한 텍스트로 복원 (쉼표→마침표 정도 차이)
- **빈 오디오**: 빈 파일 업로드 → OpenAI 호출 없이 `{"text": ""}` 즉시 반환
- **이름 치환된 고정 대사 지연 생성**: `character_opening`(대화1, "민준아…") 같은 이름 포함 메시지를 재생 → 프리워밍 11건에 없던 것이 첫 재생 시 생성돼 `tts_cache`에 추가됨 (D-05 표대로 동작)
- **재기동 시 재프리워밍 안 함**: 서버 재시작 → `TtsPrewarmRunner` 로그에 "신규 생성 0건" (DB에 이미 있어 스킵)
- **인증/소유권**: 다른 보호자 JWT로 조회 시 403 `FORBIDDEN`, 존재하지 않는 `messageId`는 404 `NOT_FOUND`
- **OpenAI 실패 시 무장애**: 크레딧 소진 키로 먼저 검증 — 500 `INTERNAL_ERROR`로만 응답하고 서버는 죽지 않음 (api.md 2.3의 일반 5xx 계약)

**버그 발견·수정 2건** (이 검증 과정에서 발견):
1. `TtsPrewarmRunner`가 예외를 그대로 던지면 `ApplicationRunner` 실패가 `ApplicationContext` 기동
   자체를 막았다. 프리워밍 실패를 항목별로 흡수하도록 고쳐, 외부 API 장애가 서버 부팅을 막지
   않게 했다 (크레딧 소진 키로 기동해 로그로 확인).
2. `MultipartBodyBuilder`로 Whisper에 오디오를 보내면 `NoClassDefFoundError:
   org/reactivestreams/Publisher`가 났다 — 이 클래스가 reactive-streams(WebFlux 전용
   의존성)를 참조하는데 이 프로젝트는 서블릿(MVC) 기반이라 없다. `LinkedMultiValueMap` +
   `ByteArrayResource`로 바꿔 해결했다.

### 요청 분리 (D-02)

```
① POST /api/stt        오디오 → 텍스트          8초
   아이가 화면에서 확인·수정                     ← 요청이 갈리는 지점
② POST /messages       텍스트 → 분석·응답       10초
③ GET  /api/tts        대사 → 오디오
```

**한 요청에 합치면 안 됩니다.** [PRD F-05](../../docs/product/prd.md)가 *"변환된 텍스트를 화면에 표시 → 보내기 버튼을 눌러 제출"* 을 요구하므로, 확인 단계가 두 요청 사이에 들어갑니다.

### 프리워밍이 11건인 이유

고정 대사는 13건(`character_opening` 4 + `character_closing` 4 + 도입·전개 내레이션 5)이지만,
**대화1·대화4의 `character_opening` 2건은 아이 이름이 들어가** 아이마다 텍스트가 달라집니다.
이 2건은 미리 만들 수 없으므로 첫 재생 시 생성해 캐시에 넣습니다. (D-04)

### 부수 효과

- **Q-09(빈 발화) 자동 해소** — STT 결과가 비면 ①에서 끝나고 ②를 호출하지 않음. `messages`에 빈 `text`가 들어갈 경로가 없어짐 ([PRD 8.9](../../docs/product/prd.md) 준수)
- 프론트의 D-5 키워드 **실시간** 점등은 불가 (interim result 없음) → 최종 결과 일괄 점등으로 폴백

---

## 9. 미션

| ID | 항목 | 등급 | 조건 위치 |
| --- | --- | --- | --- |
| M-47 | ~~미션1 노출 조건 판정~~ | 필수 | [PRD 7.6](../../docs/product/prd.md) **4개 조건 전부 구현** (D-20). 주최측 확정으로 "장면 종료 직전 턴엔 무조건 노출" 안전장치 추가 (D-29) |
| M-48 | ~~미션2 노출 시점 판정~~ | 필수 | [PRD 7.6](../../docs/product/prd.md) — `PERSPECTIVE` 누적 시점. 원래 `PERSPECTIVE`+`REASON`(D-20)이었으나 장면9엔 REASON이 없어 한 번도 트리거된 적 없던 조건이었음 → `PERSPECTIVE` 단독으로 정정 (D-28). 주최측이 "항상 노출"로 확정한 뒤, GOAL_MET 조기 종료가 미션 판정을 건너뛸 수 있던 경쟁 조건을 없애고 강제 노출 턴 추가 (D-29) |
| M-49 | ~~노출 기록 `speaker_type = system` 메시지~~ | 필수 | 중복 노출 방지 ([PRD I-07](../../docs/product/prd.md)) — **완료.** curl로 재노출 안 됨 확인 |
| — | ~~미션 체크리스트 항목 단위 진행 (`missionProgress`)~~ | 선택(프론트 요청) | [request/backend/mission-progress.md](../../docs/request/backend/mission-progress.md) — **완료.** `session/engine/MissionProgressCalculator.java` (D-30) |

### 주의

- **노출 시점은 백엔드가 결정합니다. AI가 정하지 않습니다** ([roles.md 3.7](../../docs/team/roles.md))
- 미션 정의(제목·체크리스트)는 **코드 상수.** 별도 테이블을 만들지 않음 — `story/constant/Missions.java`
- 다음 턴에 해당 `scene_id`에 system 메시지가 있으면 재노출하지 않음
- system 메시지는 대화 히스토리 응답에 **표시하지 않음**
- 응답 필드 `missionTriggered` 형태: [api.md 3.5](../../docs/spec/api.md)
- **"구체적인가"를 미션 로직이 새로 판정하지 않는다.** `element_criteria` 통과 여부(= `detectedElements` 포함 여부)가 이미 그 판정이다. `childIntent`와 누적 요소의 차이가 곧 "방향은 말했지만 구체적이지 않음" — D-20
- 조건 1은 `childIntent == SOLUTION`만으로 판정하지 않는다. **"방귀" 키워드 대조가 함께 필요** — 없으면 장대·사다리 제안에도 미션1이 뜬다
- 남는 리스크는 AI 계약이 아니라 `element_criteria` 튜닝이다 (PRD 7.5.4 검증에 포함)

---

## 10. 말하기 후 활동

| ID | 항목 | 등급 | 엔드포인트 |
| --- | --- | --- | --- |
| — | ~~카드 조회 (셔플 고정)~~ | 필수 | `GET /api/sessions/{id}/activity` — **완료** |
| M-53 | ~~**정답 판정 서버 계산**~~ | 필수 | `POST /api/sessions/{id}/activity/order` — **완료.** `slotResults`(칸별 정오) 추가 (선택, 프론트 요청 — D-32) |
| M-54 | ~~정답 시 `retellingKeywords` 응답~~ | 필수 | 〃 — **완료** |
| B-19 | ~~**재시도 3회 제한**~~ | 필수 | 3회째에 `correctOrder` 공개 (D-10) — **완료** |
| — | ~~재구성 발화 수신~~ | 필수 | `POST /api/sessions/{id}/activity/retelling` — **완료.** `earnedStarDust` 추가 (선택, 프론트 요청 — D-33) |
| M-56 | ~~`post_activity_results` 저장~~ | 필수 | 세션당 1건 — **완료** |
| M-57 | ~~세션 완료 처리 (`status = completed`)~~ | 필수 | **완료** |
| B-20 | ~~별가루 지급 +100~~ | 선택-후순위 | **완료** (Phase 7 착수). 완료 시 `children.star_dust` +100 (D-09). 이미 `completed`인 세션에 재요청하면 건너뜀 |

스키마: [api.md 3.6](../../docs/spec/api.md) · 정답 순서는 [PRD 7.8](../../docs/product/prd.md) `post_activity_config`

구현: `activity/{controller,service,dto}`. `PostActivityResult`·`PostActivityConfig`·`PostActivityCard`는
이미 있던 엔티티를 그대로 썼다.

### 검증 (2026-08-12)

세션 2건을 인트로부터 대화4까지 실제로 완주시켜(각 대화 장면 `max_turns`만큼 발화 전송 →
`CLOSING` 강제) `POST_ACTIVITY` 상태까지 도달한 뒤 curl로 확인했다.

- **셔플 고정**: `GET /activity`를 두 번 호출해도 카드 순서가 동일함을 확인
- **오답 응답 형태**: `{"isCorrect":false,"attemptCount":1}` — `correctOrder`·`retellingKeywords` 키 자체가 없음(생략, null 아님)이 api.md 예시와 정확히 일치
- **정답(3회째) 응답 형태**: `{"isCorrect":true,"attemptCount":3,"retellingKeywords":[...]}` — `correctOrder` 없음
- **3회 오답 응답 형태**: `{"isCorrect":false,"attemptCount":3,"correctOrder":[...],"retellingKeywords":[...]}` — 둘 다 실림
- **정직한 기록**: 3회 오답으로 "통과"한 세션의 DB를 직접 조회 — `attempt_count=3`, `is_order_correct=f`로 정확히 저장됨 (화면에는 실패를 안 보여주지만 기록은 사실대로)
- **재구성 발화 → 세션 완료**: `POST .../retelling` 응답 `sessionStatus:"completed"`, DB `story_sessions.status=COMPLETED` 확인. `stats.childUtteranceCount`가 실제 보낸 발화 수(4+5+5+4=18)와 정확히 일치, `characterCount`는 세션에서 실제 만난 캐릭터 수(며느리·시아버지·마을이장=3)와 일치
- **인증/소유권**: 다른 보호자 JWT로 조회 시 403 `FORBIDDEN`, 존재하지 않는 `sessionId`는 404 `NOT_FOUND`

### 주의

- **프론트 판정을 허용하지 않습니다** ([PRD 8.11](../../docs/product/prd.md))
- **셔플 순서를 서버가 고정해 내려줍니다.** 세션 id를 시드로 매번 같은 순서를 재현한다 — 별도 컬럼에 저장하지 않음
- 3회 실패로 통과시켜도 `is_order_correct = false`로 저장. 기록은 사실대로 남기되 **아이 화면에는 실패를 표시하지 않음** (화면 명세 D-3 원칙)
- `correctOrder`는 **처음에는 내려주지 않음.** 3회째에만 실어 보냄. `retellingKeywords`도 정답이거나 3회째일 때만 응답에 실림 — api.md 예시가 필드를 `null`이 아니라 **생략**으로 표현하므로 `@JsonInclude(NON_NULL)`을 씀
- `imageUrl`은 아직 항상 `null` — 카드 이미지 에셋 미수령(U-03)
- `newWordCount`는 항상 0 — 단어장(wordbook)은 이제 있지만(O-06~O-10, D-22) `word_book` 항목이
  "이 세션에서" 저장됐는지 구분할 세션 참조가 없어(child_id·source_scene_id만 있음) 집계 기준을
  아직 안 정했다. 새로 미결로 남긴 것 — 나중에 필요해지면 그때 확인
- `reportAvailable`은 이제 세션 완료 시 `true` — 보호자 리포트(O-01~O-05) 구현 완료 (D-24)
- **B-20 (별가루)**: 지급 지점은 `ActivityServiceImpl.submitRetelling` 한 곳뿐이다. 세션이
  이미 `COMPLETED`면 `session.complete()`는 다시 호출해도 무해하지만 별가루는 건너뛴다 —
  같은 세션에 재구성 발화를 실수로 두 번 보내도 중복 지급되지 않는다. 이미 완료된 세션에
  재요청 → `star_dust` 불변, 새 세션 완료 → `star_dust` +100을 둘 다 curl+DB로 확인했다

---

## 11. 운영 · 배포

| ID | 항목 | 등급 | 비고 |
| --- | --- | --- | --- |
| M-59 | ~~Render 배포 (무료 티어)~~ | 필수-기반 | **완료.** `good-question` 서비스, `https://good-question-7yyt.onrender.com` |
| B-21 | ~~Supabase Postgres 연결~~ | 필수-기반 | **완료.** 로컬은 Docker Compose → [setup.md](setup.md). 배포는 Supabase **Session Pooler** — direct connection(`db.<ref>.supabase.co`)은 IPv6 전용이라 Render에서 연결 불가, `aws-0-<region>.pooler.supabase.com:5432` 사용 |
| B-22 | ~~헬스체크 엔드포인트 (`SELECT 1` 포함)~~ | 필수-기반 | **완료.** `health/controller/HealthController.java`, `GET /api/health`, 인증 불필요. Render 슬립 + Supabase 일시정지 동시 방어 |
| B-23 | ~~외부 크론 10분 핑 설정~~ | 필수-기반 | [open-questions Q-14](../../docs/open-questions.md) 권고. **완료.** cron-job.org, `GET /api/health` 10분 간격 |
| B-24 | ~~CORS 설정 (Vercel 오리진)~~ | 필수-기반 | **완료** (Phase 2) |

### 검증 — B-22 (2026-08-12)

- 정상: `GET /api/health` → `{"status":"ok"}` 200, 인증 없이 호출됨
- 에러: 로컬 Postgres 컨테이너를 `docker stop`으로 잠깐 내린 뒤 호출 → `{"status":"down"}` 503. 컨테이너 복구 후 다시 200으로 돌아옴 (HikariCP 재연결 확인)

### 검증 — M-59·B-21 (2026-08-13)

- 정상: Render `good-question` 서비스 배포 → `GET https://good-question-7yyt.onrender.com/api/health` → `{"status":"ok"}` 200. JPA `ddl-auto=update`로 테이블 12개 자동 생성, 시드·TTS 프리워밍 정상 실행
- 에러 케이스로 확인됨(진행 중 실제로 발생): DB URL이 로컬 기본값으로 남아 `Connection to localhost:5432 refused` → Supabase 접속 정보로 교체. 이어서 direct connection 사용 시 `The connection attempt failed`(IPv6 미지원) → Session Pooler로 교체 후 해결
- Supabase 보안 advisor: 12개 테이블 모두 RLS 비활성(critical) 확인 → 정책 없이 RLS만 활성화(백엔드는 `postgres` 계정 직접 접속이라 BYPASSRLS, 영향 없음). 적용 후 재확인 → critical 해소, INFO 수준(정책 없음)만 남음

### 검증 — B-23 (2026-08-13)

- 1차 시도: GitHub Actions `schedule` 트리거(`.github/workflows/keep-alive.yml`, `*/10 * * * *`)로 구현 → **실측으로 불안정함을 확인하고 폐기.** 등록 후 첫 자동 실행까지 1시간 11분, 그 뒤 41분(10분 주기면 4회 기대)간 0회 — YAML·권한·fork 여부 전부 정상이라 GitHub `schedule` 트리거 자체의 알려진 한계(부하 시 지연·스킵)로 판단. 워크플로우 파일은 백업으로 남겨둠(비용 없음)
- 2차: **cron-job.org**로 전환(사용자가 직접 가입·등록, 10분 간격 `GET /api/health`). 검증: 마지막 GitHub Actions 실행(15:31, 콜드스타트) 이후 71분간 GitHub Actions는 0회였는데도 16:44 요청이 0.78초(콜드스타트 아님)로 응답 → 그 사이 cron-job.org가 슬립을 막았음을 타이밍으로 확인. cron-job.org 자체 실행 로그(16:50 응답)의 `x-render-origin-server: Render`·`rndr-id` 헤더로 실제 배포 서버가 응답했음을 재확인

---

## 12. 선택 — 후순위

**필수 항목을 전부 끝낸 뒤** 착수합니다.

| ID | 항목 | 근거 | 비고 |
| --- | --- | --- | --- |
| B-20 | ~~별가루 (`star_dust`)~~ | **요건 외 팀 추가** (D-09) | **완료.** 이야기 완료 시 +100. 사용처·차감 없음 |
| O-06~O-10 | ~~단어장 (`wordbook` + API 3개)~~ | 주최측 추가 요건 A-02 | **완료.** `GET`/`POST`/`PATCH /api/wordbook` (D-11, D-22) |
| O-01~O-05 | ~~보호자 리포트 + `reports` 테이블~~ | 주최측 추가 요건 A-01 | **완료** (D-24) |

### 보호자 리포트 구현 (2026-08-12)

**근거 자료 3종** (추론 없이 이것만 따랐다):
[리포트 가이드](../../docs/reference/guardian-report-guide.md) (주최측 원문, 평가 기준),
`frontend/src/lib/api/types.ts`(응답 타입 3종 — [api.md 3.8](../../docs/spec/api.md)에 그대로 옮김),
`frontend/src/lib/api/mock-parent.ts` + `frontend/src/lib/thinking-elements.ts`(계산 로직·문구, 프론트가 이미 구현).

**엔드포인트 3개** — `parent/{controller,service,dto,entity,repository,report}` 신규 (기존 `parent`
패키지에는 Parent 엔티티만 있었음):

| 엔드포인트 | 화면 | 상태 |
| --- | --- | --- |
| `GET /api/parent/summary?childId=` | A-6 | **완료** |
| `GET /api/parent/reports?childId=` | G-1 | **완료** |
| `GET /api/parent/reports/{sessionId}` | G-2~G-4 | **완료.** 저장된 `Report` 행을 그대로 반환 |

**저장 시점**: 세션 완료(M-57, `ActivityServiceImpl.submitRetelling`) 시 1회 생성. 사용자
확인 후 "조회 시점마다 재계산" 대신 **저장 방식**으로 결정 (D-24) — PRD 8.12 원안과 일치,
계산 로직이 나중에 바뀌어도 기존 리포트는 그대로 남는다.

**계산 로직**은 `parent/report/ReportGenerator.java`에 순수 함수로 분리하고 (session/engine과
같은 원칙) `mock-parent.ts`를 그대로 포팅했다 — 새로 설계하지 않았다. 단위 테스트 18건
(`ReportGeneratorTest`).

**AI 호출 없음.** 근거는 이미 저장된 `utterance_analyses.detected_elements`뿐이고, 문구도
역량별 고정 텍스트(있음/없음 두 버전)를 조건에 따라 골라 쓴다.

**검증**: 세션을 대화4까지 완주 → `POST .../retelling` → `reports` 테이블에 행 생성,
응답 `reportAvailable: true` 확인 (기존에 항상 `false`였던 것을 이번에 바꿈). 3개 GET
엔드포인트 전부 curl로 응답 형태 확인. 완료 전 세션의 리포트 조회 → 404, 다른 보호자
접근 → 403, 존재하지 않는 `childId` → 404.
| O-13 | ~~NORMAL soft-cue~~ | [PRD 6.14](../../docs/product/prd.md) | **완료.** `session/engine/GuidanceSelector.selectForTurn()` (D-23) |
| O-12 | ~~캐릭터 마음 변화 — `characterState` 필드~~ | 주최측 추가 요건 A-03 | **완료 (D-41).** AI가 판단해 주기로 했던 D-27을 뒤집어, `reactionKey` 기반 백엔드 고정 매핑으로 전환. 이미지 자체는 미도착 — [request/ai/story-image-assets.md](../../docs/request/ai/story-image-assets.md) 대기 |
| O-14 | `analysis_versions` | 확장 테이블 | 문자열 `mvp_v1` 저장으로 대체 가능 |

### O-12 캐릭터 마음 변화 — `characterState` 필드 (2026-08-13, D-41로 방식 변경)

PRD 담당이 원래 "프론트·AI"로만 적혀 있어 백엔드 문서에 추적된 적이 없었다(D-25
마이페이지와 같은 종류의 누락). 처음엔 AI가 대사에 맞춰 직접 판단해 주는 방식(D-27)으로
배관했으나, AI 파트가 `/respond` 계약을 `{ "text": "..." }` 하나로 확정하면서 그 값을
절대 안 주기로 했다 — `reactionKey` 기반 백엔드 고정 매핑으로 전환했다(D-41).

- `message/enums/CharacterState.java` — `NEUTRAL`/`HAPPY`/`WORRIED`/`SURPRISED`/`MOVED` 5종 고정
- `session/engine/CharacterStateMapper.java` — `/respond` 호출 전 이미 계산해 둔 `reactionKey`
  (+ 신규 사고요소 감지 여부)로 매핑. AI 응답은 더 이상 이 값에 관여하지 않는다
- `MessageCreateResponse.characterState` — `CLOSING`·`/respond` 실패 폴백(D-40)에서는 여전히 `null`
- `RespondAiResult`·`AiRespondClientImpl`·`AiMockController`의 `characterState` 파싱 코드는
  삭제 — AI가 그 필드를 절대 안 보내므로 항상 `null`만 나오던 죽은 코드였다

**검증**: `CharacterStateMapperTest` 8건 + 전체 빌드 106/106 통과.

**남은 일**: 캐릭터 상태별 이미지(3명×5상태=15장) 도착 후 프론트가 이 값으로 이미지를
바꾸는 작업. 이 문서 범위 밖.

### NORMAL soft-cue 구현 (2026-08-12)

work-items.md에 "새 필드 불필요"라고만 적혀 있어 사실상 스킵 대상처럼 방치돼 있었다.
PRD 6.14·api.md 4.2를 다시 읽어 "새 필드가 없다 = 기존 `guidanceTarget`/`remainingWorry`를
`responseMode: NORMAL`에도 함께 보내면 된다"는 뜻임을 확인하고 구현했다 (D-23).

- `GuidanceSelector.selectForTurn(mode, reactionKey, missing, hasNewlyAccumulatedElement, previousGuidanceTarget)`
  — GUIDED면 항상, NORMAL이면 "신규 요소 확인 + missing 남음 + 반응이 장난·질문·불명확이
  아님"일 때만 유도 대상을 고른다
- `ProgressJudge`의 강한 유도 제한(신규 요소 확인 시 NORMAL 강제)이 만드는 턴이 정확히
  soft-cue 조건과 겹친다 — 두 규칙이 맞물리도록 설계돼 있었다
- `story_sessions.last_guidance_target`은 원래부터 "GUIDED 또는 soft-cue 대상"으로 정의된
  컬럼이라 스키마 변경 없음

**검증**: mock으로 신규 요소가 잡히는 턴을 재현 → 응답 `responseMode: "normal"`이면서
DB `last_guidance_target`이 채워짐을 확인. `GuidanceSelectorTest`에 단위 테스트 6건 추가
(GUIDED 항상 선택 / NORMAL+조건 충족 / 신규요소 없음 / missing 없음 / 스킵 반응 3종 /
CLOSING).

### 단어장 구현 (2026-08-12)

- `wordbook/{entity,repository,service,controller,dto}` 신규. `highlightWords`가 채워지게
  되면서(아래) 진입점이 생겨 후순위에서 착수로 전환했다 (D-22)
- `story/constant/HighlightWords.java` — 장면별 밑줄 단어 후보 1개씩. `MessageServiceImpl`이
  이번 턴 캐릭터 응답 텍스트에 후보가 **실제로 포함될 때만** `highlightWords`에 담는다
- `GET /api/wordbook?childId=&filter=` — `filter`는 `all`/`liked`/`story:{storyId}`.
  `total`은 필터 적용 전 전체 개수 (api.md 3.7)
- `sceneIndex`는 D-12와 같은 식(`scene_order / 2`)으로 변환. `isNew`는 저장 후 24시간 기준
- `contextSentence`는 `POST /api/wordbook` 요청에서 선택 필드로 받아 그대로 저장 (D-22)

**검증**: `POST /api/sessions/{id}/messages`로 대화4 마지막 턴(CLOSING)을 완주해
`highlightWords: [{"word":"부끄러워", ...}]`가 실제로 응답에 실림을 확인 → 그 값을
`POST /api/wordbook`으로 저장 → `GET ...?filter=all/liked/story:{id}` 3가지 전부 확인 →
`PATCH .../{id}` `{liked:true}` → `filter=liked`에 나타남을 확인. 다른 보호자 토큰으로
조회·수정 시 403, 없는 `childId`는 404, 잘못된 `filter` 값은 400 확인

### 미구현으로 두는 것

| 항목 | 이유 |
| --- | --- |
| 구글·네이버 로그인 | 요건은 "1개 이상". 카카오로 충족 (D-06) |
| 결제 | [PRD 2.3](../../docs/product/prd.md) MVP 범위 밖 |
| 힌트 기능 | [PRD 5.4](../../docs/product/prd.md) MVP 범위 밖. GUIDED가 같은 역할 |

---

## 13. 마이페이지 (F-1)

| ID | 항목 | 등급 | 엔드포인트 |
| --- | --- | --- | --- |
| — | ~~아이 마이페이지~~ | api.md에 "(선택) ⚪"로 표기 | `GET /api/mypage?childId=` — **완료.** `child.starDust` 추가 (선택, 프론트 요청 — D-33) |

api.md 3.9에 스펙까지 있었는데 어느 Phase 표에도 걸리지 않아 놓치고 있던 것을 문서 전체
점검(2026-08-12) 중 발견했다. `screens.md` F-1이 이미 "✅ 구현"으로 표시돼 있어 프론트가
이 화면을 이미 만들어 뒀다는 것도 함께 확인했다 — 다만 이 엔드포인트 없이 다른 기존
엔드포인트를 조합해 그리고 있어서 프론트가 막혀 있진 않았다.

`mypage/{controller,service,dto}` 신규. 계산 로직은 프론트 mock(`mock-content.ts`
`getMypage()`)을 그대로 포팅했다 — 새로 설계하지 않았다.

| 값 | 계산 |
| --- | --- |
| `stats.completedStories` | `status = COMPLETED` 세션 수 |
| `stats.savedWords` | 이 아이의 `wordbook` 전체 개수 (필터 없음) |
| `stats.activeDays` | 이 아이의 **모든** 세션의 **모든** 메시지(화자 무관) `created_at`을 날짜(YYYY-MM-DD)로 뭉친 distinct 개수 — mock과 동일 기준 |
| `completedStories[]` | 완료 세션마다 1건. `completedAt`은 항상 값이 있음(완료 세션이므로) |
| `retellings[]` | `post_activity_results.retelling_text`가 있는 세션마다 1건(완료 여부 무관) |

`completedAt`/`createdAt`은 리포트(api.md 3.8)와 달리 **가공하지 않은 `Instant`** 그대로
내려간다 — 프론트 mock도 이 값들만은 `formatDate()`를 거치지 않는다.

**검증**: 완료 세션 2건·저장 단어 1건이 있는 아이로 조회 → `completedStories:2`,
`savedWords:1`, `activeDays:1`, 목록 2건 전부 확인. 활동이 전혀 없는 아이로 조회 →
전부 0/빈 배열로 에러 없이 응답. 다른 보호자 접근 → 403, 없는 `childId` → 404.
