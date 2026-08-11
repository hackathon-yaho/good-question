package com.goodquestion.backend.session.dto.response;

import com.goodquestion.backend.message.entity.Message;

import java.time.Instant;
import java.util.UUID;

public record SessionMessageResponse(
        UUID id,
        UUID sceneId,
        String speakerType,
        int turnOrder,
        String text,
        Instant createdAt
) {

    public static SessionMessageResponse of(Message message) {
        return new SessionMessageResponse(
                message.getId(),
                message.getScene().getId(),
                message.getSpeakerType().name().toLowerCase(),
                message.getTurnOrder(),
                message.getText(),
                message.getCreatedAt()
        );
    }
}
