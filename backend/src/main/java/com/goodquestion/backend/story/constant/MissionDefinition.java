package com.goodquestion.backend.story.constant;

import java.util.List;

/** PRD 7.6. 별도 테이블에 두지 않는다 — 노출 여부만 판정하고 결과는 messages·utterance_analyses에 이미 남는다. */
public record MissionDefinition(String id, String title, String purpose, List<String> checklist) {
}
