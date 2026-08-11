package com.goodquestion.backend.story.service;

import com.goodquestion.backend.child.entity.Child;
import com.goodquestion.backend.child.repository.ChildRepository;
import com.goodquestion.backend.common.global.ErrorCode;
import com.goodquestion.backend.common.global.exception.BusinessException;
import com.goodquestion.backend.session.repository.StorySessionRepository;
import com.goodquestion.backend.story.constant.DialogueContents;
import com.goodquestion.backend.story.dto.response.CharacterResponse;
import com.goodquestion.backend.story.dto.response.ExistingSessionResponse;
import com.goodquestion.backend.story.dto.response.StoriesResponse;
import com.goodquestion.backend.story.dto.response.StoryDetailResponse;
import com.goodquestion.backend.story.dto.response.StorySummaryResponse;
import com.goodquestion.backend.story.entity.Story;
import com.goodquestion.backend.story.entity.StoryScene;
import com.goodquestion.backend.story.enums.SceneType;
import com.goodquestion.backend.story.enums.StoryStatus;
import com.goodquestion.backend.story.repository.StoryRepository;
import com.goodquestion.backend.story.repository.StorySceneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StoryServiceImpl implements StoryService {

    private final StoryRepository storyRepository;
    private final StorySceneRepository storySceneRepository;
    private final StorySessionRepository storySessionRepository;
    private final ChildRepository childRepository;

    @Override
    public StoriesResponse getStories(UUID parentId, UUID childId, String topic) {
        Child child = getOwnedChild(parentId, childId);

        List<Story> published = storyRepository.findAllByStatus(StoryStatus.PUBLISHED);

        List<String> availableTopics = published.stream()
                .flatMap(story -> story.getTopics() == null ? List.<String>of().stream() : story.getTopics().stream())
                .distinct()
                .toList();

        List<StorySummaryResponse> stories = published.stream()
                .filter(story -> topic == null || (story.getTopics() != null && story.getTopics().contains(topic)))
                .map(story -> StorySummaryResponse.of(story, sessionStatusFor(child, story)))
                .toList();

        return new StoriesResponse(stories, availableTopics);
    }

    @Override
    public StoryDetailResponse getStoryDetail(UUID parentId, UUID childId, UUID storyId) {
        Child child = getOwnedChild(parentId, childId);
        Story story = storyRepository.findById(storyId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        List<StoryScene> scenes = storySceneRepository.findAllByStoryOrderBySceneOrderAsc(story);

        String intro = scenes.stream()
                .filter(scene -> scene.getSceneType() == SceneType.INTRO)
                .findFirst()
                .map(StoryScene::getSceneDescription)
                .orElse(null);

        List<CharacterResponse> characters = distinctCharacters(scenes);

        ExistingSessionResponse existingSession = storySessionRepository
                .findFirstByChildAndStoryOrderByLastActivityAtDesc(child, story)
                .map(ExistingSessionResponse::of)
                .orElse(null);

        return StoryDetailResponse.of(story, intro, characters, existingSession);
    }

    private List<CharacterResponse> distinctCharacters(List<StoryScene> scenes) {
        Map<String, CharacterResponse> byCharacterName = new LinkedHashMap<>();
        for (StoryScene scene : scenes) {
            if (scene.getSceneType() != SceneType.DIALOGUE) continue;
            String characterName = scene.getCharacterName();
            if (byCharacterName.containsKey(characterName)) continue;
            String displayName = DialogueContents.forSceneOrder(scene.getSceneOrder()).characterDisplayName();
            byCharacterName.put(characterName, new CharacterResponse(characterName, displayName, null));
        }
        return List.copyOf(byCharacterName.values());
    }

    private String sessionStatusFor(Child child, Story story) {
        return storySessionRepository.findFirstByChildAndStoryOrderByLastActivityAtDesc(child, story)
                .map(session -> session.getStatus().name().toLowerCase())
                .orElse(null);
    }

    private Child getOwnedChild(UUID parentId, UUID childId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!child.getParent().getId().equals(parentId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return child;
    }
}
