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
| M-08 | ~~진행 중 이야기 · 이어하기~~ | 필수 | `GET /api/home?childId=` — **완료** |
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
| — | ~~세션 조회 (이어하기 복원)~~ | 필수 | `GET /api/sessions/{sessionId}` — **완료** |
| M-46 | ~~장면 전환 처리 (intro/narrative → 다음)~~ | 필수 | `POST /api/sessions/{id}/scenes/{sceneId}/complete` — **완료** |
| — | 이야기 나가기 | 선택 | `PATCH /api/sessions/{sessionId}` — 미착수 |
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
| M-41 | ~~GUIDED 유도 대상 선택 + 재료 구성~~ | 필수 | [PRD 6.9 · 6.15](../../docs/product/prd.md) — **완료.** `session/engine/GuidanceSelector.java` |
| M-42 | ~~캐릭터 응답 LLM 호출~~ | 필수 | [PRD 6.12](../../docs/product/prd.md) — **완료** |
| M-43 | ~~`CLOSING` 시 고정 마지막 대사 재생~~ | 필수 | [PRD I-01](../../docs/product/prd.md) — **완료** |
| M-44 | ~~`story_sessions` 상태 갱신 (턴 단위)~~ | 필수 | [PRD 8.8](../../docs/product/prd.md) — **완료.** `StorySession.recordTurnResult()`·`closeScene()` |
| M-45 | ~~`utterance_analyses` 저장~~ | 필수 | [PRD 8.10](../../docs/product/prd.md) — **완료** |
| M-47~M-49 | ~~미션 노출 판정 + system 메시지~~ | 필수 | [PRD 7.6](../../docs/product/prd.md) — **완료.** `session/engine/MissionTrigger.java` (D-20, 조작화 근거 참조) |
| B-12 | ~~AI 실패 폴백~~ | 필수 | `/analyze` 실패→빈 분석 진행, `/respond` 실패→`character_closing`으로 강제 종료. **완료** |

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

---

## 7. AI 서버 연동

| ID | 항목 | 등급 | 비고 |
| --- | --- | --- | --- |
| B-09 | ~~`POST /analyze` 클라이언트~~ | 필수 | 타임아웃 5초 · 재시도 0회 — **완료.** `message/service/ai/AiAnalyzeClientImpl.java` |
| B-10 | ~~`POST /respond` 클라이언트~~ | 필수 | 타임아웃 5초 · 재시도 0회 — **완료.** `message/service/ai/AiRespondClientImpl.java` |
| B-11 | ~~**AI 서버 mock 스텁**~~ | 필수-기반 | `aimock/AiMockController.java` — `POST /api/mock-ai/analyze`·`/respond`, 고정 JSON, 인증 불필요. **완료** |
| B-12 | 실패 폴백 처리 | 필수 | 아래 표 — 미착수 |

계약: [api.md 4.1 · 4.2](../../docs/spec/api.md)

### 실패 시 동작 (D-03)

| 실패 지점 | 동작 |
| --- | --- |
| `/analyze` | 빈 분석(`detectedElements: []`, `utteranceValidity: UNCLEAR`)으로 **정상 진행.** `/respond`는 호출됨. 아이는 아무것도 못 느낌 |
| `/respond` | `character_closing`을 조회해 **장면 종료.** 다음 장면으로 넘김 |

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
| B-14 | ~~Whisper 연동~~ | 필수 | **완료.** `voice/client/OpenAiSttClientImpl.java` (`whisper-1`, D-21) |
| B-15 | ~~**오디오 즉시 폐기**~~ | 필수 | **완료.** 오디오는 바이트 배열로 메모리에서만 다루고 디스크에 별도로 쓰지 않음 ([PRD 10.3](../../docs/product/prd.md)) |
| B-16 | ~~`GET /api/tts?messageId=` — 오디오 반환~~ | 필수 | **완료.** `voice/controller/TtsController.java`. 캐시 히트 시 즉시, 미스 시 생성 후 저장 |
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
| M-47 | ~~미션1 노출 조건 판정~~ | 필수 | [PRD 7.6](../../docs/product/prd.md) **4개 조건 전부 구현** (D-20) |
| M-48 | ~~미션2 노출 시점 판정~~ | 필수 | [PRD 7.6](../../docs/product/prd.md) — `PERSPECTIVE`+`REASON` 누적 시점 (D-20) |
| M-49 | ~~노출 기록 `speaker_type = system` 메시지~~ | 필수 | 중복 노출 방지 ([PRD I-07](../../docs/product/prd.md)) — **완료.** curl로 재노출 안 됨 확인 |

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
| M-53 | ~~**정답 판정 서버 계산**~~ | 필수 | `POST /api/sessions/{id}/activity/order` — **완료** |
| M-54 | ~~정답 시 `retellingKeywords` 응답~~ | 필수 | 〃 — **완료** |
| B-19 | ~~**재시도 3회 제한**~~ | 필수 | 3회째에 `correctOrder` 공개 (D-10) — **완료** |
| — | ~~재구성 발화 수신~~ | 필수 | `POST /api/sessions/{id}/activity/retelling` — **완료** |
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
- `newWordCount`는 항상 0 — 단어장(wordbook)이 선택-후순위라 아직 없음
- `reportAvailable`은 항상 `false` — 보호자 리포트(O-01)가 선택 항목이라 아직 없음
- **B-20 (별가루)**: 지급 지점은 `ActivityServiceImpl.submitRetelling` 한 곳뿐이다. 세션이
  이미 `COMPLETED`면 `session.complete()`는 다시 호출해도 무해하지만 별가루는 건너뛴다 —
  같은 세션에 재구성 발화를 실수로 두 번 보내도 중복 지급되지 않는다. 이미 완료된 세션에
  재요청 → `star_dust` 불변, 새 세션 완료 → `star_dust` +100을 둘 다 curl+DB로 확인했다

