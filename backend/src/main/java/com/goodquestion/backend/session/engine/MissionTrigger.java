package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.common.enums.ThoughtElement;
import com.goodquestion.backend.message.enums.ChildIntent;
import com.goodquestion.backend.session.enums.ResponseMode;

/**
 * 미션 노출 판정 (M-47~M-49, PRD 7.6). AI 서버는 관여하지 않는다 —
 * 노출 시점은 백엔드가 결정한다 (roles.md 3.7).
 *
 * PRD 7.6의 미션1 조건 4개를 그대로 하나씩 옮겼다. "구체적인가"라는 판정은 새로 하지 않고
 * **`element_criteria` 통과 여부로 이미 내려진 판정을 읽는다** — 기준 미달 발화는 애초에
 * `detectedElements`에 들어오지 않으므로(PRD 6.4·6.7), `childIntent`(무엇을 하려 했는가)와
 * 누적 요소(무엇이 기준을 통과했는가)의 차이가 곧 "방향은 말했지만 구체적이지 않음"이다.
 */
public final class MissionTrigger {

    /** PRD 7.6 조건 3의 "2회 이상". */
    private static final int MIN_TURNS_FOR_STALLED_METHOD = 2;
    /** 미션은 대화 시작과 동시에 보여주지 않는다 (PRD 7.6 노출 원칙). */
    private static final int MIN_TURNS_BEFORE_ANY_REVEAL = 1;

    private static final String FART_KEYWORD = "방귀";
    private static final String SOLUTION = ThoughtElement.SOLUTION.name();
    private static final String PERSPECTIVE = ThoughtElement.PERSPECTIVE.name();
    private static final String REASON = ThoughtElement.REASON.name();

    private MissionTrigger() {
    }

    /** 미션1 (대화3). PRD 7.6의 4개 조건 중 하나라도 해당하면 노출한다. */
    public static boolean shouldRevealMission1(MissionTriggerContext context) {
        if (context.turnCount() < MIN_TURNS_BEFORE_ANY_REVEAL) return false;

        return proposedUsingFart(context)
                || directionWithoutConcreteMethod(context)
                || methodStalledAfterTwoTurns(context)
                || characterGuidanceDidNotWork(context);
    }

    /** 조건 1 — 아이가 며느리의 **방귀를 활용**할 수 있다고 제안한 경우. */
    private static boolean proposedUsingFart(MissionTriggerContext context) {
        return context.childIntent() == ChildIntent.SOLUTION
                && context.childUtterance() != null
                && context.childUtterance().contains(FART_KEYWORD);
    }

    /**
     * 조건 2 — 해결 방향은 말했지만 방법이 구체적이지 않은 경우.
     * 해결책을 말하려는 의도(childIntent)는 있는데 `element_criteria`를 통과하지 못해
     * SOLUTION이 아직 누적되지 않은 상태다.
     */
    private static boolean directionWithoutConcreteMethod(MissionTriggerContext context) {
        return context.childIntent() == ChildIntent.SOLUTION
                && !context.accumulatedElements().contains(SOLUTION);
    }

    /** 조건 3 — 2회 이상 대화했지만 실행 방법이 나오지 않은 경우. */
    private static boolean methodStalledAfterTwoTurns(MissionTriggerContext context) {
        return context.turnCount() >= MIN_TURNS_FOR_STALLED_METHOD
                && context.missingElements().contains(SOLUTION);
    }

    /**
     * 조건 4 — 캐릭터 질문만으로 해결 방법을 구체화하기 어려운 경우.
     * 직전 턴에 SOLUTION을 목표로 유도(GUIDED)했는데도 이번 턴까지 나오지 않은 상태로 본다.
     * 유도 횟수 카운터를 따로 두지 않는 이유는 대화 장면의 `max_turns`가 4~5라
     * 카운터가 2를 넘길 일이 없어 컬럼을 늘릴 이득이 없기 때문이다.
     */
    private static boolean characterGuidanceDidNotWork(MissionTriggerContext context) {
        return context.previousMode() == ResponseMode.GUIDED
                && context.previousGuidanceTarget() == ThoughtElement.SOLUTION
                && context.missingElements().contains(SOLUTION);
    }

    /**
     * 미션2 (대화4). PRD 7.6은 조건식 대신 흐름만 준다 —
     * "특징을 부끄러워하지 않아도 된다고 말함 → 긍정하는 이유 확인 → 관점 확장".
     *
     * 대화4의 `element_criteria`상 앞 두 단계가 각각 PERSPECTIVE("특징을 그 사람 입장에서
     * 바라보고 말한 경우")와 REASON("판단의 까닭")에 대응하므로, 둘이 모두 누적된 시점을
     * "관점을 넓힐 준비가 된 시점"으로 본다.
     */
    public static boolean shouldRevealMission2(MissionTriggerContext context) {
        return context.turnCount() >= MIN_TURNS_BEFORE_ANY_REVEAL
                && context.accumulatedElements().contains(PERSPECTIVE)
                && context.accumulatedElements().contains(REASON);
    }
}
