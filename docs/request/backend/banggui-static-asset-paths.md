# 방귀 뀌는 며느리 정적 에셋 경로 연결 요청

- **요청자**: AI 파트
- **작성일**: 2026-08-14
- **우선순위**: 필수
- **관련**: [이야기 이미지 에셋 요청](../ai/story-image-assets.md), [정적 이미지 표시 요청](../frontend/static-visual-assets.md)

## 배경

대화 중 이미지를 생성하지 않고, 제작이 끝난 정적 에셋을 사용한다. 파일은 프론트 저장소의
`frontend/public/story-assets/banggui/`에 있으며 브라우저에서는
`/story-assets/banggui/<파일명>`으로 제공된다.

## 요구사항

`story_scenes.background_image_url`에 아래 상대 경로를 저장·반환한다. 프론트가 별도 호스트 변환 없이
같은 배포 도메인에서 읽을 수 있도록 전체 URL이 아니라 상대 경로를 사용한다.

| 장면 | `backgroundImageUrl` |
| --- | --- |
| 1 | `/story-assets/banggui/sc_banggui_01.webp` |
| 2 | `/story-assets/banggui/sc_banggui_02.webp` |
| 4 | `/story-assets/banggui/sc_banggui_04.webp` |
| 6 | `/story-assets/banggui/sc_banggui_06.webp` |
| 8 | `/story-assets/banggui/sc_banggui_08.webp` |

- 대화 장면 중 새 배경이 없는 장면은 바로 앞 배경을 유지한다.
- 배경이 없는 다른 이야기·장면은 기존 `null`과 프론트 플레이스홀더 동작을 유지한다.
- 미션 이미지는 메시지 API의 URL 필드로 만들지 않는다. 프론트는
  [정적 이미지 표시 요청](../frontend/static-visual-assets.md)의 고정 파일명을 사용한다.
- `/respond`의 `characterState`는 이미 존재하는 다섯 enum만 수용한다. 백엔드는 이미지 URL을 AI에
  요청하거나 AI 텍스트를 파일 경로로 사용하지 않는다.

## 제약 조건

- 인증: 기존 세션 조회·메시지 응답 인증을 그대로 사용한다.
- 이미지 생성 API 호출 없음, 외부 이미지 URL 없음.
- 파일 로드 실패 시 프론트 플레이스홀더가 계속 표시되어 대화 흐름을 막지 않아야 한다.

## 완료 조건

- [ ] 장면 1·2·4·6·8의 조회 응답에 위 `backgroundImageUrl`이 전달된다.
- [ ] `characterState`가 없거나 알 수 없을 때 기존 표정 또는 `NEUTRAL`로 안전하게 표시된다.
- [ ] 이미지 연결 때문에 AI 호출 수·OpenAI 비용이 늘지 않는다.
