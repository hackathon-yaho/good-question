package com.goodquestion.backend.activity.dto.response;

/** newWordCount는 항상 0이다 — 단어장(wordbook, O-06~O-10)이 선택-후순위라 아직 없다. */
public record ActivityStatsResponse(int childUtteranceCount, int characterCount, int newWordCount) {
}
