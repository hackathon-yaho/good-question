package com.goodquestion.backend.message.dto.response;

import java.util.List;
import java.util.UUID;

public record MessageCreateResponse(
        String responseMode,
        String characterMessage,
        String characterName,
        List<String> accumulatedElements,
        int turnCount,
        Integer maxTurns,
        boolean sceneEnded,
        UUID nextSceneId,
        MissionTriggeredResponse missionTriggered,
        List<HighlightWordResponse> highlightWords,
        UUID messageId,
        String characterState,
        MissionProgressResponse missionProgress,
        RecommendedWordResponse recommendedWord
) {
}
