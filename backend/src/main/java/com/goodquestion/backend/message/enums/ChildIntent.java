package com.goodquestion.backend.message.enums;

/** PRD 6.6. 발화 분석 LLM이 제안하는 아이 발화 의도. 허용 값은 이 13개로 한정한다. */
public enum ChildIntent {
    QUESTION,
    OPINION,
    REASONING,
    SOLUTION,
    DECISION,
    PERSPECTIVE,
    EMOTION,
    REQUEST,
    CHALLENGE,
    PLAYFUL,
    OFF_TOPIC,
    SHORT_RESPONSE,
    UNCLEAR
}
