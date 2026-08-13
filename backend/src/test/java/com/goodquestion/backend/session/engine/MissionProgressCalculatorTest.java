package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.story.constant.MissionChecklistItem;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MissionProgressCalculatorTest {

    /** 미션1과 같은 형태 — 1·2번이 같은 요소(SOLUTION)다. */
    private static final List<MissionChecklistItem> CHECKLIST = List.of(
            new MissionChecklistItem("무엇을 사용할까?", "SOLUTION"),
            new MissionChecklistItem("사람들은 어디로 피할까?", "SOLUTION"),
            new MissionChecklistItem("며느리에게 어떻게 부탁할까?", "REQUEST"),
            new MissionChecklistItem("그러면 어떤 일이 생길까?", "RESULT")
    );

    @Test
    void 아직_발화가_없으면_아무것도_채워지지_않는다() {
        var result = MissionProgressCalculator.satisfiedIndexes(CHECKLIST, List.of());

        assertThat(result).isEmpty();
    }

    @Test
    void 같은_요소가_반복되면_먼저_나오는_칸부터_순서대로_채운다() {
        // SOLUTION이 연속 두 턴에서 확인되면 1번(index 0), 2번(index 1) 순서로 채워져야 한다.
        var result = MissionProgressCalculator.satisfiedIndexes(CHECKLIST,
                List.of(List.of("SOLUTION"), List.of("SOLUTION")));

        assertThat(result).containsExactly(0, 1);
    }

    @Test
    void 같은_요소가_세번째_확인되면_더_채울_칸이_없어_무시된다() {
        var result = MissionProgressCalculator.satisfiedIndexes(CHECKLIST,
                List.of(List.of("SOLUTION"), List.of("SOLUTION"), List.of("SOLUTION")));

        assertThat(result).containsExactly(0, 1);
    }

    @Test
    void 한_턴에_여러_요소가_확인되면_그_턴에서_여러_칸이_동시에_채워진다() {
        var result = MissionProgressCalculator.satisfiedIndexes(CHECKLIST,
                List.of(List.of("SOLUTION", "REQUEST")));

        assertThat(result).containsExactly(0, 2);
    }

    @Test
    void 체크리스트에_없는_요소는_무시된다() {
        var result = MissionProgressCalculator.satisfiedIndexes(CHECKLIST,
                List.of(List.of("EMOTION")));

        assertThat(result).isEmpty();
    }

    @Test
    void 전체_항목이_채워지면_모든_인덱스를_순서대로_반환한다() {
        var result = MissionProgressCalculator.satisfiedIndexes(CHECKLIST,
                List.of(List.of("SOLUTION"), List.of("REQUEST"), List.of("SOLUTION"), List.of("RESULT")));

        assertThat(result).containsExactly(0, 2, 1, 3);
    }
}
