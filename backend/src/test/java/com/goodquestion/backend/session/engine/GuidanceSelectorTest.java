package com.goodquestion.backend.session.engine;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class GuidanceSelectorTest {

    @Test
    void 직전_유도_요소가_아닌_것을_우선한다() {
        String result = GuidanceSelector.select(List.of("REASON", "SOLUTION"), "REASON");

        assertThat(result).isEqualTo("SOLUTION");
    }

    @Test
    void missing이_직전_요소_하나뿐이면_그것을_다시_선택한다() {
        String result = GuidanceSelector.select(List.of("REASON"), "REASON");

        assertThat(result).isEqualTo("REASON");
    }

    @Test
    void 직전_유도가_없으면_첫번째_missing을_선택한다() {
        String result = GuidanceSelector.select(List.of("PERSPECTIVE", "REASON"), null);

        assertThat(result).isEqualTo("PERSPECTIVE");
    }

    @Test
    void missing이_비어있으면_null() {
        assertThat(GuidanceSelector.select(List.of(), "REASON")).isNull();
    }
}
