package com.goodquestion.backend.wordbook.dto.response;

import java.util.UUID;

public record StoryFilterResponse(UUID storyId, String title) {
}
