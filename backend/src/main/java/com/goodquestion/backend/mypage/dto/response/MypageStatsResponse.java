package com.goodquestion.backend.mypage.dto.response;

/** 점수·등급이 아니라 활동량이다 (PRD 10.1). */
public record MypageStatsResponse(int completedStories, int savedWords, int activeDays) {
}
