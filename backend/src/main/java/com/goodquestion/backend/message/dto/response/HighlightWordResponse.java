package com.goodquestion.backend.message.dto.response;

/** 당분간 항상 빈 배열로 응답한다 — 밑줄 단어 선정 기준이 어느 문서에도 없다 (decisions.md D-11). */
public record HighlightWordResponse(String word, String meaning) {
}
