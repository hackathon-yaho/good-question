package com.goodquestion.backend.session.controller;

import com.goodquestion.backend.session.dto.request.SessionCreateRequest;
import com.goodquestion.backend.session.dto.request.SessionStopRequest;
import com.goodquestion.backend.session.dto.response.SceneCompleteResponse;
import com.goodquestion.backend.session.dto.response.SessionResponse;
import com.goodquestion.backend.session.dto.response.SessionStatusResponse;
import com.goodquestion.backend.session.service.SessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SessionResponse createSession(@AuthenticationPrincipal UUID parentId,
                                          @Valid @RequestBody SessionCreateRequest request) {
        return sessionService.createSession(parentId, request);
    }

    @GetMapping("/{sessionId}")
    public SessionResponse getSession(@AuthenticationPrincipal UUID parentId, @PathVariable UUID sessionId) {
        return sessionService.getSession(parentId, sessionId);
    }

    @PostMapping("/{sessionId}/scenes/{sceneId}/complete")
    public SceneCompleteResponse completeScene(@AuthenticationPrincipal UUID parentId,
                                                @PathVariable UUID sessionId,
                                                @PathVariable UUID sceneId) {
        return sessionService.completeScene(parentId, sessionId, sceneId);
    }

    @PatchMapping("/{sessionId}")
    public SessionStatusResponse stopSession(@AuthenticationPrincipal UUID parentId,
                                              @PathVariable UUID sessionId,
                                              @Valid @RequestBody SessionStopRequest request) {
        return sessionService.stopSession(parentId, sessionId, request);
    }
}
