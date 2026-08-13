package com.goodquestion.backend.session.dto.response;

import com.goodquestion.backend.message.entity.Message;
import com.goodquestion.backend.story.constant.DialogueContents;

import java.time.Instant;
import java.util.UUID;

public record SessionMessageResponse(
        UUID id,
        UUID sceneId,
        String speakerType,
        int turnOrder,
        String text,
        String characterDisplayName,
        Instant createdAt
) {

    /**
     * request/backend/message-character.md. 같은 캐릭터가 여러 장면에 재등장해도(PRD I-13)
     * 이 메시지가 속한 장면 기준 캐릭터를 알 수 있도록 child 발화에도 채운다 — "그 대화 상대".
     * messages[]에 담기는 메시지는 전부 대화 장면 소속이라 forSceneOrder가 항상 성립한다.
     */
    public static SessionMessageResponse of(Message message) {
        String characterDisplayName = DialogueContents.forSceneOrder(message.getScene().getSceneOrder())
                .characterDisplayName();
        return new SessionMessageResponse(
                message.getId(),
                message.getScene().getId(),
                message.getSpeakerType().name().toLowerCase(),
                message.getTurnOrder(),
                message.getText(),
                characterDisplayName,
                message.getCreatedAt()
        );
    }
}