---

## 11. 운영 · 배포

| ID | 항목 | 등급 | 비고 |
| --- | --- | --- | --- |
| M-59 | Render 배포 (무료 티어) | 필수-기반 | 미착수 — Render 계정 필요 |
| B-21 | Supabase Postgres 연결 | 필수-기반 | 로컬은 Docker Compose → [setup.md](setup.md). 미착수 — Supabase 계정 필요 |
| B-22 | ~~헬스체크 엔드포인트 (`SELECT 1` 포함)~~ | 필수-기반 | **완료.** `health/controller/HealthController.java`, `GET /api/health`, 인증 불필요. Render 슬립 + Supabase 일시정지 동시 방어 |
| B-23 | 외부 크론 10분 핑 설정 | 필수-기반 | [open-questions Q-14](../../docs/open-questions.md) 권고. 미착수 — 배포 URL 확정 후 설정 |
| B-24 | ~~CORS 설정 (Vercel 오리진)~~ | 필수-기반 | **완료** (Phase 2) |

### 검증 — B-22 (2026-08-12)

- 정상: `GET /api/health` → `{"status":"ok"}` 200, 인증 없이 호출됨
- 에러: 로컬 Postgres 컨테이너를 `docker stop`으로 잠깐 내린 뒤 호출 → `{"status":"down"}` 503. 컨테이너 복구 후 다시 200으로 돌아옴 (HikariCP 재연결 확인)

### 주의

- **B-23·M-59·B-21은 배포 계정(Render·Supabase)이 있어야 진행 가능** — 로컬 작업만으로 끝낼 수 없어 사용자 확인 대기

---

## 12. 선택 — 후순위

**필수 항목을 전부 끝낸 뒤** 착수합니다.

| ID | 항목 | 근거 | 비고 |
| --- | --- | --- | --- |
| B-20 | ~~별가루 (`star_dust`)~~ | **요건 외 팀 추가** (D-09) | **완료.** 이야기 완료 시 +100. 사용처·차감 없음 |
| O-06~O-10 | 단어장 (`wordbook` + API 3개) | 주최측 추가 요건 A-02 | `GET`/`POST`/`PATCH /api/wordbook` (D-11) |
| O-01~O-05 | 보호자 리포트 + `reports` 테이블 | 주최측 추가 요건 A-01 | 응답 스키마 미결. 내부 분석 태그를 보호자 화면에 노출 금지 |
| O-13 | NORMAL soft-cue | [PRD 6.14](../../docs/product/prd.md) | 미구현 시 NORMAL 일반 반응으로 동작. **새 필드 불필요** |
| O-14 | `analysis_versions` | 확장 테이블 | 문자열 `mvp_v1` 저장으로 대체 가능 |

### 미구현으로 두는 것

| 항목 | 이유 |
| --- | --- |
| `highlightWords` 실제 값 | 밑줄 단어 선정 기준이 어느 문서에도 없음. **빈 배열 `[]`로 응답** (D-11) |
| 구글·네이버 로그인 | 요건은 "1개 이상". 카카오로 충족 (D-06) |
| 결제 | [PRD 2.3](../../docs/product/prd.md) MVP 범위 밖 |
| 힌트 기능 | [PRD 5.4](../../docs/product/prd.md) MVP 범위 밖. GUIDED가 같은 역할 |
