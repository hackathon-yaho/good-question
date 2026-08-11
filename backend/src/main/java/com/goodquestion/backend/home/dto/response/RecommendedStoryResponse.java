package com.goodquestion.backend.home.dto.response;

import com.goodquestion.backend.story.entity.Story;

import java.util.List;
import java.util.UUID;

public record RecommendedStoryResponse(
        UUID id,
        String title,
        String coverImageUrl,
        Integer estimatedMinutes,
        List<String> topics
) {

    public static RecommendedStoryResponse of(Story story) {
        return new RecommendedStoryResponse(
                story.getId(), story.getTitle(), story.getCoverImageUrl(),
                story.getEstimatedMinutes(), story.getTopics());
    }
}
