package com.goodquestion.backend.message.service;

import com.goodquestion.backend.common.enums.ThoughtElement;
import com.goodquestion.backend.common.global.ErrorCode;
import com.goodquestion.backend.common.global.exception.BusinessException;
import com.goodquestion.backend.message.dto.request.MessageCreateRequest;
import com.goodquestion.backend.message.dto.response.HighlightWordResponse;
import com.goodquestion.backend.message.dto.response.MessageCreateResponse;
import com.goodquestion.backend.message.dto.response.MissionTriggeredResponse;
import com.goodquestion.backend.message.entity.DetectedElement;
import com.goodquestion.backend.message.entity.Message;
import com.goodquestion.backend.message.entity.UtteranceAnalysis;
import com.goodquestion.backend.message.enums.CharacterState;
import com.goodquestion.backend.message.enums.SpeakerType;
import com.goodquestion.backend.message.enums.UtteranceValidity;
import com.goodquestion.backend.message.repository.MessageRepository;
import com.goodquestion.backend.message.repository.UtteranceAnalysisRepository;
import com.goodquestion.backend.message.service.ai.AiAnalyzeClient;
import com.goodquestion.backend.message.service.ai.AiRespondClient;
import com.goodquestion.backend.message.service.ai.AnalyzeAiRequest;
import com.goodquestion.backend.message.service.ai.AnalyzeAiResult;
import com.goodquestion.backend.message.service.ai.RespondAiRequest;
import com.goodquestion.backend.message.service.ai.RespondAiResult;
import com.goodquestion.backend.message.service.ai.RespondAnalysisPayload;
import com.goodquestion.backend.session.engine.AccumulatedElementsCalculator;
import com.goodquestion.backend.session.engine.AnalysisPostProcessor;
import com.goodquestion.backend.session.engine.GuidanceSelector;
import com.goodquestion.backend.session.engine.MissionTrigger;
import com.goodquestion.backend.session.engine.MissionTriggerContext;
import com.goodquestion.backend.session.engine.ProgressDecision;
import com.goodquestion.backend.session.engine.ProgressInput;
import com.goodquestion.backend.session.engine.ProgressJudge;
import com.goodquestion.backend.session.engine.ReactionKeyMapper;
import com.goodquestion.backend.session.entity.StorySession;
import com.goodquestion.backend.session.enums.ResponseMode;
import com.goodquestion.backend.session.enums.SceneEndReason;
import com.goodquestion.backend.session.repository.StorySessionRepository;
import com.goodquestion.backend.session.support.NameSubstitutor;
import com.goodquestion.backend.story.constant.DialogueContents;
import com.goodquestion.backend.story.constant.HighlightWords;
import com.goodquestion.backend.story.constant.MissionDefinition;
import com.goodquestion.backend.story.constant.Missions;
import com.goodquestion.backend.story.entity.Story;
import com.goodquestion.backend.story.entity.StoryScene;
import com.goodquestion.backend.story.repository.StorySceneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * PRD 6.1 파이프라인 전체(① 발화 분석 → ② 후처리 → ③ 진행 판단 → ④ 유도 정보 구성 → ⑤ 캐릭터 응답)를
 * 한 요청 안에서 수행한다 (api.md 3.5 ②). 순수 판단 로직은 session/engine 패키지에 분리해뒀고,
 * 여기서는 그 결과를 세션·메시지 상태에 반영하는 조립만 한다.
 */
@Service
@RequiredArgsConstructor
public class MessageServiceImpl implements MessageService {

    private final StorySessionRepository storySessionRepository;
    private final StorySceneRepository storySceneRepository;
    private final MessageRepository messageRepository;
    private final UtteranceAnalysisRepository utteranceAnalysisRepository;
    private final AiAnalyzeClient aiAnalyzeClient;
    private final AiRespondClient aiRespondClient;

