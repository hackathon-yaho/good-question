package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.message.enums.CharacterState;

/**
 * O-12 캐릭터 표정 상태 매핑 (D-41). AI 서버가 이미지 판단을 하지 않기로 확정해
 * (request/backend/ai-service-integration-v1.md, request/frontend/static-visual-assets.md)
 * D-27의 "AI가 대사에 맞춰 직접 판단" 방식을 되돌린다 — `/respond` 호출 전 이미 계산해 둔
 * `reactionKey`로 백엔드가 고정 매핑한다.
 */
public final class CharacterStateMapper {

    private CharacterStateMapper() {
    }

    public static CharacterState map(String reactionKey, boolean hasNewlyAccumulatedElement) {
        return switch (reactionKey) {
            case "playfulUtterance", "empathyFromChild" -> CharacterState.HAPPY;
            case "proposalFromChild" -> hasNewlyAccumulatedElement ? CharacterState.MOVED : CharacterState.SURPRISED;
            case "unclearUtterance", "disagreement" -> CharacterState.WORRIED;
            default -> CharacterState.NEUTRAL;
        };
    }
}
