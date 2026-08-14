package com.goodquestion.backend.message.enums;

/**
 * O-12(PRD A-03). 대화 중 캐릭터 이미지를 바꾸기 위한 상태값. AI는 이미지 판단을 하지 않으므로
 * (docs/request/backend/ai-service-integration-v1.md), reactionKey로 백엔드가 직접 매핑한다
 * (session/engine/CharacterStateMapper.java, D-41).
 */
public enum CharacterState {
    NEUTRAL,
    HAPPY,
    WORRIED,
    SURPRISED,
    MOVED
}
