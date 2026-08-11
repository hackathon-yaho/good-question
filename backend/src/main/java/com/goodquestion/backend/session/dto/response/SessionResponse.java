package com.goodquestion.backend.session.dto.response;

import java.util.List;
import java.util.UUID;

public record SessionResponse(
        UUID sessionId,
        UUID storyId,
        String status,
        UUID currentSceneId,
        int currentSceneOrder,
        int totalScenes,
        int turnCount,
        Integer maxTurns,
        List<String> accumulatedElements,
        List<SessionMessageResponse> messages,
        CurrentSceneResponse currentScene
) {
}
