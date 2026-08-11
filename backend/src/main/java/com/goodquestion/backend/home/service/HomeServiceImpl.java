package com.goodquestion.backend.home.service;

import com.goodquestion.backend.child.entity.Child;
import com.goodquestion.backend.child.repository.ChildRepository;
import com.goodquestion.backend.common.global.ErrorCode;
import com.goodquestion.backend.common.global.exception.BusinessException;
import com.goodquestion.backend.home.dto.response.HomeChildResponse;
import com.goodquestion.backend.home.dto.response.HomeResponse;
import com.goodquestion.backend.home.dto.response.InProgressResponse;
import com.goodquestion.backend.home.dto.response.RecommendedStoryResponse;
import com.goodquestion.backend.home.dto.response.SceneProgressResponse;
import com.goodquestion.backend.session.entity.StorySession;
import com.goodquestion.backend.session.enums.SessionStatus;
import com.goodquestion.backend.session.repository.StorySessionRepository;
import com.goodquestion.backend.story.entity.Story;
import com.goodquestion.backend.story.enums.SceneType;
import com.goodquestion.backend.story.enums.StoryStatus;
import com.goodquestion.backend.story.repository.StoryRepository;
import com.goodquestion.backend.story.repository.StorySceneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class HomeServiceImpl implements HomeService {

    /** 진행 중으로 취급하는 상태 (decisions.md D-12, api.md 3.3). */
    private static final List<SessionStatus> RESUMABLE_STATUSES = List.of(SessionStatus.IN_PROGRESS, SessionStatus.POST_ACTIVITY);

    private final ChildRepository childRepository;
    private final StorySessionRepository storySessionRepository;
    private final StoryRepository storyRepository;
    private final StorySceneRepository storySceneRepository;

    @Override
    public HomeResponse getHome(UUID parentId, UUID childId) {
        Child child = getOwnedChild(parentId, childId);

        InProgressResponse inProgress = storySessionRepository
                .findFirstByChildAndStatusInOrderByLastActivityAtDesc(child, RESUMABLE_STATUSES)
                .map(this::toInProgressResponse)
                .orElse(null);

        List<RecommendedStoryResponse> recommended = storyRepository.findAllByStatus(StoryStatus.PUBLISHED).stream()
                .map(RecommendedStoryResponse::of)
                .toList();

        return new HomeResponse(HomeChildResponse.of(child), inProgress, recommended);
    }

    private InProgressResponse toInProgressResponse(StorySession session) {
        Story story = session.getStory();
        Integer currentSceneOrder = session.getCurrentScene() == null ? null : session.getCurrentScene().getSceneOrder();
        SceneProgressResponse sceneProgress = toSceneProgress(story, currentSceneOrder);

        return new InProgressResponse(
                session.getId(), story.getId(), story.getTitle(), story.getCoverImageUrl(),
                currentSceneOrder, sceneProgress, session.getLastActivityAt());
    }

    /** current = scene_order / 2 (소수점 버림), total = dialogue 장면 수 (decisions.md D-12). */
    private SceneProgressResponse toSceneProgress(Story story, Integer currentSceneOrder) {
        int total = (int) storySceneRepository.countByStoryAndSceneType(story, SceneType.DIALOGUE);
        int current = currentSceneOrder == null ? 0 : currentSceneOrder / 2;
        return new SceneProgressResponse(current, total);
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
