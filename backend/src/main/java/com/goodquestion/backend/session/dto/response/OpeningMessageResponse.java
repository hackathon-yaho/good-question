package com.goodquestion.backend.session.dto.response;

import java.util.UUID;

public record OpeningMessageResponse(UUID id, String speakerType, int turnOrder, String text) {
}
