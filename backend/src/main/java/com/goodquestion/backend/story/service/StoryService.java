package com.goodquestion.backend.story.service;

import com.goodquestion.backend.story.dto.response.StoriesResponse;
import com.goodquestion.backend.story.dto.response.StoryDetailResponse;

import java.util.UUID;

public interface StoryService {

    StoriesResponse getStories(UUID parentId, UUID childId, String topic);

    StoryDetailResponse getStoryDetail(UUID parentId, UUID childId, UUID storyId);
}
