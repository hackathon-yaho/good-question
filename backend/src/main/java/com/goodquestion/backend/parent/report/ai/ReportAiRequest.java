package com.goodquestion.backend.parent.report.ai;

import java.util.List;

/** POST {AI_SERVER_BASE_URL}/report 요청 본문 (parent-report-ai-generation.md). */
public record ReportAiRequest(String storyTitle, List<ReportUtterance> utterances, List<CompetencyHint> competencyHints) {
}
