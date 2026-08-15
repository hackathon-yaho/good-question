package com.goodquestion.backend.parent.report.ai;

/** parent-report-ai-generation.md 입력 스키마 — competencyHints[]. matched는 백엔드가 계산한 사실이다. */
public record CompetencyHint(String name, boolean matched) {
}
