package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.session.enums.ResponseMode;
import com.goodquestion.backend.session.enums.SceneEndReason;

public record ProgressDecision(ResponseMode mode, SceneEndReason endReason) {

    public static ProgressDecision closing(SceneEndReason reason) {
        return new ProgressDecision(ResponseMode.CLOSING, reason);
    }

    public static ProgressDecision normal() {
        return new ProgressDecision(ResponseMode.NORMAL, null);
    }

    public static ProgressDecision guided() {
        return new ProgressDecision(ResponseMode.GUIDED, null);
    }
}
