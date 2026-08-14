# 이야기 정적 이미지·캐릭터 표정 표시 요청

- **요청자**: AI 파트
- **작성일**: 2026-08-12
- **우선순위**: 필수

## 배경

이야기 장면, 캐릭터 표정, 미션 이미지는 대화 중 실시간 생성하지 않는다. 제공·제작된 PNG를
정적 에셋으로 두고 장면과 캐릭터 상태에 따라 교체해야 비용·대기 시간·예측 불가한 결과 없이
안정적으로 시연할 수 있다.

AI 서버는 이미지 생성·편집·선택을 하지 않는다. `/respond`의 `characterState`는 생성 지시나
파일 경로가 아니라, 미리 정한 다섯 표정 중 하나를 고르는 enum이다.

## 화면 / 경로

| 화면명 | 경로 | 설명 |
| --- | --- | --- |
| 이야기 도입·전개·대화 | `/play` | `backgroundImageUrl`, `characterImageUrl`로 사전 제작 에셋 표시 |
| 미션 1·2 | `/play` 내 인라인 영역 | 목적에 맞게 미리 만든 미션 이미지 표시 |

## 사용자 흐름

1. 백엔드가 현재 장면의 정적 배경·캐릭터 이미지 URL과, `NORMAL`/`GUIDED` 응답의
   `characterState`를 내려준다.
2. 프론트는 URL이 있으면 해당 PNG를 표시하고, 없으면 현재의 안전한 플레이스홀더를 표시한다.
3. 캐릭터 대화 상태가 바뀌면 미리 준비한 표정 이미지로만 교체한다.
4. 미션 노출 신호가 오면 대화 영역 안에서 미리 준비한 미션 이미지를 보여 준다.

## 요구사항

- 이미지를 대화 중 생성하거나 외부 이미지 생성 API에 호출하지 않는다.
- `backgroundImageUrl`, `characterImageUrl`은 고정 파일 URL 또는 프론트 정적 경로만 사용한다.
- 표정 상태의 파일 매핑은 프론트/백엔드가 고정 목록으로 관리한다. AI 응답 텍스트를 파일 경로로 사용하지 않는다.
- 허용 상태는 `NEUTRAL`, `HAPPY`, `WORRIED`, `SURPRISED`, `MOVED`뿐이다. 알 수 없거나
  누락된 값은 현재 표정(첫 표시라면 `NEUTRAL`)을 유지한다.
- 미션1은 “안전하게 배를 떨어뜨릴 방법 구성”, 미션2는 “특징을 장점·가능성으로 다시 말하기” 목적을 유지한다. 카드 문구와 삽화는 사전 제작본으로 교체할 수 있다.
- 미션은 아이가 먼저 생각을 말한 뒤 서버의 노출 신호로 표시한다.

## 상태별 처리

| 상태 | 화면 처리 |
| --- | --- |
| URL 있음 | 정적 PNG를 `object-fit: cover`로 표시 |
| URL 없음 | 기존 플레이스홀더를 유지하고 흐름을 막지 않음 |
| 이미지 로드 실패 | 플레이스홀더로 대체하고 대화·미션 진행은 계속 |

## 제공된 정적 에셋

모든 파일은 `frontend/public/story-assets/banggui/`에 있으며 브라우저 경로는
`/story-assets/banggui/<파일명>`이다.

| 용도 | 파일 |
| --- | --- |
| 표지 | `cover_banggui.webp` |
| 장면 배경 | `sc_banggui_01.webp`, `sc_banggui_02.webp`, `sc_banggui_04.webp`, `sc_banggui_06.webp`, `sc_banggui_08.webp` |
| 미션 1 | `mission_banggui_01_safe-plan.webp` |
| 미션 2 카드 | `mission_banggui_02_loud-friend.webp`, `mission_banggui_02_curious-friend.webp`, `mission_banggui_02_strong-friend.webp`, `mission_banggui_02_quiet-friend.webp` |
| 캐릭터 표정 | `ch_banggui_{daughter_in_law|father_in_law|village_chief}_{NEUTRAL|HAPPY|WORRIED|SURPRISED|MOVED}.png` |

- 배경은 1280×800 WebP(각 300KB 이하), 표지는 1440×1080 WebP, 초상은 투명 320×320 PNG다.
- 기존 원본 PNG가 저장소에는 없으므로, 같은 파일명을 유지한 교체본을 받으면 프론트 연결 코드를
  바꾸지 않고 교체할 수 있다.

## 연동 API

| 메서드 | 경로 | 용도 |
| --- | --- | --- |
| 백엔드 계약 기준 | 현재 장면 조회/발화 제출 응답 | `backgroundImageUrl`, `characterImageUrl`, `missionRevealed`, `characterState` 수신 |

## 완료 조건

- [ ] 이야기·미션 화면이 이미지 생성 API 없이 사전 제작 에셋만 사용한다.
- [ ] 캐릭터 표정 전환이 정적 파일 매핑으로 동작한다.
- [ ] 이미지가 없거나 실패해도 아이 대화 흐름이 멈추지 않는다.
