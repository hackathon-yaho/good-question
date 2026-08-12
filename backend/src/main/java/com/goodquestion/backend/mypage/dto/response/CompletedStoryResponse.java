package com.goodquestion.backend.mypage.dto.response;

import java.time.Instant;
import java.util.UUID;

public record CompletedStoryResponse(UUID sessionId, UUID storyId, String title, String coverImageUrl, Instant completedAt) {
}
