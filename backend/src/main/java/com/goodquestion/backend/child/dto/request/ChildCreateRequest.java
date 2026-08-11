package com.goodquestion.backend.child.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ChildCreateRequest(
        @NotBlank String name,
        @NotNull Integer birthYear,
        String avatarId,
        @NotNull @Valid ConsentsPayload consents
) {
}
