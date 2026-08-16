package com.goodquestion.backend.mypage.service;

import com.goodquestion.backend.activity.entity.PostActivityResult;
import com.goodquestion.backend.activity.repository.PostActivityResultRepository;
import com.goodquestion.backend.child.entity.Child;
import com.goodquestion.backend.child.repository.ChildRepository;
import com.goodquestion.backend.common.global.ErrorCode;
import com.goodquestion.backend.common.global.exception.BusinessException;
import com.goodquestion.backend.message.entity.Message;
import com.goodquestion.backend.message.repository.MessageRepository;
import com.goodquestion.backend.mypage.dto.response.CompletedStoryResponse;
import com.goodquestion.backend.mypage.dto.response.MypageChildResponse;
import com.goodquestion.backend.mypage.dto.response.MypageResponse;
import com.goodquestion.backend.mypage.dto.response.MypageStatsResponse;
import com.goodquestion.backend.mypage.dto.response.RetellingItemResponse;
import com.goodquestion.backend.session.entity.StorySession;
import com.goodquestion.backend.session.enums.SessionStatus;
import com.goodquestion.backend.session.repository.StorySessionRepository;
import com.goodquestion.backend.shop.entity.AvatarPurchase;
import com.goodquestion.backend.shop.repository.AvatarPurchaseRepository;
import com.goodquestion.backend.wordbook.repository.WordbookRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** F-1, work-items.md. api.md 3.9. 프론트 mock(`mock-content.ts` getMypage)을 그대로 포팅했다. */
@Service
@RequiredArgsConstructor
public class MypageServiceImpl implements MypageService {

    private static final DateTimeFormatter ACTIVITY_DATE = DateTimeFormatter.ISO_LOCAL_DATE.withZone(ZoneId.of("Asia/Seoul"));

    private final ChildRepository childRepository;
    private final StorySessionRepository storySessionRepository;
    private final MessageRepository messageRepository;
    private final WordbookRepository wordbookRepository;
    private final PostActivityResultRepository postActivityResultRepository;
    private final AvatarPurchaseRepository avatarPurchaseRepository;

    @Override
    @Transactional(readOnly = true)
    public MypageResponse getMypage(UUID parentId, UUID childId) {
        Child child = getOwnedChild(parentId, childId);
        List<StorySession> sessions = storySessionRepository.findAllByChild(child);
        List<StorySession> completed = sessions.stream().filter(s -> s.getStatus() == SessionStatus.COMPLETED).toList();

        Set<String> activityDates = new HashSet<>();
        for (StorySession session : sessions) {
            for (Message message : messageRepository.findAllBySessionOrderByTurnOrderAsc(session)) {
                activityDates.add(ACTIVITY_DATE.format(message.getCreatedAt()));
            }
        }

        int savedWords = wordbookRepository.findAllByChildOrderByCreatedAtDesc(child).size();

        List<CompletedStoryResponse> completedStories = completed.stream()
                .map(s -> new CompletedStoryResponse(
                        s.getId(), s.getStory().getId(), s.getStory().getTitle(),
                        s.getStory().getCoverImageUrl(), referenceInstant(s)))
                .toList();

        List<RetellingItemResponse> retellings = sessions.stream()
                .flatMap(s -> postActivityResultRepository.findBySession(s).stream()
                        .filter(result -> result.getRetellingText() != null)
                        .map(result -> toRetellingItem(s, result)))
                .toList();

        List<String> ownedAvatarIds = avatarPurchaseRepository.findAllByChild(child).stream()
                .map(AvatarPurchase::getAvatarId)
                .toList();

        return new MypageResponse(
                MypageChildResponse.of(child, ownedAvatarIds),
                new MypageStatsResponse(completed.size(), savedWords, activityDates.size()),
                completedStories,
                retellings);
    }

    private RetellingItemResponse toRetellingItem(StorySession session, PostActivityResult result) {
        return new RetellingItemResponse(
                session.getId(), session.getStory().getTitle(), result.getRetellingText(), referenceInstant(session));
    }

    /** 완료된 세션은 completedAt, 진행 중이면 lastActivityAt — mock-content.ts와 같은 기준. */
    private Instant referenceInstant(StorySession session) {
        return session.getCompletedAt() != null ? session.getCompletedAt() : session.getLastActivityAt();
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
