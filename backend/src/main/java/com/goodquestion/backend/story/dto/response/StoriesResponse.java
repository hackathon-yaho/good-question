package com.goodquestion.backend.story.dto.response;

import java.util.List;

public record StoriesResponse(List<StorySummaryResponse> stories, List<String> availableTopics) {
}
