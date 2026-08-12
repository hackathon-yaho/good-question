package com.goodquestion.backend.story.constant;

/** HighlightWords.forSceneOrder()가 반환하는 후보. 캐릭터 대사에 실제로 등장할 때만 노출된다. */
public record HighlightWordCandidate(String word, String meaning) {
}
