package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.message.enums.ChildIntent;
import com.goodquestion.backend.message.enums.UtteranceValidity;
import com.goodquestion.backend.session.enums.ResponseMode;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ReactionKeyMapperTest {

    @Test
    void CLOSING이면_의도와_무관하게_directResponse() {
        String key = ReactionKeyMapper.map(ChildIntent.QUESTION, UtteranceValidity.VALID, ResponseMode.CLOSING);
        assertThat(key).isEqualTo("directResponse");
    }

    @Test
    void QUESTION은_questionFromChild() {
        String key = ReactionKeyMapper.map(ChildIntent.QUESTION, UtteranceValidity.VALID, ResponseMode.NORMAL);
        assertThat(key).isEqualTo("questionFromChild");
    }

    @Test
    void SOLUTION은_SHORT보다_우선해_proposalFromChild() {
        String key = ReactionKeyMapper.map(ChildIntent.SOLUTION, UtteranceValidity.SHORT, ResponseMode.NORMAL);
        assertThat(key).isEqualTo("proposalFromChild");
    }

    @Test
    void PLAYFUL_validity는_playfulUtterance() {
        String key = ReactionKeyMapper.map(ChildIntent.OPINION, UtteranceValidity.PLAYFUL, ResponseMode.NORMAL);
        assertThat(key).isEqualTo("playfulUtterance");
    }

    @Test
    void UNCLEAR_intent는_unclearUtterance() {
        String key = ReactionKeyMapper.map(ChildIntent.UNCLEAR, UtteranceValidity.UNCLEAR, ResponseMode.GUIDED);
        assertThat(key).isEqualTo("unclearUtterance");
    }

    @Test
    void EMOTION은_empathyFromChild() {
        String key = ReactionKeyMapper.map(ChildIntent.EMOTION, UtteranceValidity.VALID, ResponseMode.NORMAL);
        assertThat(key).isEqualTo("empathyFromChild");
    }

    @Test
    void OPINION_계열은_disagreement() {
        String key = ReactionKeyMapper.map(ChildIntent.OPINION, UtteranceValidity.VALID, ResponseMode.NORMAL);
        assertThat(key).isEqualTo("disagreement");
    }
}
