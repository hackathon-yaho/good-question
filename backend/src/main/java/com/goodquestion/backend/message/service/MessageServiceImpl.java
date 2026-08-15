package com.goodquestion.backend.message.service;

import com.goodquestion.backend.common.enums.ThoughtElement;
import com.goodquestion.backend.common.global.ErrorCode;
import com.goodquestion.backend.common.global.exception.BusinessException;
import com.goodquestion.backend.message.dto.request.MessageCreateRequest;
import com.goodquestion.backend.message.dto.response.HighlightWordResponse;
import com.goodquestion.backend.message.dto.response.MessageCreateResponse;
import com.goodquestion.backend.message.dto.response.MissionProgressResponse;
import com.goodquestion.backend.message.dto.response.MissionTriggeredResponse;
import com.goodquestion.backend.message.entity.DetectedElement;
import com.goodquestion.backend.message.entity.Message;
import com.goodquestion.backend.message.entity.UtteranceAnalysis;
import com.goodquestion.backend.message.enums.CharacterState;
import com.goodquestion.backend.message.enums.ChildIntent;
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
import com.goodquestion.backend.session.engine.MissionProgressCalculator;
import com.goodquestion.backend.session.engine.MissionTrigger;
import com.goodquestion.backend.session.engine.MissionTriggerContext;
import com.goodquestion.backend.session.engine.ProgressDecision;
import com.goodquestion.backend.session.engine.ProgressInput;
import com.goodquestion.backend.session.engine.ProgressJudge;
import com.goodquestion.backend.session.engine.ReactionKeyMapper;
import com.goodquestion.backend.session.entity.StorySession;
import com.goodquestion.backend.session.enums.ResponseMode;
import com.goodquestion.backend.session.enums.SessionStatus;
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
import java.util.Set;
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
        if (session.getStatus() != SessionStatus.IN_PROGRESS) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "진행 중인 세션이 아닙니다.");
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

        // candidateTurnCount는 "이번 발화가 예산을 소모한다면" 가정한 턴 수다. GUIDED 보호 턴으로
        // 확정되면(아래) 세션에는 반영하지 않고 이전 값을 그대로 둔다 (low-engagement-turn-protection.md).
        int candidateTurnCount = session.getCurrentChildTurnCount() + 1;
        int turnsWithoutNewElement = newlyAccumulated.isEmpty() ? session.getTurnsWithoutNewElement() + 1 : 0;
        boolean isLowInformation = isLowInformation(analysis.utteranceValidity());
        int lowInformationTurns = isLowInformation ? session.getConsecutiveLowInformationTurns() + 1 : 0;
        boolean explicitZeroInfoRejection = isExplicitZeroInfoRejection(
                analysis.childIntent(), analysis.utteranceValidity(), validatedElements, request.text());

        // 세션에 이번 턴 결과를 반영하기 전에 "직전 턴" 값을 붙잡아 둔다 —
        // 진행 판단(강한 유도 제한)과 미션 조건 4가 둘 다 직전 턴 기준이다.
        ResponseMode previousMode = session.getLastResponseMode();
        ThoughtElement previousGuidanceTarget = session.getLastGuidanceTarget();
        Integer missionRevealedAtTurn = session.getMissionRevealedAtTurn();
        int missionEngagedTurns = session.getMissionEngagedTurns();
        int missionFreeGuidedTurnsUsed = session.getMissionFreeGuidedTurnsUsed();
        int guidedTurnProtectionUsed = session.getGuidedTurnProtectionUsed();

        // D-29: 대화3·4는 미션이 항상 나와야 한다 — 진행 판단이 GOAL_MET으로 장면을 먼저
        // 닫아버리지 않도록, 이번 장면에 아직 안 보여준 미션이 있는지 미리 알려준다.
        boolean hasUnrevealedMission = hasUnrevealedMission(session, scene);

        // ③ 진행 판단 (M-38, M-39) — 판단 순서를 바꾸지 않는다.
        ProgressDecision decision = ProgressJudge.judge(new ProgressInput(
                candidateTurnCount, scene.getPreferredTurns(), scene.getMaxTurns(), missing,
                !newlyAccumulated.isEmpty(), previousMode,
                turnsWithoutNewElement, lowInformationTurns, hasUnrevealedMission,
                missionRevealedAtTurn, missionEngagedTurns, explicitZeroInfoRejection, guidedTurnProtectionUsed));

        // 보호 턴이면 currentChildTurnCount·미션 진행 턴을 그대로 둔다 (low-engagement-turn-protection.md).
        int turnCount = decision.protectedTurn() ? session.getCurrentChildTurnCount() : candidateTurnCount;

        // ④ 유도 정보 구성 (M-41) + ⑤ 캐릭터 응답. GUIDED 유도 대상과 NORMAL soft-cue 대상(O-13)은
        // 둘 다 reactionKey가 있어야 판단할 수 있어(장난·질문·불명확이면 soft-cue 스킵) resolveCharacterResponse 안에서 함께 계산한다.
        CharacterTurnResult characterTurn = resolveCharacterResponse(
                decision, scene, session, analysis, previousCharacterMessage, request.text(),
                missing, !newlyAccumulated.isEmpty(), previousGuidanceTarget);

        boolean missingEmptyAfterTurn = missing.isEmpty();
        session.recordTurnResult(turnCount, accumulated, newlyAccumulated, characterTurn.effectiveMode(),
                characterTurn.guidanceTarget() == null ? null : ThoughtElement.valueOf(characterTurn.guidanceTarget()),
                turnsWithoutNewElement, lowInformationTurns, missingEmptyAfterTurn);
        if (decision.protectedTurn()) {
            session.recordGuidedTurnProtectionUsed();
        } else if (missionRevealedAtTurn != null) {
            // D-50: 미션이 이미 노출된 상태에서 GUIDED로 응답한 턴은 최대 FREE_GUIDED_TURNS_AFTER_REVEAL
            // 회까지만 미션 턴 예산을 소모하지 않는다 — 그 이상 반복되면 일반 턴처럼 예산을 소모해서
            // 대화가 무한히 늘어지는 것을 막는다. 보호 턴은 이미 위에서 처리했으므로 여기서 제외한다.
            if (characterTurn.effectiveMode() == ResponseMode.NORMAL) {
                session.recordMissionEngagedTurn();
            } else if (characterTurn.effectiveMode() == ResponseMode.GUIDED) {
                if (missionFreeGuidedTurnsUsed < MissionTrigger.FREE_GUIDED_TURNS_AFTER_REVEAL) {
                    session.recordMissionFreeGuidedTurn();
                } else {
                    session.recordMissionEngagedTurn();
                }
            }
        }

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
        if (missionTriggered != null) {
            session.recordMissionRevealed(turnCount);
        }

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
                characterTurn.characterState() == null ? null : characterTurn.characterState().name(),
                characterTurn.sceneEnded() ? null : missionProgress(session, scene)
        );
    }

    /**
     * 미션 체크리스트 항목 단위 진행 (request/backend/mission-progress.md). 미션이 없거나
     * 아직 노출 전이면 null — "미션 진행 중일 때만" 값을 준다.
     */
    private MissionProgressResponse missionProgress(StorySession session, StoryScene scene) {
        MissionDefinition mission = Missions.forSceneOrder(scene.getSceneOrder());
        if (mission == null) return null;

        Optional<Message> systemMessage = messageRepository
                .findFirstBySessionAndSceneAndSpeakerTypeOrderByTurnOrderDesc(session, scene, SpeakerType.SYSTEM);
        if (systemMessage.isEmpty()) return null;

        List<List<String>> perTurnDetectedTypes = messageRepository.findAllBySessionOrderByTurnOrderAsc(session).stream()
                .filter(m -> m.getScene().getId().equals(scene.getId()))
                .filter(m -> m.getSpeakerType() == SpeakerType.CHILD)
                .filter(m -> m.getTurnOrder() > systemMessage.get().getTurnOrder())
                .map(m -> utteranceAnalysisRepository.findByMessage(m)
                        .map(a -> a.getDetectedElements().stream().map(DetectedElement::type).toList())
                        .orElse(List.<String>of()))
                .toList();

        List<Integer> satisfiedIndexes = MissionProgressCalculator.satisfiedIndexes(mission.checklist(), perTurnDetectedTypes);
        return new MissionProgressResponse(mission.id(), satisfiedIndexes);
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

    /** low-engagement-turn-protection.md 조건 1의 명백한 0정보 거절·회피·거친 말 키워드. */
    private static final Set<String> ZERO_INFO_REJECTION_KEYWORDS = Set.of("싫어", "몰라", "모르겠어", "닥쳐", "닥처");

    /**
     * AI 서버가 이 키워드들을 SHORT_RESPONSE + SHORT로 보정해 준다는 전제 위에, 백엔드에서도
     * 원문 키워드를 한 번 더 대조한다 — 감지된 사고 요소가 전혀 없을 때만 "0정보"로 본다.
     */
    private boolean isExplicitZeroInfoRejection(ChildIntent childIntent, UtteranceValidity validity,
                                                  List<DetectedElement> validatedElements, String childUtterance) {
        boolean shortLike = childIntent == ChildIntent.SHORT_RESPONSE || validity == UtteranceValidity.SHORT;
        return shortLike && validatedElements.isEmpty()
                && childUtterance != null && ZERO_INFO_REJECTION_KEYWORDS.stream().anyMatch(childUtterance::contains);
    }

    /**
     * ⑤ 캐릭터 응답. CLOSING이면 AI를 호출하지 않고 character_closing을 그대로 쓴다 (M-43).
     * /respond 실패(B-12)도 같은 종료 경로를 탄다 — "character_closing 조회 후 장면 종료".
     * characterState는 AI가 대사에 맞춰 직접 판단해 준다(D-44, D-27로 복귀).
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
