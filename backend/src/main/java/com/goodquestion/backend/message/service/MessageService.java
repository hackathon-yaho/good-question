package com.goodquestion.backend.message.service;

import com.goodquestion.backend.message.dto.request.MessageCreateRequest;
import com.goodquestion.backend.message.dto.response.MessageCreateResponse;

import java.util.UUID;

public interface MessageService {

    MessageCreateResponse createMessage(UUID parentId, UUID sessionId, MessageCreateRequest request);
}
