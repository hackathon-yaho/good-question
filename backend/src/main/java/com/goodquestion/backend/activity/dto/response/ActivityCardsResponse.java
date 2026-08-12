package com.goodquestion.backend.activity.dto.response;

import java.util.List;

public record ActivityCardsResponse(List<ActivityCardResponse> cards, int attemptCount) {
}
