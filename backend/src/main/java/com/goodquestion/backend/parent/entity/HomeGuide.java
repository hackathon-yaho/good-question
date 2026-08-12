package com.goodquestion.backend.parent.entity;

import java.util.List;

/** 리포트 가이드 6·7절 — 가정 연계 대화 가이드. */
public record HomeGuide(String intro, List<String> storyQuestions, List<String> dailyQuestions) {
}
