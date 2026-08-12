package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.message.enums.ChildIntent;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MissionTriggerTest {

    @Test
    void 아이가_방귀활용을_제안하면_1턴이어도_미션1_노출() {
        boolean result = MissionTrigger.shouldRevealMission1(1, ChildIntent.SOLUTION, List.of("SOLUTION"));
        assertThat(result).isTrue();
    }

    @Test
    void SOLUTION_제안없이_2턴_이상인데_SOLUTION이_미확인이면_미션1_노출() {
        boolean result = MissionTrigger.shouldRevealMission1(2, ChildIntent.OPINION, List.of("SOLUTION", "REASON"));
        assertThat(result).isTrue();
    }

    @Test
    void 첫턴이고_제안도_없으면_미션1_노출_안함() {
        boolean result = MissionTrigger.shouldRevealMission1(1, ChildIntent.OPINION, List.of("SOLUTION"));
        assertThat(result).isFalse();
    }

    @Test
    void SOLUTION이_이미_확인됐으면_미션1_노출_안함() {
        boolean result = MissionTrigger.shouldRevealMission1(3, ChildIntent.OPINION, List.of("REASON"));
        assertThat(result).isFalse();
    }

    @Test
    void 두턴_이상이고_RESULT_확인되면_미션2_노출() {
        boolean result = MissionTrigger.shouldRevealMission2(2, List.of("EMOTION", "RESULT"));
        assertThat(result).isTrue();
    }

    @Test
    void 첫턴이면_요소가_있어도_미션2_노출_안함() {
        boolean result = MissionTrigger.shouldRevealMission2(1, List.of("RESULT"));
        assertThat(result).isFalse();
    }
}
