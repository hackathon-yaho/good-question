# Typecast 공개 음성 샘플 비교 청취 요청

- **요청자**: AI 파트
- **작성일**: 2026-08-14
- **우선순위**: 선택
- **대상**: 백엔드 파트

## 배경

백엔드의 현재 STT/TTS(OpenAI 기반) 구현은 그대로 유지합니다. 백엔드 담당자가 요청한
"성우형 음성이 어떤 느낌인지"의 **청취 비교만** 할 수 있도록, Typecast가 공식 공개한 외부
MP3 링크를 기록합니다.

이 문서는 음성 파일을 저장하거나 서비스에 연결하지 않습니다. `main`을 pull하면 아래 Markdown
링크가 보이고, 링크를 클릭했을 때 브라우저에서 Typecast의 외부 음원을 재생할 수 있습니다.
Git 저장소로 MP3가 내려오지는 않습니다.

전체 음성은 [Typecast 공식 Voice Library](https://typecast.ai/voices/)에서도 미리들을 수 있습니다.
백엔드 담당자는 페이지에서 언어를 Korean으로, 용도를 Narration·Character·Kid 등으로 좁혀
후보를 찾아볼 수 있습니다.

## 팀 결정 (2026-08-14)

- **현재 백엔드의 OpenAI STT/TTS 구현을 유지한다.** 이미 전체 이야기 흐름에서 인식과 재생을
  확인한 구현을 대회 테스트 기준으로 사용한다.
- Typecast는 이 문서의 외부 샘플 청취 용도에만 남긴다. Free 플랜의 팀 해커톤 MVP 사용 조건이
  명확하지 않으므로 API 연동, 음원 다운로드·번들, 성우 교체 작업은 진행하지 않는다.
- 따라서 이 결정으로 인한 백엔드·프론트엔드·AI 서버 코드, 환경변수, API 계약 변경은 없다.

## 비교용 공식 공개 샘플

| 비교 역할 | Typecast 공개 샘플 | 청취 링크 |
| --- | --- | --- |
| 내레이션 | 권일 | [MP3 듣기](https://typecast.ai/audio/tts/actor-kwonil.mp3) |
| 여성 캐릭터/더빙 | 다은 | [MP3 듣기](https://typecast.ai/audio/tts/actor-daeun.mp3) |
| 남성 캐릭터/성우 | 필재 | [MP3 듣기](https://typecast.ai/audio/tts/actor-piljae.mp3) |
| 안내/아나운서 | 서현 | [MP3 듣기](https://typecast.ai/audio/tts/actor-seohyeon.mp3) |
| 어린이 톤 참고 | 하준 | [MP3 듣기](https://typecast.ai/audio/tts/actor-hajun.mp3) |

- 위 링크는 Typecast의 공식 홍보용 공개 음원이다. 비교 청취용 링크일 뿐, 서비스 에셋이 아니다.
- 공개 샘플과 백엔드 TTS는 문장이 다르므로 발음 정확도보다 **음색·억양·캐릭터 적합성**만
  비교한다. 같은 대사로 공정하게 비교하려면 별도 계정·사용 허가 확인이 필요하다.

## 비교 방법

1. 현재 백엔드가 생성하는 대표 캐릭터 대사와 내레이션을 기존 경로에서 재생한다.
2. 위 공개 링크를 새 탭에서 열어 같은 역할의 음색·속도감·어린이 서비스 적합성을 듣는다.
3. 결과는 "현재 OpenAI 유지" 또는 "Typecast 도입 검토"로 구분해 팀에 공유한다.

## API 명세

**변경 없음.**

- `POST /api/stt`, `GET /api/tts`, 기존 OpenAI 키·TTS 캐시·프리워밍 구현을 바꾸지 않는다.
- Typecast API 키, 음성 ID, 공급자 전환 코드, 새 엔드포인트를 추가하지 않는다.

## 데이터 모델

**변경 없음.** MP3 파일·오디오 URL·Typecast 계정 정보는 DB와 Git에 저장하지 않는다.

## 라이선스 및 제약 조건

- [Typecast 무료 플랜 안내](https://help.typecast.ai/ko/articles/15347827-%EB%AC%B4%EB%A3%8C%EB%A1%9C-%EC%82%AC%EC%9A%A9-%EA%B0%80%EB%8A%A5%ED%95%9C-%EC%BA%90%EB%A6%AD%ED%84%B0%EA%B0%80-%EB%AC%B4%EC%97%87%EC%9D%B8%EA%B0%80%EC%9A%94)에 따르면 무료 플랜으로 내려받은 음성은 체험 캐릭터 및 개인용 온라인 게시 목적에 한정되고, 상업적 이용은 불가하며 출처 표기가 필요하다.
- [공모전 무료 사용 FAQ](https://help.typecast.ai/en/articles/6696788-can-i-use-the-service-for-free-for-contests)는 개인 참가자는 출처 표기 조건으로 Free 사용이 가능하지만, **팀·기관 참가자는 Business 플랜을 구독**하도록 안내한다. 따라서 우리 팀 해커톤 MVP에 개인 Free Studio 생성물을 넣을 수 없다.
- [Typecast 이용정책](https://typecast.ai/kr/policy/)은 자동 생성 프로그램을 이용한 서비스의 음원 사용과 API 서비스를 별도 계약 사항으로 분류한다.
- 따라서 대회 웹서비스에 실제 Typecast 음성을 넣는 결정은 **서면 이용 허가·대회 배포 범위·API 플랜 조건**을 확인한 뒤 별도 요청 문서와 PR로 진행한다.
- 공개 MP3를 다운로드·복사·Git 커밋·번들 포함·재배포·iframe 임베드하지 않는다. 이 문서의 외부 링크만 유지한다.

## 완료 조건

- [ ] 백엔드 담당자가 `main` pull 후 이 문서에서 공식 샘플을 직접 청취할 수 있다.
- [ ] 현재 OpenAI STT/TTS 구현에는 코드·환경변수·API 계약 변경이 없다.
- [ ] 저장소에 Typecast MP3 또는 API 키가 추가되지 않는다.
- [ ] 실제 Typecast 도입은 라이선스 확인 전까지 진행하지 않는다.
