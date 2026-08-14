package com.goodquestion.backend.message.service.ai;

public record RespondAiResult(boolean success, String text) {

    public static RespondAiResult failure() {
        return new RespondAiResult(false, null);
    }
}
