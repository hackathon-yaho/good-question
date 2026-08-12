package com.goodquestion.backend.parent.dto.response;

import java.util.List;

/** G-1. api.md 3.8. */
public record ReportListResponse(
        List<ChildChipResponse> children,
        List<WeeklyTrendPointResponse> weeklyTrend,
        String trendMessage,
        List<ReportListItemResponse> reports
) {
}
