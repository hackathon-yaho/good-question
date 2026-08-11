package com.goodquestion.backend.story.constant;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MissionsTest {

    @Test
    void 대화3_대화4에만_미션이_있다() {
        assertThat(Missions.forSceneOrder(7)).isEqualTo(Missions.MISSION_1);
        assertThat(Missions.forSceneOrder(9)).isEqualTo(Missions.MISSION_2);
        assertThat(Missions.forSceneOrder(3)).isNull();
        assertThat(Missions.forSceneOrder(5)).isNull();
    }
}
