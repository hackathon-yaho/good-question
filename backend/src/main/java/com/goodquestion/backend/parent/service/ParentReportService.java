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
}
