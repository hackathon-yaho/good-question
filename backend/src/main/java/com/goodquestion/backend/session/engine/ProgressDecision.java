package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.session.enums.ResponseMode;
import com.goodquestion.backend.session.enums.SceneEndReason;

/**
 * protectedTurn=true는 GUIDED 보호 턴(low-engagement-turn-protection.md)이라는 뜻이다 —
 * 호출 측(MessageServiceImpl)이 currentChildTurnCount·missionEngagedTurns를 늘리지 않고
 * guidedTurnProtectionUsed만 늘려야 한다는 신호다.
 */
public record ProgressDecision(ResponseMode mode, SceneEndReason endReason, boolean protectedTurn) {

    public static ProgressDecision closing(SceneEndReason reason) {
        return new ProgressDecision(ResponseMode.CLOSING, reason, false);
    }

    public static ProgressDecision normal() {
        return new ProgressDecision(ResponseMode.NORMAL, null, false);
    }

    public static ProgressDecision guided() {
        return new ProgressDecision(ResponseMode.GUIDED, null, false);
    }

    public static ProgressDecision protectedGuided() {
        return new ProgressDecision(ResponseMode.GUIDED, null, true);
    }
}
