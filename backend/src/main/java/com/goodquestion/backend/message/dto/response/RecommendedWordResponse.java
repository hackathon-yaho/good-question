package com.goodquestion.backend.message.dto.response;

import com.goodquestion.backend.story.constant.SceneVocabularyWord;

/** 장면의 "오늘의 단어" 카드 (scene-vocabulary-recommendation.md). highlightWords와 별개. */
public record RecommendedWordResponse(String word, String meaning) {

    public static RecommendedWordResponse from(SceneVocabularyWord word) {
        return word == null ? null : new RecommendedWordResponse(word.word(), word.meaning());
    }
}
