package com.goodquestion.backend.message.controller;

import com.goodquestion.backend.message.dto.request.MessageCreateRequest;
import com.goodquestion.backend.message.dto.response.MessageCreateResponse;
import com.goodquestion.backend.message.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/sessions/{sessionId}/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @PostMapping
    public MessageCreateResponse createMessage(@AuthenticationPrincipal UUID parentId,
                                                @PathVariable UUID sessionId,
                                                @RequestBody MessageCreateRequest request) {
        return messageService.createMessage(parentId, sessionId, request);
    }
}
