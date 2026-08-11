package com.goodquestion.backend.home.dto.response;

import java.time.Instant;
import java.util.UUID;

public record InProgressResponse(
        UUID sessionId,
        UUID storyId,
        String storyTitle,
        String coverImageUrl,
        Integer currentSceneOrder,
        SceneProgressResponse sceneProgress,
        Instant lastActivityAt
) {
}
