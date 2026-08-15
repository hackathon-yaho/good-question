package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.session.enums.ResponseMode;
import com.goodquestion.backend.session.enums.SceneEndReason;

/**
 * 진행 판단 규칙 엔진 (M-38, M-39, PRD 6.9). 판단 순서를 바꾸면 결과가 달라지므로
 * 이 순서를 그대로 지킨다 — 순서를 바꾸는 리팩터링을 하지 않는다.
 *
 * 1. 종료 조건 확인 (필수 요소 충족 + 최소 대화량 / 최대 대화 범위 도달)
 *    — 미공개 미션이 있으면(D-29) maxTurns 전까지는 GOAL_MET으로 닫지 않는다.
 *    — 미션이 이미 노출됐으면(D-50) 장면의 maxTurns는 더 이상 안 보고, 미션 자체의
 *      턴 예산(최소 1 ~ 최대 4, GUIDED 턴 미포함)만 따른다.
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
     * 미션 노출 후 보장하는 최소 대화 턴 (D-50). 이 턴 수만큼은 GOAL_MET으로도 닫지 않는다.
     */
    private static final int MISSION_MIN_TURNS_AFTER_REVEAL = 1;
    /**
     * 미션 노출 후 허용하는 최대 대화 턴 (D-50). GUIDED로 응답한 턴은 세지 않는다
     * (ProgressInput.missionEngagedTurns) — 대화 세션의 원래 maxTurns와는 무관하게, 이 값에
     * 도달하면 무조건 닫는다.
     */
    private static final int MISSION_MAX_TURNS_AFTER_REVEAL = 4;

    private ProgressJudge() {
    }

    public static ProgressDecision judge(ProgressInput input) {
        boolean missingEmpty = input.missingElements().isEmpty();
        boolean missionActive = input.missionRevealedAtTurn() != null;

        // 1. 종료 조건
        if (missionActive) {
            // D-50: 미션이 노출된 뒤엔 장면의 maxTurns를 더 이상 보지 않는다 — 미션 자체의
            // 턴 예산(최소 1 ~ 최대 4, GUIDED 턴 미포함)만 따른다.
            boolean deferGoalMetForMission = input.missionEngagedTurns() < MISSION_MIN_TURNS_AFTER_REVEAL;
            if (missingEmpty && input.turnCount() >= input.preferredTurns() && !deferGoalMetForMission) {
                return ProgressDecision.closing(SceneEndReason.GOAL_MET);
            }
            if (input.missionEngagedTurns() >= MISSION_MAX_TURNS_AFTER_REVEAL) {
                return ProgressDecision.closing(SceneEndReason.MAX_TURNS);
            }
        } else {
            // D-29: 대화3·4는 미션이 항상 나와야 한다(주최측 확정) — 미공개 미션이 있으면
            // maxTurns 도달 전까지는 GOAL_MET으로 닫지 않는다.
            boolean deferGoalMetForUnrevealedMission = input.hasUnrevealedMission() && input.turnCount() < input.maxTurns();
            if (missingEmpty && input.turnCount() >= input.preferredTurns() && !deferGoalMetForUnrevealedMission) {
                return ProgressDecision.closing(SceneEndReason.GOAL_MET);
            }
            if (input.turnCount() >= input.maxTurns()) {
                return ProgressDecision.closing(SceneEndReason.MAX_TURNS);
            }
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
