package com.goodquestion.backend.story.controller;

import com.goodquestion.backend.story.dto.response.StoriesResponse;
import com.goodquestion.backend.story.dto.response.StoryDetailResponse;
import com.goodquestion.backend.story.service.StoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/stories")
@RequiredArgsConstructor
public class StoryController {

    private final StoryService storyService;

    @GetMapping
    public StoriesResponse getStories(@AuthenticationPrincipal UUID parentId,
                                       @RequestParam UUID childId,
                                       @RequestParam(required = false) String topic) {
        return storyService.getStories(parentId, childId, topic);
    }

    @GetMapping("/{storyId}")
    public StoryDetailResponse getStoryDetail(@AuthenticationPrincipal UUID parentId,
                                               @PathVariable UUID storyId,
                                               @RequestParam UUID childId) {
        return storyService.getStoryDetail(parentId, childId, storyId);
    }
}
