package com.goodquestion.backend.mypage.dto.response;

import java.util.List;

/** F-1. api.md 3.9. */
public record MypageResponse(
        MypageChildResponse child,
        MypageStatsResponse stats,
        List<CompletedStoryResponse> completedStories,
        List<RetellingItemResponse> retellings
) {
}
