package com.goodquestion.backend.parent.controller;

import com.goodquestion.backend.parent.dto.response.ParentSummaryResponse;
import com.goodquestion.backend.parent.dto.response.ReportDetailResponse;
import com.goodquestion.backend.parent.dto.response.ReportListResponse;
import com.goodquestion.backend.parent.service.ParentReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/parent")
@RequiredArgsConstructor
public class ParentReportController {

    private final ParentReportService parentReportService;

    @GetMapping("/summary")
    public ParentSummaryResponse getSummary(@AuthenticationPrincipal UUID parentId, @RequestParam UUID childId) {
        return parentReportService.getSummary(parentId, childId);
    }

    @GetMapping("/reports")
    public ReportListResponse listReports(@AuthenticationPrincipal UUID parentId, @RequestParam UUID childId) {
        return parentReportService.listReports(parentId, childId);
    }

    @GetMapping("/reports/{sessionId}")
    public ReportDetailResponse getReport(@AuthenticationPrincipal UUID parentId, @PathVariable UUID sessionId) {
        return parentReportService.getReport(parentId, sessionId);
    }
}
