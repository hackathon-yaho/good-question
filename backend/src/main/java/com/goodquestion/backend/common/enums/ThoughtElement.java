package com.goodquestion.backend.common.enums;

/**
 * 사고 요소 분류 체계. 허용 값은 이 8개로 한정한다 (PRD 6.3).
 * story_scenes.required_elements, story_sessions.accumulated_elements /
 * last_detected_elements / last_guidance_target, utterance_analyses.detected_elements[].type
 * 에서 공통으로 쓰인다.
 */
public enum ThoughtElement {
    DECISION,
    REASON,
    PERSPECTIVE,
    SOLUTION,
    RESULT,
    EMOTION,
    EMPATHY,
    REQUEST
}
