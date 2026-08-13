package com.goodquestion.backend.activity.service;

import com.goodquestion.backend.activity.dto.request.RetellingRequest;
import com.goodquestion.backend.activity.dto.request.SubmitOrderRequest;
import com.goodquestion.backend.activity.dto.response.ActivityCardResponse;
import com.goodquestion.backend.activity.dto.response.ActivityCardsResponse;
import com.goodquestion.backend.activity.dto.response.ActivityStatsResponse;
import com.goodquestion.backend.activity.dto.response.RetellingResponse;
import com.goodquestion.backend.activity.dto.response.SubmitOrderResponse;
import com.goodquestion.backend.activity.entity.PostActivityResult;
import com.goodquestion.backend.activity.repository.PostActivityResultRepository;
import com.goodquestion.backend.common.global.ErrorCode;
import com.goodquestion.backend.common.global.exception.BusinessException;
import com.goodquestion.backend.message.enums.SpeakerType;
import com.goodquestion.backend.message.repository.MessageRepository;
import com.goodquestion.backend.parent.service.ParentReportService;
import com.goodquestion.backend.session.entity.StorySession;
import com.goodquestion.backend.session.enums.SessionStatus;
import com.goodquestion.backend.session.repository.StorySessionRepository;
import com.goodquestion.backend.story.entity.PostActivityCard;
import com.goodquestion.backend.story.entity.PostActivityConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Random;
import java.util.UUID;
import java.util.stream.IntStream;

/**
 * PRD 7.8, work-items.md 10장. 정답 판정·셔플 고정은 전부 서버 책임이다 (PRD 8.11) —
 * 프론트 판정을 허용하지 않는다.
 */
@Service
@RequiredArgsConstructor
public class ActivityServiceImpl implements ActivityService {

    /** B-19, decisions.md D-10. */
    private static final int MAX_ATTEMPTS = 3;
    /** B-20, decisions.md D-09. 이야기 완료 시 1회만 지급 — 이미 completed면 건너뛴다. */
    private static final int STORY_COMPLETION_STAR_DUST = 100;

    private final StorySessionRepository storySessionRepository;
    private final PostActivityResultRepository postActivityResultRepository;
    private final MessageRepository messageRepository;
    private final ParentReportService parentReportService;

    @Override
    @Transactional(readOnly = true)
    public ActivityCardsResponse getCards(UUID parentId, UUID sessionId) {
        StorySession session = getOwnedSession(parentId, sessionId);
        PostActivityConfig config = session.getStory().getPostActivityConfig();

        List<ActivityCardResponse> cards = shuffledCardIds(config.cards(), session.getId()).stream()
                .map(id -> config.cards().stream().filter(card -> card.id().equals(id)).findFirst().orElseThrow())
                .map(ActivityCardResponse::from)
                .toList();

        int attemptCount = postActivityResultRepository.findBySession(session)
                .map(PostActivityResult::getAttemptCount)
                .orElse(0);

        return new ActivityCardsResponse(cards, attemptCount);
    }

    /**
     * 세션 id를 시드로 써서 셔플 순서를 고정한다 — 매 GET마다 다시 섞으면 아이가 혼란스럽다.
     * 별도 컬럼에 셔플 결과를 저장하지 않고, 필요할 때마다 같은 시드로 재현한다.
     */
    private List<String> shuffledCardIds(List<PostActivityCard> cards, UUID sessionId) {
        List<String> ids = new ArrayList<>(cards.stream().map(PostActivityCard::id).toList());
        Collections.shuffle(ids, new Random(sessionId.getMostSignificantBits()));
        return ids;
    }

    @Override
    @Transactional
    public SubmitOrderResponse submitOrder(UUID parentId, UUID sessionId, SubmitOrderRequest request) {
        StorySession session = getOwnedSession(parentId, sessionId);
        PostActivityResult result = getOrCreateResult(session);
        PostActivityConfig config = session.getStory().getPostActivityConfig();

        List<String> correctOrder = config.cards().stream()
                .sorted(Comparator.comparingInt(PostActivityCard::correctOrder))
                .map(PostActivityCard::id)
                .toList();
        boolean isCorrect = correctOrder.equals(request.submittedOrder());
        result.recordAttempt(request.submittedOrder(), isCorrect);

        boolean revealAnswer = !isCorrect && result.getAttemptCount() >= MAX_ATTEMPTS;
        // request/backend/order-slot-results.md: 칸 단위 정오. 정답이거나(볼 이유 없음)
        // 3회째(정답 공개로 넘어감, 지적만 남기지 않음)면 안 보낸다.
        List<Boolean> slotResults = (!isCorrect && !revealAnswer) ? slotResults(correctOrder, request.submittedOrder()) : null;
        return SubmitOrderResponse.of(
                isCorrect,
                result.getAttemptCount(),
                revealAnswer ? correctOrder : null,
                (isCorrect || revealAnswer) ? config.retellingKeywords() : null,
                slotResults);
    }

    private List<Boolean> slotResults(List<String> correctOrder, List<String> submittedOrder) {
        return IntStream.range(0, submittedOrder.size())
                .mapToObj(i -> correctOrder.get(i).equals(submittedOrder.get(i)))
                .toList();
    }

    @Override
    @Transactional
    public RetellingResponse submitRetelling(UUID parentId, UUID sessionId, RetellingRequest request) {
        StorySession session = getOwnedSession(parentId, sessionId);
        PostActivityResult result = getOrCreateResult(session);

        result.completeRetelling(request.retellingText());
        boolean alreadyCompleted = session.getStatus() == SessionStatus.COMPLETED;
        session.complete();
        if (!alreadyCompleted) {
            session.getChild().addStarDust(STORY_COMPLETION_STAR_DUST);
        }
        // O-01~O-05, D-24: 리포트는 완료 시점에 한 번만 생성한다 — 계산 로직이 나중에 바뀌어도
        // 이미 만든 리포트는 그대로 남는다. star_dust와 같은 이유로 별가루 지급 지점에 얹는다.
        parentReportService.generateReportIfAbsent(session);

        long childUtteranceCount = messageRepository.countBySessionAndSpeakerType(session, SpeakerType.CHILD);
        long characterCount = messageRepository.findAllBySessionAndSpeakerType(session, SpeakerType.CHARACTER).stream()
                .map(message -> message.getScene().getCharacterName())
                .distinct()
                .count();

        return new RetellingResponse(
                session.getStatus().name().toLowerCase(),
                session.getCompletedAt(),
                new ActivityStatsResponse((int) childUtteranceCount, (int) characterCount, 0),
                true);
    }

    private PostActivityResult getOrCreateResult(StorySession session) {
        return postActivityResultRepository.findBySession(session)
                .orElseGet(() -> postActivityResultRepository.save(PostActivityResult.create(session)));
    }

    private StorySession getOwnedSession(UUID parentId, UUID sessionId) {
        StorySession session = storySessionRepository.findById(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!session.getChild().getParent().getId().equals(parentId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return session;
    }
}
