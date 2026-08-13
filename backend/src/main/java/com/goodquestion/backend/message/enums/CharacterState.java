package com.goodquestion.backend.message.enums;

/**
 * O-12(PRD A-03). 대화 중 캐릭터 이미지를 바꾸기 위한 상태값. AI가 /respond 응답에서
 * 생성한 대사 내용에 맞춰 직접 판단해 내려준다 (docs/request/ai/story-image-assets.md).
 */
public enum CharacterState {
    NEUTRAL,
    HAPPY,
    WORRIED,
    SURPRISED,
    MOVED
}
