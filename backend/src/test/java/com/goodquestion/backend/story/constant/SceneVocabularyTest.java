package com.goodquestion.backend.story.constant;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** character-utterance-vocabulary-v2.md, D-58 — 후보 단어는 실제 확정 대사에 있을 때만 추천된다. */
class SceneVocabularyTest {

    @Test
    void 후보_단어가_Worker_응답_대사에_실제로_있으면_추천된다() {
        String workerResponse = "천천히 예의 바르게 말해도 괜찮아.";

        SceneVocabularyWord result = SceneVocabulary.matchInText(3, workerResponse);

        assertThat(result).isNotNull();
        assertThat(result.word()).isEqualTo("예의");
    }

    @Test
    void 후보_단어가_character_closing_폴백_대사에_실제로_있으면_추천된다() {
        String closingFallback = "그래도 예의를 지키는 게 중요해. 다음에 또 이야기하자.";

        SceneVocabularyWord result = SceneVocabulary.matchInText(3, closingFallback);

        assertThat(result).isNotNull();
        assertThat(result.word()).isEqualTo("예의");
    }

    @Test
    void 대사에_후보_단어가_없으면_null이다() {
        String characterText = "오늘은 날씨가 참 좋네.";

        assertThat(SceneVocabulary.matchInText(3, characterText)).isNull();
    }

    @Test
    void 후보가_없는_장면이면_대사와_무관하게_null이다() {
        assertThat(SceneVocabulary.matchInText(1, "예의 바르게 인사했다")).isNull();
    }

    @Test
    void 대사가_null이면_null이다() {
        assertThat(SceneVocabulary.matchInText(3, null)).isNull();
    }
}
