package com.goodquestion.backend.message.service.ai;

import com.goodquestion.backend.message.enums.CharacterState;

public record RespondAiResult(boolean success, String text, CharacterState characterState) {

    public static RespondAiResult failure() {
        return new RespondAiResult(false, null, null);
    }
}
