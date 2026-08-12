package com.goodquestion.backend.wordbook.dto.response;

import java.util.List;

public record WordbookListResponse(List<WordEntryResponse> words, int total, List<StoryFilterResponse> storyFilters) {
}
