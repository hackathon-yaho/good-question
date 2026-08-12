package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.message.entity.DetectedElement;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AccumulatedElementsCalculatorTest {

    @Test
    void 기존_누적에_새_요소를_합친다() {
        var result = AccumulatedElementsCalculator.accumulate(
                List.of("EMOTION"), List.of(new DetectedElement("REASON", "evidence")));

        assertThat(result).containsExactlyInAnyOrder("EMOTION", "REASON");
    }

    @Test
    void 이미_있는_요소는_중복되지_않는다() {
        var result = AccumulatedElementsCalculator.accumulate(
                List.of("EMOTION"), List.of(new DetectedElement("EMOTION", "evidence")));

        assertThat(result).containsExactly("EMOTION");
    }

    @Test
    void newlyAccumulatedTypes는_기존에_없던_것만_반환한다() {
        var result = AccumulatedElementsCalculator.newlyAccumulatedTypes(
                List.of("EMOTION"),
                List.of(new DetectedElement("EMOTION", "e1"), new DetectedElement("REASON", "e2")));

        assertThat(result).containsExactly("REASON");
    }

    @Test
    void missing은_누적되지_않은_필수요소만_남긴다() {
        var result = AccumulatedElementsCalculator.missing(
                List.of("PERSPECTIVE", "EMOTION", "REASON", "SOLUTION"),
                List.of("PERSPECTIVE", "EMOTION"));

        assertThat(result).containsExactly("REASON", "SOLUTION");
    }

    @Test
    void 모든_요소가_충족되면_missing이_비어있다() {
        var result = AccumulatedElementsCalculator.missing(
                List.of("PERSPECTIVE"), List.of("PERSPECTIVE"));

        assertThat(result).isEmpty();
    }
}
