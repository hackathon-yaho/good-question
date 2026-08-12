package com.goodquestion.backend.parent.dto.response;

import com.goodquestion.backend.parent.entity.CompetencyCard;
import com.goodquestion.backend.parent.entity.ElementCount;
import com.goodquestion.backend.parent.entity.HomeGuide;
import com.goodquestion.backend.parent.entity.RepresentativeUtterance;
import com.goodquestion.backend.parent.entity.Report;
import com.goodquestion.backend.parent.entity.ReportVocabulary;

import java.util.List;
import java.util.UUID;

/** G-2~G-4. api.md 3.8. */
public record ReportDetailResponse(
        UUID sessionId,
        String storyTitle,
        String date,
        String summary,
        ReportVocabulary vocabulary,
        List<CompetencyCard> competencies,
        List<ElementCount> elementCounts,
        RepresentativeUtterance representative,
        HomeGuide guide
) {

    public static ReportDetailResponse of(Report report, String storyTitle, String date) {
        return new ReportDetailResponse(
                report.getSession().getId(),
                storyTitle,
                date,
                report.getSummary(),
                report.getVocabulary(),
                report.getCompetencies(),
                report.getElementCounts(),
                report.getRepresentative(),
                report.getGuide());
    }
}
