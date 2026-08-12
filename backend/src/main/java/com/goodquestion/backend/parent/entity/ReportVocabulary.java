package com.goodquestion.backend.parent.entity;

import java.util.List;

/** 리포트 가이드 3-1. Report.vocabulary jsonb의 구조. */
public record ReportVocabulary(List<String> mainWords, List<String> repeated, String feedback) {
}
