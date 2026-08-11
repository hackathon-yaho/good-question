package com.goodquestion.backend.story.dto.response;

import com.goodquestion.backend.session.entity.StorySession;

import java.util.UUID;

public record ExistingSessionResponse(UUID sessionId, Integer currentSceneOrder, String status) {

    public static ExistingSessionResponse of(StorySession session) {
        Integer currentSceneOrder = session.getCurrentScene() == null
                ? null
                : session.getCurrentScene().getSceneOrder();
        return new ExistingSessionResponse(session.getId(), currentSceneOrder, session.getStatus().name().toLowerCase());
    }
}
