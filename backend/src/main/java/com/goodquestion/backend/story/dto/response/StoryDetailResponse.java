package com.goodquestion.backend.story.dto.response;

import com.goodquestion.backend.story.entity.Story;

import java.util.List;
import java.util.UUID;

public record StoryDetailResponse(
        UUID id,
        String title,
        String summary,
        String coverImageUrl,
        Integer estimatedMinutes,
        String difficulty,
        List<String> topics,
        String intro,
        String situation,
        String childRole,
        List<CharacterResponse> characters,
        ExistingSessionResponse existingSession
) {

    public static StoryDetailResponse of(Story story, String intro, List<CharacterResponse> characters,
                                          ExistingSessionResponse existingSession) {
        return new StoryDetailResponse(
                story.getId(),
                story.getTitle(),
                story.getSummary(),
                story.getCoverImageUrl(),
                story.getEstimatedMinutes(),
                story.getDifficulty(),
                story.getTopics(),
                intro,
                story.getSituation(),
                story.getChildRole(),
                characters,
                existingSession
        );
    }
}
