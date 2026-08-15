package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.session.enums.ResponseMode;
import com.goodquestion.backend.session.enums.SceneEndReason;

/**
 * 진행 판단 규칙 엔진 (M-38, M-39, PRD 6.9). 판단 순서를 바꾸면 결과가 달라지므로
 * 이 순서를 그대로 지킨다 — 순서를 바꾸는 리팩터링을 하지 않는다.
 *
 * 1. 종료 조건 확인 (필수 요소 충족 + 최소 대화량 / 최대 대화 범위 도달)
 *    — 단, 미공개 미션이 있으면(D-29) maxTurns 전까지는 GOAL_MET으로 닫지 않는다.
 * 2. 강한 유도 제한 조건 확인 (첫 발화 / 신규 요소 확인 / 직전 GUIDED → NORMAL 강제)
 * 3. 유도 필요성 확인 (missing 있고 정체·저정보·턴 부족 중 하나)
 * 4. 그 외 NORMAL
 */
public final class ProgressJudge {

    /** 정체·저정보 판정 연속 횟수 (PRD 6.9). */
    private static final int STAGNATION_THRESHOLD = 2;
    private static final int LOW_INFORMATION_THRESHOLD = 2;
    /** 남은 대화 기회가 이 값 이하이면 "부족"으로 본다. */
    private static final int LOW_REMAINING_TURNS_THRESHOLD = 2;
    /**
     * 미션 노출 후 보장하는 최소 대화 턴 (D-49). 대화 세션의 원래 maxTurns를 넘기더라도
     * 노출 턴부터 이 턴 수만큼은 닫지 않는다 — MissionTrigger.FORCE_REVEAL_TURNS_BEFORE_MAX와
     * 같은 설계 의도(미션은 대화 세션과 턴을 공유하지 않는다)를 공유하는 상수라 값을 맞춰둔다.
     */
    private static final int MISSION_TURN_BUDGET = 2;

    private ProgressJudge() {
    }

    public static ProgressDecision judge(ProgressInput input) {
        boolean missingEmpty = input.missingElements().isEmpty();

        // 1. 종료 조건
        // D-29/D-49: 대화3·4는 미션이 항상 나와야 한다(주최측 확정). 미공개 미션이 있으면
        // maxTurns 도달 전까지, 이미 노출된 미션이 있으면 노출 턴+예산(MISSION_TURN_BUDGET)까지
        // GOAL_MET으로 닫지 않는다 — 이 확장된 값(effectiveMaxTurns)이 MAX_TURNS 하드컷의 기준도 된다.
        int effectiveMaxTurns = input.missionRevealedAtTurn() == null
                ? input.maxTurns()
                : Math.max(input.maxTurns(), input.missionRevealedAtTurn() + MISSION_TURN_BUDGET);
        boolean deferGoalMetForMission = (input.hasUnrevealedMission() || input.missionRevealedAtTurn() != null)
                && input.turnCount() < effectiveMaxTurns;
        if (missingEmpty && input.turnCount() >= input.preferredTurns() && !deferGoalMetForMission) {
            return ProgressDecision.closing(SceneEndReason.GOAL_MET);
        }
        if (input.turnCount() >= effectiveMaxTurns) {
            return ProgressDecision.closing(SceneEndReason.MAX_TURNS);
        }

        // 2. 강한 유도 제한 조건 — 하나라도 해당하면 NORMAL 강제
        boolean isFirstUtterance = input.turnCount() <= 1;
        boolean previousWasGuided = input.previousMode() == ResponseMode.GUIDED;
        if (isFirstUtterance || input.hasNewlyAccumulatedElement() || previousWasGuided) {
            return ProgressDecision.normal();
        }

        // 3. 유도 필요성 확인
        boolean stagnant = input.turnsWithoutNewElement() >= STAGNATION_THRESHOLD;
        boolean lowInformation = input.consecutiveLowInformationTurns() >= LOW_INFORMATION_THRESHOLD;
        boolean turnsRunningOut = (input.maxTurns() - input.turnCount()) <= LOW_REMAINING_TURNS_THRESHOLD;
        if (!missingEmpty && (stagnant || lowInformation || turnsRunningOut)) {
            return ProgressDecision.guided();
        }

        // 4. 기본값
        return ProgressDecision.normal();
    }
}
