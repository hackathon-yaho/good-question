package com.goodquestion.backend.story.constant;

import com.goodquestion.backend.common.enums.ThoughtElement;

/** PRD 7.5.3. 사고 요소별 유도 재료 한 줄. 캐릭터 1인칭·걱정 형태로 쓴다 — 질문형이면 모델이 매 턴 그대로 반복한다. */
public record RemainingWorry(ThoughtElement element, String worry) {
}
