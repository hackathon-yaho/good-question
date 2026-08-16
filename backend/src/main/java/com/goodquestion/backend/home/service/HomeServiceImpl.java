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

    private final ChildRepository childRepository;
    private final StorySessionRepository storySessionRepository;
    private final StoryRepository storyRepository;
    private final StorySceneRepository storySceneRepository;

    @Override
    public HomeResponse getHome(UUID parentId, UUID childId) {
        Child child = getOwnedChild(parentId, childId);

        // D-58: 상태로 먼저 거르면(status-first) COMPLETED된 세션보다 오래된 STOPPED 세션이
        // "가장 최근 resumable"로 잡힌다 (새로하기로 새 세션을 만들고 완료해도 예전 STOPPED가 남아
        // 이어하기에 뜸). StoryServiceImpl.getStoryDetail()의 D-48 패턴대로 최근 활동순으로 먼저
        // 정렬한 뒤 resumable 여부를 거른다.
        InProgressResponse inProgress = storySessionRepository
                .findFirstByChildOrderByLastActivityAtDesc(child)
                .filter(session -> session.getStatus().isResumable())
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
