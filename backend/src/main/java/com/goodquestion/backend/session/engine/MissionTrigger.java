package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.message.enums.ChildIntent;

import java.util.List;

/**
 * 미션 노출 판정 (M-47~M-49, PRD 7.6). PRD의 노출 조건은 서술형이라 신호로 그대로 옮길 수 없는
 * 항목이 있다 — 사용 가능한 신호(childIntent, missingElements, turnCount)로 조작화했다 (decisions.md D-20).
 */
public final class MissionTrigger {

    private static final int MIN_TURNS_BEFORE_REVEAL = 2;

    private MissionTrigger() {
    }

    /** 미션1(대화3, sc_banggui_07): "방귀 활용 제안" 또는 "2턴 이상인데 SOLUTION 미확인". */
    public static boolean shouldRevealMission1(int turnCount, ChildIntent childIntent, List<String> missingElements) {
        if (childIntent == ChildIntent.SOLUTION) return true;
        return turnCount >= MIN_TURNS_BEFORE_REVEAL && missingElements.contains("SOLUTION");
    }

    /** 미션2(대화4, sc_banggui_09): "2턴 이상 진행되었고 결과·해결 방법 요소가 이미 확인됨". */
    public static boolean shouldRevealMission2(int turnCount, List<String> accumulatedElements) {
        return turnCount >= MIN_TURNS_BEFORE_REVEAL
                && (accumulatedElements.contains("RESULT") || accumulatedElements.contains("SOLUTION"));
    }
}
