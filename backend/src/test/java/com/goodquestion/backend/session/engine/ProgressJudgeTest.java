package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.session.enums.ResponseMode;
import com.goodquestion.backend.session.enums.SceneEndReason;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** PRD 6.9 판단 순서를 그대로 검증한다. 순서가 바뀌면 이 테스트들이 깨져야 한다. */
class ProgressJudgeTest {

    @Test
    void 필수요소_충족_및_preferredTurns_도달시_GOAL_MET로_종료() {
        ProgressInput input = new ProgressInput(2, 2, 4, List.of(), false, ResponseMode.NORMAL, 0, 0, false);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.CLOSING);
        assertThat(decision.endReason()).isEqualTo(SceneEndReason.GOAL_MET);
    }

    @Test
    void 필수요소_충족해도_preferredTurns_미달이면_종료하지_않는다() {
        ProgressInput input = new ProgressInput(1, 2, 4, List.of(), true, ResponseMode.NORMAL, 0, 0, false);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isNotEqualTo(ResponseMode.CLOSING);
    }

    @Test
    void maxTurns_도달시_missing_남아있어도_MAX_TURNS로_종료() {
        ProgressInput input = new ProgressInput(4, 2, 4, List.of("SOLUTION"), false, ResponseMode.NORMAL, 3, 3, false);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.CLOSING);
        assertThat(decision.endReason()).isEqualTo(SceneEndReason.MAX_TURNS);
    }

    @Test
    void 첫_발화는_유도_조건을_만족해도_NORMAL_강제() {
        ProgressInput input = new ProgressInput(1, 4, 6, List.of("SOLUTION"), false, null, 5, 5, false);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.NORMAL);
    }

    @Test
    void 이번턴_신규요소_확인시_유도조건_만족해도_NORMAL_강제() {
        ProgressInput input = new ProgressInput(3, 4, 6, List.of("SOLUTION"), true, ResponseMode.NORMAL, 5, 5, false);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.NORMAL);
    }

    @Test
    void 직전턴이_GUIDED였으면_유도조건_만족해도_NORMAL_강제() {
        ProgressInput input = new ProgressInput(3, 4, 6, List.of("SOLUTION"), false, ResponseMode.GUIDED, 5, 5, false);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.NORMAL);
    }

    @Test
    void 신규요소_없음이_2회_연속이면_GUIDED() {
        ProgressInput input = new ProgressInput(3, 4, 6, List.of("SOLUTION"), false, ResponseMode.NORMAL, 2, 0, false);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.GUIDED);
    }

    @Test
    void 저정보_발화가_2회_연속이면_GUIDED() {
        ProgressInput input = new ProgressInput(3, 4, 6, List.of("SOLUTION"), false, ResponseMode.NORMAL, 0, 2, false);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.GUIDED);
    }

    @Test
    void 남은_턴이_2_이하면_GUIDED() {
        ProgressInput input = new ProgressInput(4, 10, 6, List.of("SOLUTION"), false, ResponseMode.NORMAL, 0, 0, false);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.GUIDED);
    }

    @Test
    void missing이_없으면_정체_조건이_충족돼도_GUIDED가_아니다() {
        ProgressInput input = new ProgressInput(2, 10, 6, List.of(), false, ResponseMode.NORMAL, 5, 5, false);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.NORMAL);
    }

    @Test
    void 유도조건_어느것도_해당없으면_NORMAL() {
        ProgressInput input = new ProgressInput(2, 10, 10, List.of("SOLUTION"), false, ResponseMode.NORMAL, 0, 0, false);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.NORMAL);
    }

    @Test
    void maxTurns_도달이_첫_발화_NORMAL_강제보다_우선한다() {
        // 종료 조건(1단계)이 강한 유도 제한(2단계)보다 먼저 확인되어야 한다.
        ProgressInput input = new ProgressInput(1, 10, 1, List.of("SOLUTION"), false, null, 0, 0, false);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.CLOSING);
        assertThat(decision.endReason()).isEqualTo(SceneEndReason.MAX_TURNS);
    }

    // ── D-29: 미공개 미션이 있으면 GOAL_MET을 maxTurns 전까지 미룬다 ────────────

    @Test
    void GOAL_MET_조건이어도_미공개_미션이_있으면_maxTurns_전까지_종료를_미룬다() {
        ProgressInput input = new ProgressInput(2, 2, 4, List.of(), false, ResponseMode.NORMAL, 0, 0, true);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isNotEqualTo(ResponseMode.CLOSING);
    }

    @Test
    void 미공개_미션이_있어도_maxTurns_도달하면_MAX_TURNS로_종료한다() {
        ProgressInput input = new ProgressInput(4, 2, 4, List.of("SOLUTION"), false, ResponseMode.NORMAL, 3, 3, true);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.CLOSING);
        assertThat(decision.endReason()).isEqualTo(SceneEndReason.MAX_TURNS);
    }
}
