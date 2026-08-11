package com.goodquestion.backend.session.dto.response;

import java.util.UUID;

/** characterImageUrl은 캐릭터별 이미지 컬럼이 아직 없어 항상 null이다 (에셋 미수령). */
public record NextSceneResponse(
        UUID sceneId,
        int sceneOrder,
        String sceneType,
        String characterName,
        String characterDisplayName,
        String characterImageUrl,
        Integer maxTurns,
        OpeningMessageResponse openingMessage
) {
}
