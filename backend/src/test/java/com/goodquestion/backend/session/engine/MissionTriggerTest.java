package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.common.enums.ThoughtElement;
import com.goodquestion.backend.message.enums.ChildIntent;
import com.goodquestion.backend.session.enums.ResponseMode;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** PRD 7.6의 미션1 4개 조건을 각각 독립적으로 검증한다. */
class MissionTriggerTest {

    /** 어떤 조건에도 걸리지 않는 기준 상태 — 각 테스트는 여기서 한 가지만 바꾼다. */
    private static MissionTriggerContext baseline() {
        return new MissionTriggerContext(
                1, ChildIntent.OPINION, "배가 높이 있네요.",
                List.of("REASON"), List.of("REQUEST", "RESULT"),
                ResponseMode.NORMAL, null);
    }

    @Test
    void 기준_상태에서는_노출되지_않는다() {
        assertThat(MissionTrigger.shouldRevealMission1(baseline())).isFalse();
    }

    // ── 조건 1: 방귀를 활용하겠다는 제안 ─────────────────────────────────

    @Test
    void 조건1_방귀_활용을_제안하면_첫턴에도_노출() {
        MissionTriggerContext context = new MissionTriggerContext(
                1, ChildIntent.SOLUTION, "며느리 방귀로 배를 떨어뜨려요.",
                List.of("SOLUTION"), List.of("REQUEST"), ResponseMode.NORMAL, null);

        assertThat(MissionTrigger.shouldRevealMission1(context)).isTrue();
    }

    @Test
    void 조건1_방귀와_무관한_해결책_제안만으로는_노출되지_않는다() {
        // SOLUTION이 이미 누적돼 조건 2·3도 성립하지 않는 상태 — 조건 1만 따로 본다.
        MissionTriggerContext context = new MissionTriggerContext(
                1, ChildIntent.SOLUTION, "장대를 쓰면 될 것 같아요.",
                List.of("SOLUTION"), List.of("REQUEST"), ResponseMode.NORMAL, null);

        assertThat(MissionTrigger.shouldRevealMission1(context)).isFalse();
    }

    // ── 조건 2: 방향은 말했으나 기준 미통과 ───────────────────────────────

    @Test
    void 조건2_해결_의도는_있지만_SOLUTION이_누적되지_않았으면_노출() {
        MissionTriggerContext context = new MissionTriggerContext(
                1, ChildIntent.SOLUTION, "어떻게든 해보면 될 것 같아요.",
                List.of(), List.of("SOLUTION"), ResponseMode.NORMAL, null);

        assertThat(MissionTrigger.shouldRevealMission1(context)).isTrue();
    }

    @Test
    void 조건2_SOLUTION이_이미_누적됐으면_노출되지_않는다() {
        MissionTriggerContext context = new MissionTriggerContext(
                1, ChildIntent.SOLUTION, "장대를 쓰면 될 것 같아요.",
                List.of("SOLUTION"), List.of("REQUEST"), ResponseMode.NORMAL, null);

        assertThat(MissionTrigger.shouldRevealMission1(context)).isFalse();
    }

    // ── 조건 3: 2회 이상인데 방법 미확인 ─────────────────────────────────

    @Test
    void 조건3_두턴_이상이고_SOLUTION이_미확인이면_노출() {
        MissionTriggerContext context = new MissionTriggerContext(
                2, ChildIntent.OPINION, "잘 모르겠어요.",
                List.of(), List.of("SOLUTION"), ResponseMode.NORMAL, null);

        assertThat(MissionTrigger.shouldRevealMission1(context)).isTrue();
    }

    @Test
    void 조건3_첫턴이면_SOLUTION이_미확인이어도_이_조건으로는_노출되지_않는다() {
        MissionTriggerContext context = new MissionTriggerContext(
                1, ChildIntent.OPINION, "잘 모르겠어요.",
                List.of(), List.of("SOLUTION"), ResponseMode.NORMAL, null);

        assertThat(MissionTrigger.shouldRevealMission1(context)).isFalse();
    }

    // ── 조건 4: 유도했는데도 안 나옴 ────────────────────────────────────

    @Test
    void 조건4_직전턴에_SOLUTION을_유도했는데_여전히_미확인이면_노출() {
        MissionTriggerContext context = new MissionTriggerContext(
                1, ChildIntent.OPINION, "음….",
                List.of(), List.of("SOLUTION"), ResponseMode.GUIDED, ThoughtElement.SOLUTION);

        assertThat(MissionTrigger.shouldRevealMission1(context)).isTrue();
    }

    @Test
    void 조건4_다른_요소를_유도했던_경우는_이_조건에_해당하지_않는다() {
        MissionTriggerContext context = new MissionTriggerContext(
                1, ChildIntent.OPINION, "음….",
                List.of("SOLUTION"), List.of("REASON"), ResponseMode.GUIDED, ThoughtElement.REASON);

        assertThat(MissionTrigger.shouldRevealMission1(context)).isFalse();
    }

    // ── 노출 원칙: 대화 시작과 동시에 보여주지 않는다 ──────────────────────

    @Test
    void 아이가_아직_말하지_않았으면_어떤_조건도_노출되지_않는다() {
        MissionTriggerContext context = new MissionTriggerContext(
                0, ChildIntent.SOLUTION, "며느리 방귀로 배를 떨어뜨려요.",
                List.of(), List.of("SOLUTION"), ResponseMode.GUIDED, ThoughtElement.SOLUTION);

        assertThat(MissionTrigger.shouldRevealMission1(context)).isFalse();
    }

    // ── 미션2 ────────────────────────────────────────────────────────

    @Test
    void 미션2_PERSPECTIVE와_REASON이_모두_누적되면_노출() {
        MissionTriggerContext context = new MissionTriggerContext(
                1, ChildIntent.PERSPECTIVE, "부끄러워하지 않아도 돼요.",
                List.of("PERSPECTIVE", "REASON"), List.of("RESULT"), ResponseMode.NORMAL, null);

        assertThat(MissionTrigger.shouldRevealMission2(context)).isTrue();
    }

    @Test
    void 미션2_이유가_아직_없으면_노출되지_않는다() {
        MissionTriggerContext context = new MissionTriggerContext(
                2, ChildIntent.PERSPECTIVE, "부끄러워하지 않아도 돼요.",
                List.of("PERSPECTIVE"), List.of("REASON", "RESULT"), ResponseMode.NORMAL, null);

        assertThat(MissionTrigger.shouldRevealMission2(context)).isFalse();
    }

    @Test
    void 미션2_아이가_아직_말하지_않았으면_노출되지_않는다() {
        MissionTriggerContext context = new MissionTriggerContext(
                0, ChildIntent.PERSPECTIVE, null,
                List.of("PERSPECTIVE", "REASON"), List.of(), ResponseMode.NORMAL, null);

        assertThat(MissionTrigger.shouldRevealMission2(context)).isFalse();
    }
}
