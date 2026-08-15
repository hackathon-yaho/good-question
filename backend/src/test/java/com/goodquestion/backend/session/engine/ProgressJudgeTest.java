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
        ProgressInput input = new ProgressInput(2, 2, 4, List.of(), false, ResponseMode.NORMAL, 0, 0, false, null, 0, false, 2);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.CLOSING);
        assertThat(decision.endReason()).isEqualTo(SceneEndReason.GOAL_MET);
    }

    @Test
    void 필수요소_충족해도_preferredTurns_미달이면_종료하지_않는다() {
        ProgressInput input = new ProgressInput(1, 2, 4, List.of(), true, ResponseMode.NORMAL, 0, 0, false, null, 0, false, 2);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isNotEqualTo(ResponseMode.CLOSING);
    }

    @Test
    void maxTurns_도달시_missing_남아있어도_MAX_TURNS로_종료() {
        // 보호 예산(2)이 이미 소진된 상태 — 정체 조건과 무관하게 MAX_TURNS가 그대로 적용됨을 확인.
        ProgressInput input = new ProgressInput(4, 2, 4, List.of("SOLUTION"), false, ResponseMode.NORMAL, 3, 3, false, null, 0, false, 2);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.CLOSING);
        assertThat(decision.endReason()).isEqualTo(SceneEndReason.MAX_TURNS);
    }

    @Test
    void 첫_발화는_유도_조건을_만족해도_NORMAL_강제() {
        // 정체·저정보·보호 조건이 전혀 없는 진짜 첫 발화 — isFirstUtterance만으로 NORMAL이 강제된다.
        ProgressInput input = new ProgressInput(1, 4, 6, List.of("SOLUTION"), false, null, 0, 0, false, null, 0, false, 0);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.NORMAL);
    }

    @Test
    void 이번턴_신규요소_확인시_유도조건_만족해도_NORMAL_강제() {
        ProgressInput input = new ProgressInput(3, 4, 6, List.of("SOLUTION"), true, ResponseMode.NORMAL, 5, 5, false, null, 0, false, 2);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.NORMAL);
    }

    @Test
    void 직전턴이_GUIDED였으면_유도조건_없으면_NORMAL_강제() {
        // 정체·저정보·보호 조건이 전혀 없는 상태 — previousWasGuided만으로 NORMAL이 강제된다.
        ProgressInput input = new ProgressInput(3, 4, 6, List.of("SOLUTION"), false, ResponseMode.GUIDED, 0, 0, false, null, 0, false, 0);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.NORMAL);
    }

    @Test
    void 신규요소_없음이_2회_연속이면_GUIDED() {
        ProgressInput input = new ProgressInput(3, 4, 6, List.of("SOLUTION"), false, ResponseMode.NORMAL, 2, 0, false, null, 0, false, 2);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.GUIDED);
    }

    @Test
    void 저정보_발화가_2회_연속이면_GUIDED() {
        ProgressInput input = new ProgressInput(3, 4, 6, List.of("SOLUTION"), false, ResponseMode.NORMAL, 0, 2, false, null, 0, false, 2);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.GUIDED);
    }

    @Test
    void 남은_턴이_2_이하면_GUIDED() {
        ProgressInput input = new ProgressInput(4, 10, 6, List.of("SOLUTION"), false, ResponseMode.NORMAL, 0, 0, false, null, 0, false, 2);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.GUIDED);
    }

    @Test
    void missing이_없으면_정체_조건이_충족돼도_GUIDED가_아니다() {
        ProgressInput input = new ProgressInput(2, 10, 6, List.of(), false, ResponseMode.NORMAL, 5, 5, false, null, 0, false, 2);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.NORMAL);
    }

    @Test
    void 유도조건_어느것도_해당없으면_NORMAL() {
        ProgressInput input = new ProgressInput(2, 10, 10, List.of("SOLUTION"), false, ResponseMode.NORMAL, 0, 0, false, null, 0, false, 2);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.NORMAL);
    }

    @Test
    void maxTurns_도달이_첫_발화_NORMAL_강제보다_우선한다() {
        // 종료 조건(1단계)이 강한 유도 제한(4단계)보다 먼저 확인되어야 한다. 보호 예산도
        // 소진시켜 2단계(보호 GUIDED)가 먼저 가로채지 않게 한다.
        ProgressInput input = new ProgressInput(1, 10, 1, List.of("SOLUTION"), false, null, 0, 0, false, null, 0, false, 2);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.CLOSING);
        assertThat(decision.endReason()).isEqualTo(SceneEndReason.MAX_TURNS);
    }

    // ── D-29: 미공개 미션이 있으면 GOAL_MET을 maxTurns 전까지 미룬다 ────────────

    @Test
    void GOAL_MET_조건이어도_미공개_미션이_있으면_maxTurns_전까지_종료를_미룬다() {
        ProgressInput input = new ProgressInput(2, 2, 4, List.of(), false, ResponseMode.NORMAL, 0, 0, true, null, 0, false, 2);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isNotEqualTo(ResponseMode.CLOSING);
    }

    @Test
    void 미공개_미션이_있어도_maxTurns_도달하면_MAX_TURNS로_종료한다() {
        ProgressInput input = new ProgressInput(4, 2, 4, List.of("SOLUTION"), false, ResponseMode.NORMAL, 3, 3, true, null, 0, false, 2);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.CLOSING);
        assertThat(decision.endReason()).isEqualTo(SceneEndReason.MAX_TURNS);
    }

    // ── D-50: 미션 노출 후엔 장면의 maxTurns를 무시하고, 미션 자체의 턴 예산(최소 1~최대 4,
    // GUIDED로 응답한 턴은 미포함)만 따른다 ──────────────────────────────────

    @Test
    void 미션_활성_최소턴_미달이면_필수요소_충족해도_GOAL_MET으로_닫지_않는다() {
        // missionEngagedTurns=0(최소 1 미달) — turnCount가 원래 maxTurns(4)를 넘어도 안 닫힌다.
        ProgressInput input = new ProgressInput(9, 2, 4, List.of(), false, ResponseMode.NORMAL, 0, 0, false, 3, 0, false, 2);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isNotEqualTo(ResponseMode.CLOSING);
    }

    @Test
    void 미션_활성_최소턴_충족하면_필수요소_충족시_GOAL_MET으로_닫는다() {
        ProgressInput input = new ProgressInput(9, 2, 4, List.of(), false, ResponseMode.NORMAL, 0, 0, false, 3, 1, false, 2);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.CLOSING);
        assertThat(decision.endReason()).isEqualTo(SceneEndReason.GOAL_MET);
    }

    @Test
    void 미션_활성_최대턴_미달이면_원래_maxTurns를_넘겨도_MAX_TURNS로_닫지_않는다() {
        // missionEngagedTurns=3(최대 4 미달) — turnCount가 원래 maxTurns(4)를 훌쩍 넘어도 안 닫힌다.
        ProgressInput input = new ProgressInput(9, 2, 4, List.of("SOLUTION"), false, ResponseMode.NORMAL, 3, 3, false, 3, 3, false, 2);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isNotEqualTo(ResponseMode.CLOSING);
    }

    @Test
    void 미션_활성_최대턴_도달하면_원래_maxTurns보다_한참_전이어도_MAX_TURNS로_닫는다() {
        // missionEngagedTurns=4(최대 도달) — turnCount(4)는 원래 maxTurns(4)와 같을 뿐인데도
        // GUIDED로 응답한 턴들 때문에 실제 대화 턴은 이보다 훨씬 많았을 수 있다.
        ProgressInput input = new ProgressInput(4, 2, 4, List.of("SOLUTION"), false, ResponseMode.NORMAL, 3, 3, false, 1, 4, false, 2);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.CLOSING);
        assertThat(decision.endReason()).isEqualTo(SceneEndReason.MAX_TURNS);
    }

    // ── low-engagement-turn-protection.md: GUIDED 2회 보호 턴 ────────────────

    @Test
    void 명백한_0정보_거절이면_첫_발화부터_보호_GUIDED_후보다() {
        ProgressInput input = new ProgressInput(1, 4, 6, List.of("SOLUTION"), false, null, 0, 0, false, null, 0, true, 0);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.GUIDED);
        assertThat(decision.protectedTurn()).isTrue();
    }

    @Test
    void 보호_예산이_남아있으면_MAX_TURNS_도달턴이어도_보호_GUIDED가_우선한다() {
        // maxTurns=3, turnCount=3 — MAX_TURNS 조건이 성립하지만 보호 GUIDED가 먼저 반환돼야 한다.
        ProgressInput input = new ProgressInput(3, 4, 3, List.of("SOLUTION"), false, ResponseMode.NORMAL, 0, 0, false, null, 0, true, 0);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.GUIDED);
        assertThat(decision.protectedTurn()).isTrue();
    }

    @Test
    void 보호_예산을_다_쓰면_같은_조건이어도_보호_GUIDED가_아니다() {
        ProgressInput input = new ProgressInput(1, 4, 6, List.of("SOLUTION"), false, null, 0, 0, false, null, 0, true, 2);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.protectedTurn()).isFalse();
    }

    @Test
    void 보호_소진후에도_정체가_이어지면_직전_GUIDED여도_NORMAL로_되돌리지_않는다() {
        // low-engagement-turn-protection.md 검증 시나리오 3번째 턴 — 보호 예산(2) 소진, 정체 지속.
        ProgressInput input = new ProgressInput(1, 4, 3, List.of("SOLUTION"), false, ResponseMode.GUIDED, 0, 3, false, null, 0, true, 2);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.GUIDED);
        assertThat(decision.protectedTurn()).isFalse();
    }

    @Test
    void 미션_활성중_보호_GUIDED는_미션_최대턴_종료보다_우선한다() {
        // missionEngagedTurns가 이미 최대(4)에 도달했어도 보호 예산이 남아 있으면 GUIDED가 우선.
        ProgressInput input = new ProgressInput(9, 2, 4, List.of("SOLUTION"), false, ResponseMode.NORMAL, 0, 0, false, 3, 4, true, 0);

        ProgressDecision decision = ProgressJudge.judge(input);

        assertThat(decision.mode()).isEqualTo(ResponseMode.GUIDED);
        assertThat(decision.protectedTurn()).isTrue();
    }
}
