package com.goodquestion.backend.story.constant;

import com.goodquestion.backend.common.enums.ThoughtElement;
import com.goodquestion.backend.common.global.exception.BusinessException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DialogueContentsTest {

    @Test
    void 대화1_며느리는_네_요소_전부_다른_문구를_가진다() {
        DialogueSceneConstants scene3 = DialogueContents.forSceneOrder(3);

        assertThat(scene3.characterDisplayName()).isEqualTo("방귀쟁이 며느리");
        assertThat(scene3.remainingWorries()).hasSize(4);
        assertThat(scene3.remainingWorries().stream().map(RemainingWorry::worry).distinct()).hasSize(4);
    }

    @Test
    void 대화1과_대화4는_같은_캐릭터지만_remainingWorry가_다르다() {
        String scene3Emotion = DialogueContents.remainingWorryFor(3, ThoughtElement.EMOTION);
        String scene9Emotion = DialogueContents.remainingWorryFor(9, ThoughtElement.EMOTION);

        assertThat(scene3Emotion).isNotEqualTo(scene9Emotion);
    }

    @Test
    void 대화3에_없는_요소를_조회하면_null이다() {
        assertThat(DialogueContents.remainingWorryFor(7, ThoughtElement.EMOTION)).isNull();
    }

    @Test
    void 대화_장면이_아닌_scene_order는_예외다() {
        assertThatThrownBy(() -> DialogueContents.forSceneOrder(1))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void 같은_캐릭터인_대화1과_대화4는_ttsVoice가_같다() {
        assertThat(DialogueContents.forSceneOrder(3).ttsVoice())
                .isEqualTo(DialogueContents.forSceneOrder(9).ttsVoice());
    }

    @Test
    void 서로_다른_캐릭터인_대화2와_대화3은_ttsVoice가_다르다() {
        assertThat(DialogueContents.forSceneOrder(5).ttsVoice())
                .isNotEqualTo(DialogueContents.forSceneOrder(7).ttsVoice());
    }
}
