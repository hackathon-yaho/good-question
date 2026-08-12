package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.message.enums.ChildIntent;
import com.goodquestion.backend.message.enums.UtteranceValidity;
import com.goodquestion.backend.session.enums.ResponseMode;

/** 발화 성격에 따른 반응 원칙 키 매핑 (M-40, PRD 6.13). */
public final class ReactionKeyMapper {

    private ReactionKeyMapper() {
    }

    public static String map(ChildIntent intent, UtteranceValidity validity, ResponseMode mode) {
        // CLOSING 턴에서는 의도 매핑을 무시하고 마무리 톤을 쓴다 (PRD 6.13).
        if (mode == ResponseMode.CLOSING) return "directResponse";

        if (validity == UtteranceValidity.PLAYFUL || intent == ChildIntent.PLAYFUL || intent == ChildIntent.OFF_TOPIC) {
            return "playfulUtterance";
        }
        if (intent == ChildIntent.QUESTION) return "questionFromChild";
        // SOLUTION은 SHORT보다 우선한다 (PRD 6.13 매핑표).
        if (intent == ChildIntent.SOLUTION) return "proposalFromChild";
        if (validity == UtteranceValidity.SHORT || validity == UtteranceValidity.UNCLEAR
                || intent == ChildIntent.UNCLEAR || intent == ChildIntent.SHORT_RESPONSE) {
            return "unclearUtterance";
        }
        if (intent == ChildIntent.EMOTION) return "empathyFromChild";
        if (intent == ChildIntent.OPINION || intent == ChildIntent.REASONING || intent == ChildIntent.DECISION
                || intent == ChildIntent.PERSPECTIVE || intent == ChildIntent.REQUEST || intent == ChildIntent.CHALLENGE) {
            return "disagreement";
        }
        return "directResponse";
    }
}
