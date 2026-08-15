package com.goodquestion.backend.parent.service;

import com.goodquestion.backend.parent.dto.response.ParentSummaryResponse;
import com.goodquestion.backend.parent.dto.response.ReportDetailResponse;
import com.goodquestion.backend.parent.dto.response.ReportListResponse;
import com.goodquestion.backend.session.entity.StorySession;

import java.util.UUID;

public interface ParentReportService {

    ParentSummaryResponse getSummary(UUID parentId, UUID childId);

    ReportListResponse listReports(UUID parentId, UUID childId);

    ReportDetailResponse getReport(UUID parentId, UUID sessionId);

    /** M-57 세션 완료 시점에 호출한다. 이미 있으면 아무것도 하지 않는다 (D-24). */
    void generateReportIfAbsent(StorySession session);

    /**
     * parent-report-ai-generation.md. generateReportIfAbsent()로 이미 저장된 규칙 기반 리포트를
     * AI 결과로 백그라운드에서 덮어쓴다. 실패하면 아무것도 하지 않는다 — 규칙 기반 버전이
     * 안전망으로 남는다.
     */
    void enhanceReportWithAi(UUID sessionId);
}
