package com.goodquestion.backend.message.dto.response;

/** 8세 이하용 후보가 이번 턴 캐릭터 응답에 실제로 있을 때만 최대 하나 채워진다 (D-22). */
public record HighlightWordResponse(String word, String meaning) {
}
