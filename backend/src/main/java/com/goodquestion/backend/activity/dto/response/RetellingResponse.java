package com.goodquestion.backend.activity.dto.response;

import java.time.Instant;

public record RetellingResponse(
        String sessionStatus,
        Instant completedAt,
        ActivityStatsResponse stats,
        boolean reportAvailable,
        int earnedStarDust
) {
}
