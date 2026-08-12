package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.session.enums.ResponseMode;
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

    // ── selectForTurn: GUIDED + O-13 NORMAL soft-cue ────────────────────────

    @Test
    void GUIDED면_항상_유도_대상을_고른다() {
        String result = GuidanceSelector.selectForTurn(
                ResponseMode.GUIDED, "disagreement", List.of("SOLUTION"), false, null);

        assertThat(result).isEqualTo("SOLUTION");
    }

    @Test
    void NORMAL이어도_신규요소_확인에다_missing이_남고_반응이_소프트큐_대상이면_유도_대상을_고른다() {
        String result = GuidanceSelector.selectForTurn(
                ResponseMode.NORMAL, "disagreement", List.of("SOLUTION"), true, null);

        assertThat(result).isEqualTo("SOLUTION");
    }

    @Test
    void NORMAL인데_신규요소가_없으면_소프트큐를_걸지_않는다() {
        String result = GuidanceSelector.selectForTurn(
                ResponseMode.NORMAL, "disagreement", List.of("SOLUTION"), false, null);

        assertThat(result).isNull();
    }

    @Test
    void NORMAL이고_신규요소가_있어도_missing이_없으면_소프트큐를_걸지_않는다() {
        String result = GuidanceSelector.selectForTurn(
                ResponseMode.NORMAL, "disagreement", List.of(), true, null);

        assertThat(result).isNull();
    }

    @Test
    void NORMAL이고_조건이_맞아도_장난_질문_불명확_반응이면_소프트큐를_스킵한다() {
        assertThat(GuidanceSelector.selectForTurn(
                ResponseMode.NORMAL, "playfulUtterance", List.of("SOLUTION"), true, null)).isNull();
        assertThat(GuidanceSelector.selectForTurn(
                ResponseMode.NORMAL, "questionFromChild", List.of("SOLUTION"), true, null)).isNull();
        assertThat(GuidanceSelector.selectForTurn(
                ResponseMode.NORMAL, "unclearUtterance", List.of("SOLUTION"), true, null)).isNull();
    }

    @Test
    void CLOSING이면_유도_대상을_고르지_않는다() {
        String result = GuidanceSelector.selectForTurn(
                ResponseMode.CLOSING, "directResponse", List.of("SOLUTION"), true, null);

        assertThat(result).isNull();
    }
}
