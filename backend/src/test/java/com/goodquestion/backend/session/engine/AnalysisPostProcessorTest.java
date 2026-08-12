package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.message.entity.DetectedElement;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AnalysisPostProcessorTest {

    private static final String CHILD_UTTERANCE = "며느리가 창피해서 계속 참았던 것 같아요.";

    @Test
    void 원문에_실제로_있는_evidence는_통과한다() {
        var elements = List.of(new DetectedElement("PERSPECTIVE", "창피해서 계속 참았던 것 같아요"));

        var result = AnalysisPostProcessor.process(elements, CHILD_UTTERANCE);

        assertThat(result).hasSize(1);
    }

    @Test
    void 원문에_없는_evidence는_삭제한다() {
        var elements = List.of(new DetectedElement("PERSPECTIVE", "존재하지 않는 문장입니다"));

        var result = AnalysisPostProcessor.process(elements, CHILD_UTTERANCE);

        assertThat(result).isEmpty();
    }

    @Test
    void 같은_type_중복이면_하나로_정리한다() {
        var elements = List.of(
                new DetectedElement("PERSPECTIVE", "창피해서"),
                new DetectedElement("PERSPECTIVE", "계속 참았던 것 같아요")
        );

        var result = AnalysisPostProcessor.process(elements, CHILD_UTTERANCE);

        assertThat(result).hasSize(1);
    }

    @Test
    void 스키마에_없는_type은_제거한다() {
        var elements = List.of(new DetectedElement("NOT_A_REAL_TYPE", "창피해서"));

        var result = AnalysisPostProcessor.process(elements, CHILD_UTTERANCE);

        assertThat(result).isEmpty();
    }

    @Test
    void null_입력은_빈_리스트를_반환한다() {
        assertThat(AnalysisPostProcessor.process(null, CHILD_UTTERANCE)).isEmpty();
    }
}
