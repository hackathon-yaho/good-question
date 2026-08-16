package com.goodquestion.backend.parent.report;

import com.goodquestion.backend.parent.service.ParentReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * {@link ReportSessionCompletedEvent}를 별도 빈에서 받아 {@code parentReportService}(다른 빈)를
 * 호출한다 — 같은 클래스 안에서 자기 자신의 {@code @Async} 메서드를 호출하면 프록시를 안 거쳐
 * 비동기·트랜잭션 어노테이션이 조용히 무시되므로, 반드시 빈 경계를 넘겨 호출한다.
 */
@Component
@RequiredArgsConstructor
public class ReportEnhancementListener {

    private final ParentReportService parentReportService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onReportSessionCompleted(ReportSessionCompletedEvent event) {
        parentReportService.enhanceReportWithAi(event.sessionId());
    }
}
