package com.goodquestion.backend.parent.report.ai;

import java.util.List;

/**
 * success=false는 호출 실패(타임아웃·오류) 또는 스키마 위반(개수 불일치 등)을 뜻한다 — 호출 측이
 * 기존 규칙 기반 리포트를 그대로 두는 신호로 쓴다 (parent-report-ai-generation.md 완료조건).
 */
public record ReportAiResult(
        boolean success,
        List<CompetencyAiCard> competencies,
        Integer representativeIndex,
        String representativeReason,
        List<String> storyQuestions,
        List<String> dailyQuestions
) {

    public static ReportAiResult failure() {
        return new ReportAiResult(false, List.of(), null, null, List.of(), List.of());
    }
}
