package com.goodquestion.backend.activity.dto.request;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record SubmitOrderRequest(@NotEmpty List<String> submittedOrder) {
}
