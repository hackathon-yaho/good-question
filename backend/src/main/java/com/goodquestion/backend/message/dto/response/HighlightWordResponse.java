package com.goodquestion.backend.message.dto.response;

/** 장면별 후보 단어(story/constant/HighlightWords)가 이번 턴 캐릭터 응답에 실제로 있을 때만 채워진다 (D-22). */
public record HighlightWordResponse(String word, String meaning) {
}
