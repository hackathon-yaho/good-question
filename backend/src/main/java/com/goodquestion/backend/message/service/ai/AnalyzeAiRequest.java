package com.goodquestion.backend.message.service.ai;

import java.util.List;
import java.util.Map;

/** POST /analyze 요청 (api.md 4.1). AI 서버는 상태가 없어 매 호출마다 필요한 값을 전부 실어 보낸다. */
public record AnalyzeAiRequest(
        String sceneContext,
        String goal,
        String previousCharacterMessage,
        String childUtterance,
        List<String> targetElements,
        Map<String, String> elementCriteria
) {
}
