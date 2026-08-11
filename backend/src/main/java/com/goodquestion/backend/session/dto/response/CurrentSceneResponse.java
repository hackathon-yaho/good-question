package com.goodquestion.backend.session.dto.response;

import java.util.UUID;

public record CurrentSceneResponse(
        UUID sceneId,
        int sceneOrder,
        String sceneType,
        String sceneDescription,
        String characterName,
        String characterDisplayName,
        String characterImageUrl,
        String backgroundImageUrl,
        boolean sceneClosed,
        boolean missionRevealed
) {
}
