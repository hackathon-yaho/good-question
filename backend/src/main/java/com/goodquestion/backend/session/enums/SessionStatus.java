package com.goodquestion.backend.session.enums;

import java.util.List;

/** PRD 8.8. story_sessions.status 허용 값. */
public enum SessionStatus {
    IN_PROGRESS,
    POST_ACTIVITY,
    COMPLETED,
    STOPPED;

    private static final List<SessionStatus> RESUMABLE = List.of(IN_PROGRESS, POST_ACTIVITY, STOPPED);

    /** 홈 "이어서 하기"·상세 화면 이어가기 모달의 대상 여부 (decisions.md D-48, D-53). */
    public boolean isResumable() {
        return RESUMABLE.contains(this);
    }
}
