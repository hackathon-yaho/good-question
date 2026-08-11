package com.goodquestion.backend.story.dto.response;

import com.goodquestion.backend.story.entity.Story;

import java.util.List;
import java.util.UUID;

public record StorySummaryResponse(
        UUID id,
        String title,
        String summary,
        String coverImageUrl,
        Integer estimatedMinutes,
        String difficulty,
        List<String> topics,
        String sessionStatus
) {

    public static StorySummaryResponse of(Story story, String sessionStatus) {
        return new StorySummaryResponse(
                story.getId(),
                story.getTitle(),
                story.getSummary(),
                story.getCoverImageUrl(),
                story.getEstimatedMinutes(),
                story.getDifficulty(),
                story.getTopics(),
                sessionStatus
        );
    }
}
