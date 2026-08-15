package com.goodquestion.backend.session.service;

import com.goodquestion.backend.child.entity.Child;
import com.goodquestion.backend.child.entity.ChildConsent;
import com.goodquestion.backend.child.repository.ChildConsentRepository;
import com.goodquestion.backend.child.repository.ChildRepository;
import com.goodquestion.backend.common.global.ErrorCode;
import com.goodquestion.backend.common.global.exception.BusinessException;
import com.goodquestion.backend.message.entity.Message;
import com.goodquestion.backend.message.enums.SpeakerType;
import com.goodquestion.backend.message.repository.MessageRepository;
import com.goodquestion.backend.session.dto.request.SessionCreateRequest;
import com.goodquestion.backend.session.dto.request.SessionStopRequest;
import com.goodquestion.backend.session.dto.response.CurrentSceneResponse;
import com.goodquestion.backend.session.dto.response.NextSceneResponse;
import com.goodquestion.backend.session.dto.response.OpeningMessageResponse;
import com.goodquestion.backend.session.dto.response.SceneCompleteResponse;
import com.goodquestion.backend.session.dto.response.SessionMessageResponse;
import com.goodquestion.backend.session.dto.response.SessionResponse;
import com.goodquestion.backend.session.dto.response.SessionStatusResponse;
import com.goodquestion.backend.session.entity.StorySession;
import com.goodquestion.backend.session.enums.SessionStatus;
import com.goodquestion.backend.session.repository.StorySessionRepository;
import com.goodquestion.backend.session.support.NameSubstitutor;
import com.goodquestion.backend.story.constant.DialogueContents;
import com.goodquestion.backend.story.entity.Story;
import com.goodquestion.backend.story.entity.StoryScene;
import com.goodquestion.backend.story.enums.SceneType;
import com.goodquestion.backend.story.repository.StoryRepository;
import com.goodquestion.backend.story.repository.StorySceneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SessionServiceImpl implements SessionService {

    private final ChildRepository childRepository;
    private final ChildConsentRepository childConsentRepository;
    private final StoryRepository storyRepository;
    private final StorySceneRepository storySceneRepository;
    private final StorySessionRepository storySessionRepository;
    private final MessageRepository messageRepository;

    @Override
    @Transactional
    public SessionResponse createSession(UUID parentId, SessionCreateRequest request) {
        Child child = getOwnedChild(parentId, request.childId());
        requireActiveConsent(child);

        Story story = storyRepository.findById(request.storyId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        var existing = storySessionRepository.findFirstByChildAndStoryOrderByLastActivityAtDesc(child, story)
                .filter(session -> session.getStatus().isResumable());

        if (request.isRestart()) {
            existing.ifPresent(StorySession::stop);
        } else if (existing.isPresent()) {
            StorySession found = existing.get();
            // D-53: STOPPED로 이어가기를 선택한 경우만 다시 IN_PROGRESS로 되돌린다.
            // POST_ACTIVITY는 대화가 이미 끝난 상태라 건드리지 않는다 (D-48 가드와 충돌 방지).
            if (found.getStatus() == SessionStatus.STOPPED) {
                found.resume();
            }
            return toResponse(found);
        }

        StoryScene introScene = storySceneRepository.findAllByStoryOrderBySceneOrderAsc(story).stream()
                .filter(scene -> scene.getSceneType() == SceneType.INTRO)
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "이야기에 도입 장면이 없습니다."));

        StorySession session = StorySession.create(child, story, introScene);
        storySessionRepository.save(session);

        return toResponse(session);
    }

    @Override
    @Transactional(readOnly = true)
    public SessionResponse getSession(UUID parentId, UUID sessionId) {
        StorySession session = storySessionRepository.findById(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!session.getChild().getParent().getId().equals(parentId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return toResponse(session);
    }

    /**
     * intro/narrative 장면 재생 완료 → 다음 장면 진행 (M-46). 다음 장면이 dialogue면
     * character_opening을 아이 이름 치환 후 messages에 저장한다 (M-26, M-33 일부).
     * dialogue 장면 자체의 종료는 대화 엔진(Phase 4)의 몫이라 여기서 다루지 않는다.
     */
    @Override
    @Transactional
    public SceneCompleteResponse completeScene(UUID parentId, UUID sessionId, UUID sceneId) {
        StorySession session = storySessionRepository.findById(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!session.getChild().getParent().getId().equals(parentId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        if (session.getStatus() != SessionStatus.IN_PROGRESS) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "진행 중인 세션이 아닙니다.");
        }

        StoryScene currentScene = session.getCurrentScene();
        if (!currentScene.getId().equals(sceneId)) {
            throw new BusinessException(ErrorCode.SCENE_ALREADY_CLOSED, "이미 다음 장면으로 넘어간 세션입니다.");
        }
        if (currentScene.isDialogue()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "대화 장면은 이 엔드포인트로 종료하지 않습니다.");
        }

        StoryScene nextScene = storySceneRepository.findAllByStoryOrderBySceneOrderAsc(session.getStory()).stream()
                .filter(scene -> scene.getSceneOrder() == currentScene.getSceneOrder() + 1)
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "다음 장면이 없습니다."));

        session.advanceToScene(nextScene);

        OpeningMessageResponse openingMessage = nextScene.isDialogue()
                ? createOpeningMessage(session, nextScene)
                : null;

        String characterDisplayName = nextScene.isDialogue()
                ? DialogueContents.forSceneOrder(nextScene.getSceneOrder()).characterDisplayName()
                : null;

        return new SceneCompleteResponse(new NextSceneResponse(
                nextScene.getId(), nextScene.getSceneOrder(), nextScene.getSceneType().name().toLowerCase(),
                nextScene.getCharacterName(), characterDisplayName, null, nextScene.getMaxTurns(), openingMessage));
    }

    /** C-13 "이야기 나가기". 지금은 "stopped" 하나만 허용한다 (api.md 3.4). */
    @Override
    @Transactional
    public SessionStatusResponse stopSession(UUID parentId, UUID sessionId, SessionStopRequest request) {
        if (!"stopped".equals(request.status())) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "status는 stopped만 허용합니다.");
        }

        StorySession session = storySessionRepository.findById(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!session.getChild().getParent().getId().equals(parentId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        session.stop();
        return new SessionStatusResponse(session.getStatus().name().toLowerCase());
    }

    private OpeningMessageResponse createOpeningMessage(StorySession session, StoryScene dialogueScene) {
        String text = NameSubstitutor.substitute(dialogueScene.getCharacterOpening(), session.getChild().getName());
        int nextTurnOrder = messageRepository.findAllBySessionOrderByTurnOrderAsc(session).size() + 1;

        Message opening = Message.ofCharacter(session, dialogueScene, nextTurnOrder, text);
        messageRepository.save(opening);

        return new OpeningMessageResponse(
                opening.getId(), opening.getSpeakerType().name().toLowerCase(), opening.getTurnOrder(), opening.getText());
    }

    private SessionResponse toResponse(StorySession session) {
        Story story = session.getStory();
        StoryScene currentScene = session.getCurrentScene();
        int totalScenes = (int) storySceneRepository.countByStoryAndSceneType(story, SceneType.DIALOGUE);

        List<Message> sceneMessages = messageRepository.findAllBySessionOrderByTurnOrderAsc(session);
        List<SessionMessageResponse> messages = sceneMessages.stream()
                .filter(message -> message.getSpeakerType() != SpeakerType.SYSTEM)
                .map(SessionMessageResponse::of)
                .toList();

        boolean missionRevealed = sceneMessages.stream()
                .anyMatch(message -> message.getSpeakerType() == SpeakerType.SYSTEM
                        && message.getScene().getId().equals(currentScene.getId()));

        return new SessionResponse(
                session.getId(),
                story.getId(),
                session.getStatus().name().toLowerCase(),
                currentScene.getId(),
                currentScene.getSceneOrder(),
                totalScenes,
                session.getCurrentChildTurnCount(),
                currentScene.getMaxTurns(),
                session.getAccumulatedElements(),
                messages,
                toCurrentSceneResponse(currentScene, session, missionRevealed)
        );
    }

    private CurrentSceneResponse toCurrentSceneResponse(StoryScene scene, StorySession session, boolean missionRevealed) {
        String characterDisplayName = scene.isDialogue()
                ? DialogueContents.forSceneOrder(scene.getSceneOrder()).characterDisplayName()
                : null;

        return new CurrentSceneResponse(
                scene.getId(),
                scene.getSceneOrder(),
                scene.getSceneType().name().toLowerCase(),
                scene.getSceneDescription(),
                scene.getCharacterName(),
                characterDisplayName,
                null,
                scene.getBackgroundImageUrl(),
                session.getSceneEndReason() != null,
                missionRevealed
        );
    }

    private void requireActiveConsent(Child child) {
        boolean active = childConsentRepository.findFirstByChildOrderByConsentedAtDesc(child)
                .map(ChildConsent::isActive)
                .orElse(false);
        if (!active) {
            throw new BusinessException(ErrorCode.CONSENT_REQUIRED);
        }
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
