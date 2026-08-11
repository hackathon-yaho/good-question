package com.goodquestion.backend.home.dto.response;

import java.util.List;

public record HomeResponse(
        HomeChildResponse child,
        InProgressResponse inProgress,
        List<RecommendedStoryResponse> recommended
) {
}
