package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.message.enums.CharacterState;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CharacterStateMapperTest {

    @Test
    void playfulUtterance는_HAPPY() {
        assertThat(CharacterStateMapper.map("playfulUtterance", false)).isEqualTo(CharacterState.HAPPY);
    }

    @Test
    void empathyFromChild는_HAPPY() {
        assertThat(CharacterStateMapper.map("empathyFromChild", false)).isEqualTo(CharacterState.HAPPY);
    }

    @Test
    void proposalFromChild가_신규요소를_채우면_MOVED() {
        assertThat(CharacterStateMapper.map("proposalFromChild", true)).isEqualTo(CharacterState.MOVED);
    }

    @Test
    void proposalFromChild가_신규요소를_못채우면_SURPRISED() {
        assertThat(CharacterStateMapper.map("proposalFromChild", false)).isEqualTo(CharacterState.SURPRISED);
    }

    @Test
    void unclearUtterance는_WORRIED() {
        assertThat(CharacterStateMapper.map("unclearUtterance", false)).isEqualTo(CharacterState.WORRIED);
    }

    @Test
    void disagreement는_WORRIED() {
        assertThat(CharacterStateMapper.map("disagreement", false)).isEqualTo(CharacterState.WORRIED);
    }

    @Test
    void directResponse는_NEUTRAL() {
        assertThat(CharacterStateMapper.map("directResponse", false)).isEqualTo(CharacterState.NEUTRAL);
    }

    @Test
    void questionFromChild는_NEUTRAL() {
        assertThat(CharacterStateMapper.map("questionFromChild", false)).isEqualTo(CharacterState.NEUTRAL);
    }
}
