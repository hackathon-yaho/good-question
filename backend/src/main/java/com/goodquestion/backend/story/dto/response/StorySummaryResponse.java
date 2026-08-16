package com.goodquestion.backend.story.dto.response;

import com.goodquestion.backend.story.entity.Story;

import java.util.List;
import java.util.UUID;

/** comingSoon은 catalog-only-stories.md (D-61) — story_scenes가 아직 없는 이야기는 재생 불가로 노출. */
public record StorySummaryResponse(
        UUID id,
        String title,
        String summary,
        String coverImageUrl,
        Integer estimatedMinutes,
        String difficulty,
        List<String> topics,
        String sessionStatus,
        boolean comingSoon
) {

    public static StorySummaryResponse of(Story story, String sessionStatus, boolean comingSoon) {
        return new StorySummaryResponse(
                story.getId(),
                story.getTitle(),
                story.getSummary(),
                story.getCoverImageUrl(),
                story.getEstimatedMinutes(),
                story.getDifficulty(),
                story.getTopics(),
                sessionStatus,
                comingSoon
        );
    }
}
