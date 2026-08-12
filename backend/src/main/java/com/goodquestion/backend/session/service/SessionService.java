package com.goodquestion.backend.session.service;

import com.goodquestion.backend.session.dto.request.SessionCreateRequest;
import com.goodquestion.backend.session.dto.request.SessionStopRequest;
import com.goodquestion.backend.session.dto.response.SceneCompleteResponse;
import com.goodquestion.backend.session.dto.response.SessionResponse;
import com.goodquestion.backend.session.dto.response.SessionStatusResponse;

import java.util.UUID;

public interface SessionService {

    SessionResponse createSession(UUID parentId, SessionCreateRequest request);

    SessionResponse getSession(UUID parentId, UUID sessionId);

    SceneCompleteResponse completeScene(UUID parentId, UUID sessionId, UUID sceneId);

    /** C-13 "이야기 나가기" (api.md 3.4). */
    SessionStatusResponse stopSession(UUID parentId, UUID sessionId, SessionStopRequest request);
}
