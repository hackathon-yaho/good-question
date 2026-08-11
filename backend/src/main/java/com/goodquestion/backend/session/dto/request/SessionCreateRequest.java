package com.goodquestion.backend.session.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record SessionCreateRequest(
        @NotNull UUID childId,
        @NotNull UUID storyId,
        Boolean restart
) {

    public boolean isRestart() {
        return Boolean.TRUE.equals(restart);
    }
}
