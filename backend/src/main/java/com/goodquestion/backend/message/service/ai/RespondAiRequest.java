package com.goodquestion.backend.message.service.ai;

/** POST /respond 요청 (api.md 4.2). guidanceTarget·remainingWorry는 GUIDED일 때만 값이 있다. */
public record RespondAiRequest(
        String characterName,
        String characterPersona,
        String sceneContext,
        String previousCharacterMessage,
        String childUtterance,
        RespondAnalysisPayload analysis,
        String responseMode,
        String reactionKey,
        String guidanceTarget,
        String remainingWorry
) {
}
