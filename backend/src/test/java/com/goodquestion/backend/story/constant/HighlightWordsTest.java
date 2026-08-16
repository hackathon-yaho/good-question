package com.goodquestion.backend.story.constant;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class HighlightWordsTest {

    @Test
    void returnsOnlyOneCandidateThatAppearsInTheCurrentCharacterText() {
        assertThat(HighlightWords.findInCharacterText(3, "아직 말할지 망설여.")).containsExactly(
                new HighlightWordCandidate("망설여", "어떻게 할지 바로 정하지 못하고 고민하는 모습"));
    }

    @Test
    void neverReturnsAWordThatIsAbsentFromTheCurrentCharacterText() {
        assertThat(HighlightWords.findInCharacterText(3, "아직 말할 용기가 안 나.")).isEmpty();
        assertThat(HighlightWords.findInCharacterText(3, null)).isEmpty();
    }
}
