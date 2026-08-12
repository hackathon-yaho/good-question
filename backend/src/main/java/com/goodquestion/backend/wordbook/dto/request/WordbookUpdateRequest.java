package com.goodquestion.backend.wordbook.dto.request;

import jakarta.validation.constraints.NotNull;

public record WordbookUpdateRequest(@NotNull Boolean liked) {
}