    @Override
    @Transactional
    public MessageCreateResponse createMessage(UUID parentId, UUID sessionId, MessageCreateRequest request) {
        StorySession session = storySessionRepository.findById(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!session.getChild().getParent().getId().equals(parentId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        if (request.text() == null || request.text().isBlank()) {
            throw new BusinessException(ErrorCode.STT_EMPTY);
        }

        StoryScene scene = session.getCurrentScene();
        if (!scene.isDialogue()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "대화 장면이 아닌 세션에는 발화를 보낼 수 없습니다.");
        }

        String previousCharacterMessage = messageRepository
                .findFirstBySessionAndSpeakerTypeOrderByTurnOrderDesc(session, SpeakerType.CHARACTER)
                .map(Message::getText)
                .orElse(null);

        int childTurnOrder = messageRepository.findAllBySessionOrderByTurnOrderAsc(session).size() + 1;
        Message childMessage = messageRepository.save(
                Message.ofChild(session, scene, childTurnOrder, request.text(), request.sttRawText()));

        // ① 발화 분석 (M-35, B-09) — 실패하면 B-12 폴백(빈 분석)으로 계속 진행한다.
        AnalyzeAiResult analysis = aiAnalyzeClient.analyze(buildAnalyzeRequest(scene, previousCharacterMessage, request.text()));

        // ② 서버 후처리 (M-36)
        List<DetectedElement> validatedElements = AnalysisPostProcessor.process(analysis.detectedElements(), request.text());
        utteranceAnalysisRepository.save(UtteranceAnalysis.create(
                childMessage, analysis.childIntent(), analysis.mainPoint(), validatedElements, analysis.utteranceValidity()));

        // 누적 요소 계산 (M-37)
        List<String> existingAccumulated = session.getAccumulatedElements();
        List<String> newlyAccumulated = AccumulatedElementsCalculator.newlyAccumulatedTypes(existingAccumulated, validatedElements);
        List<String> accumulated = AccumulatedElementsCalculator.accumulate(existingAccumulated, validatedElements);
        List<String> missing = AccumulatedElementsCalculator.missing(scene.getRequiredElements(), accumulated);

        int turnCount = session.getCurrentChildTurnCount() + 1;
        int turnsWithoutNewElement = newlyAccumulated.isEmpty() ? session.getTurnsWithoutNewElement() + 1 : 0;
        boolean isLowInformation = isLowInformation(analysis.utteranceValidity());
        int lowInformationTurns = isLowInformation ? session.getConsecutiveLowInformationTurns() + 1 : 0;

        // 세션에 이번 턴 결과를 반영하기 전에 "직전 턴" 값을 붙잡아 둔다 —
        // 진행 판단(강한 유도 제한)과 미션 조건 4가 둘 다 직전 턴 기준이다.
        ResponseMode previousMode = session.getLastResponseMode();
        ThoughtElement previousGuidanceTarget = session.getLastGuidanceTarget();

        // D-29: 대화3·4는 미션이 항상 나와야 한다 — 진행 판단이 GOAL_MET으로 장면을 먼저
        // 닫아버리지 않도록, 이번 장면에 아직 안 보여준 미션이 있는지 미리 알려준다.
        boolean hasUnrevealedMission = hasUnrevealedMission(session, scene);

        // ③ 진행 판단 (M-38, M-39) — 판단 순서를 바꾸지 않는다.
        ProgressDecision decision = ProgressJudge.judge(new ProgressInput(
                turnCount, scene.getPreferredTurns(), scene.getMaxTurns(), missing,
                !newlyAccumulated.isEmpty(), previousMode,
                turnsWithoutNewElement, lowInformationTurns, hasUnrevealedMission));

        // ④ 유도 정보 구성 (M-41) + ⑤ 캐릭터 응답. GUIDED 유도 대상과 NORMAL soft-cue 대상(O-13)은
        // 둘 다 reactionKey가 있어야 판단할 수 있어(장난·질문·불명확이면 soft-cue 스킵) resolveCharacterResponse 안에서 함께 계산한다.
        CharacterTurnResult characterTurn = resolveCharacterResponse(
                decision, scene, session, analysis, previousCharacterMessage, request.text(),
                missing, !newlyAccumulated.isEmpty(), previousGuidanceTarget);

        boolean missingEmptyAfterTurn = missing.isEmpty();
        session.recordTurnResult(turnCount, accumulated, newlyAccumulated, characterTurn.effectiveMode(),
                characterTurn.guidanceTarget() == null ? null : ThoughtElement.valueOf(characterTurn.guidanceTarget()),
                turnsWithoutNewElement, lowInformationTurns, missingEmptyAfterTurn);

        int nextTurnOrder = childTurnOrder + 1;
        Message characterMessage = messageRepository.save(
                Message.ofCharacter(session, scene, nextTurnOrder, characterTurn.text()));

        UUID nextSceneId = null;
        if (characterTurn.sceneEnded()) {
            session.closeScene(characterTurn.endReason());
            Optional<StoryScene> next = findSceneByOrder(session.getStory(), scene.getSceneOrder() + 1);
            if (next.isPresent()) {
                session.advanceToScene(next.get());
                nextSceneId = next.get().getId();
            } else {
                session.startPostActivity();
            }
        }

        MissionTriggeredResponse missionTriggered = characterTurn.sceneEnded()
                ? null
                : judgeMission(session, scene, hasUnrevealedMission, new MissionTriggerContext(
                        turnCount, analysis.childIntent(), request.text(), accumulated, missing,
                        previousMode, previousGuidanceTarget, scene.getMaxTurns()), nextTurnOrder + 1);

        String characterDisplayName = DialogueContents.forSceneOrder(scene.getSceneOrder()).characterDisplayName();

        return new MessageCreateResponse(
                characterTurn.effectiveMode().name().toLowerCase(),
                characterTurn.text(),
                characterDisplayName,
                accumulated,
                turnCount,
                scene.getMaxTurns(),
                characterTurn.sceneEnded(),
                nextSceneId,
                missionTriggered,
                detectHighlightWords(scene.getSceneOrder(), characterTurn.text()),
                characterMessage.getId(),
                characterTurn.characterState() == null ? null : characterTurn.characterState().name()
        );
    }

    /** D-22. 후보 단어가 이번 턴 캐릭터 응답에 실제로 있을 때만 골라낸다 (D-11의 LLM 불일치 문제 해결). */
    private List<HighlightWordResponse> detectHighlightWords(int sceneOrder, String characterText) {
        return HighlightWords.forSceneOrder(sceneOrder).stream()
                .filter(candidate -> characterText != null && characterText.contains(candidate.word()))
                .map(candidate -> new HighlightWordResponse(candidate.word(), candidate.meaning()))
                .toList();
    }

    private AnalyzeAiRequest buildAnalyzeRequest(StoryScene scene, String previousCharacterMessage, String childUtterance) {
        return new AnalyzeAiRequest(
                sceneContext(scene), scene.getSceneGoal(), previousCharacterMessage, childUtterance,
                scene.getRequiredElements(), scene.getElementCriteria());
    }

    private String sceneContext(StoryScene scene) {
        return scene.getSceneDescription() + " " + scene.getConflict();
    }

    private boolean isLowInformation(UtteranceValidity validity) {
        return validity == UtteranceValidity.SHORT || validity == UtteranceValidity.UNCLEAR
                || validity == UtteranceValidity.OFF_TOPIC;
    }

    /**
     * ⑤ 캐릭터 응답. CLOSING이면 AI를 호출하지 않고 character_closing을 그대로 쓴다 (M-43).
     * /respond 실패(B-12)도 같은 종료 경로를 탄다 — "character_closing 조회 후 장면 종료".
     */
    private CharacterTurnResult resolveCharacterResponse(ProgressDecision decision, StoryScene scene, StorySession session,
                                                           AnalyzeAiResult analysis, String previousCharacterMessage,
                                                           String childUtterance, List<String> missing,
                                                           boolean hasNewlyAccumulatedElement, ThoughtElement previousGuidanceTarget) {
        if (decision.mode() == ResponseMode.CLOSING) {
            String closingText = NameSubstitutor.substitute(scene.getCharacterClosing(), session.getChild().getName());
            return new CharacterTurnResult(ResponseMode.CLOSING, closingText, true, decision.endReason(), null, null);
        }

        String reactionKey = ReactionKeyMapper.map(analysis.childIntent(), analysis.utteranceValidity(), decision.mode());
        String previousGuidanceTargetName = previousGuidanceTarget == null ? null : previousGuidanceTarget.name();
        String guidanceTarget = GuidanceSelector.selectForTurn(decision.mode(), reactionKey, missing,
                hasNewlyAccumulatedElement, previousGuidanceTargetName);
        String remainingWorry = guidanceTarget == null
                ? null
                : DialogueContents.remainingWorryFor(scene.getSceneOrder(), ThoughtElement.valueOf(guidanceTarget));

        String characterDisplayName = DialogueContents.forSceneOrder(scene.getSceneOrder()).characterDisplayName();
        String characterPersona = DialogueContents.forSceneOrder(scene.getSceneOrder()).guidanceStyle();

        RespondAiRequest respondRequest = new RespondAiRequest(
                characterDisplayName, characterPersona, sceneContext(scene), previousCharacterMessage, childUtterance,
                new RespondAnalysisPayload(analysis.childIntent().name(), analysis.mainPoint()),
                decision.mode().name(), reactionKey, guidanceTarget, remainingWorry);

        RespondAiResult respondResult = aiRespondClient.respond(respondRequest);
        if (!respondResult.success()) {
            // B-12: /respond 실패 → character_closing으로 장면을 종료한다. 사유 코드는 규칙엔진이 낸 것이 아니라 없음(null).
            String fallbackText = NameSubstitutor.substitute(scene.getCharacterClosing(), session.getChild().getName());
            return new CharacterTurnResult(ResponseMode.CLOSING, fallbackText, true, null, null, null);
        }

        return new CharacterTurnResult(decision.mode(), respondResult.text(), false, null, guidanceTarget, respondResult.characterState());
    }

    /** 대화3(미션1)·대화4(미션2)에서만 판정한다. 이미 노출됐으면 다시 노출하지 않는다 (PRD I-07). */
    private MissionTriggeredResponse judgeMission(StorySession session, StoryScene scene, boolean hasUnrevealedMission,
                                                    MissionTriggerContext context, int systemMessageTurnOrder) {
        if (!hasUnrevealedMission) return null;
        MissionDefinition mission = Missions.forSceneOrder(scene.getSceneOrder());

        boolean shouldReveal = mission == Missions.MISSION_1
                ? MissionTrigger.shouldRevealMission1(context)
                : MissionTrigger.shouldRevealMission2(context);
        if (!shouldReveal) return null;

        messageRepository.save(Message.ofSystem(session, scene, systemMessageTurnOrder, mission.id()));
        return MissionTriggeredResponse.of(mission);
    }

    /** 이번 장면에 미션이 있고, 아직 system 메시지로 노출된 적 없으면 true (PRD I-07, D-29). */
    private boolean hasUnrevealedMission(StorySession session, StoryScene scene) {
        return Missions.forSceneOrder(scene.getSceneOrder()) != null
                && !messageRepository.existsBySessionAndSceneAndSpeakerType(session, scene, SpeakerType.SYSTEM);
    }

    private Optional<StoryScene> findSceneByOrder(Story story, int sceneOrder) {
        return storySceneRepository.findAllByStoryOrderBySceneOrderAsc(story).stream()
                .filter(s -> s.getSceneOrder() == sceneOrder)
                .findFirst();
    }

    private record CharacterTurnResult(ResponseMode effectiveMode, String text, boolean sceneEnded,
                                        SceneEndReason endReason, String guidanceTarget, CharacterState characterState) {
    }
}
