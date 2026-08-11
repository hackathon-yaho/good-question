package com.goodquestion.backend.session.service;

import com.goodquestion.backend.session.dto.request.SessionCreateRequest;
import com.goodquestion.backend.session.dto.response.SceneCompleteResponse;
import com.goodquestion.backend.session.dto.response.SessionResponse;

import java.util.UUID;

public interface SessionService {

    SessionResponse createSession(UUID parentId, SessionCreateRequest request);

    SessionResponse getSession(UUID parentId, UUID sessionId);

    SceneCompleteResponse completeScene(UUID parentId, UUID sessionId, UUID sceneId);
}
