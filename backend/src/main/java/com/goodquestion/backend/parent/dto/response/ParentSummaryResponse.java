package com.goodquestion.backend.parent.dto.response;

/** A-6. api.md 3.8. */
public record ParentSummaryResponse(
        ChildBriefResponse child,
        int thisWeekCount,
        int completedStories,
        double avgChildSentences,
        boolean hasRecords
) {
}
