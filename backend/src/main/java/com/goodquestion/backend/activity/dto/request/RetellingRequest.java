package com.goodquestion.backend.activity.dto.request;

import jakarta.validation.constraints.NotBlank;

public record RetellingRequest(@NotBlank String retellingText) {
}
