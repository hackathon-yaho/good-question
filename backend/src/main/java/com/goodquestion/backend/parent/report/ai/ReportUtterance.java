package com.goodquestion.backend.parent.report.ai;

import java.util.List;

/** parent-report-ai-generation.md 입력 스키마 — utterances[]. */
public record ReportUtterance(int index, String text, String sceneLabel, List<String> detectedTypes) {
}
