package com.goodquestion.backend.parent.report;

import java.util.UUID;

/**
 * 세션 완료(재구성 발화 제출) 트랜잭션이 커밋된 뒤에만 AI 리포트 고도화를 시작하기 위한 이벤트
 * (parent-report-ai-generation.md). {@code @Async}를 트랜잭션 안에서 직접 호출하면 커밋 전에
 * 백그라운드 스레드가 먼저 조회를 시도해 방금 저장한 리포트를 못 찾을 수 있다 —
 * {@code @TransactionalEventListener(AFTER_COMMIT)}로 그 경쟁 조건을 피한다.
 */
public record ReportSessionCompletedEvent(UUID sessionId) {
}
