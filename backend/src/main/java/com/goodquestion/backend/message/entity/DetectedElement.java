package com.goodquestion.backend.message.entity;

/**
 * PRD 8.10. utterance_analyses.detected_elements jsonb 배열 요소.
 * type은 ThoughtElement 8종 중 하나이나, 서버 후처리를 거친 뒤 저장되는 값이라 문자열로 둔다
 * (StoryScene.requiredElements와 동일한 이유 — PRD 6.7 후처리 후에만 저장되므로 이미 검증된 값이다).
 */
public record DetectedElement(String type, String evidence) {
}
