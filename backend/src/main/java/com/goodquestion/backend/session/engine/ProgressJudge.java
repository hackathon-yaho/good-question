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
 * 2. GUIDED 보호 턴 확인 (low-engagement-turn-protection.md) — MAX_TURNS/미션 최대 턴
 *    종료보다 먼저 본다. 장면당 최대 {@link #GUIDED_TURN_PROTECTION_LIMIT}회까지는
 *    진행·미션 턴을 소모하지 않는다.
 * 3. 최대 대화 범위 도달 확인 (MAX_TURNS / 미션 최대 턴)
 * 4. 강한 유도 제한 조건 확인 (신규 요소 확인 → 무조건 NORMAL. 첫 발화 / 직전 GUIDED는
 *    GUIDED 후보가 아닐 때만 NORMAL을 강제한다 — 보호가 소진된 뒤에도 정체·저정보가
 *    이어지면 GUIDED를 유지한다)
 * 5. 유도 필요성 확인 (missing 있고 정체·저정보·턴 부족·명백한 0정보 거절 중 하나)
 * 6. 그 외 NORMAL
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
    /** 장면당 GUIDED 보호 턴 최대 횟수 (low-engagement-turn-protection.md). */
    public static final int GUIDED_TURN_PROTECTION_LIMIT = 2;

    private ProgressJudge() {
    }

    public static ProgressDecision judge(ProgressInput input) {
        boolean missingEmpty = input.missingElements().isEmpty();
        boolean missionActive = input.missionRevealedAtTurn() != null;

        // 1. GOAL_MET
        boolean deferGoalMet = missionActive
                ? input.missionEngagedTurns() < MISSION_MIN_TURNS_AFTER_REVEAL
                : input.hasUnrevealedMission() && input.turnCount() < input.maxTurns();
        if (missingEmpty && input.turnCount() >= input.preferredTurns() && !deferGoalMet) {
            return ProgressDecision.closing(SceneEndReason.GOAL_MET);
        }

        // 2. GUIDED 보호 턴 — hasNewlyAccumulatedElement인 턴은 후보에서 제외한다. 신규 요소가
        // 막 확인된 turnCount가 신규 요소가 확인된 조건을 다시 강제 NORMAL로 보내는 4단계와
        // 충돌하지 않게 하기 위함이다 (그 턴은 이미 "진행됨"이지 "정체"가 아니다).
        boolean stagnant = input.turnsWithoutNewElement() >= STAGNATION_THRESHOLD;
        boolean lowInformation = input.consecutiveLowInformationTurns() >= LOW_INFORMATION_THRESHOLD;
        int remainingTurns = missionActive
                ? MISSION_MAX_TURNS_AFTER_REVEAL - input.missionEngagedTurns()
                : input.maxTurns() - input.turnCount();
        boolean turnsRunningOut = remainingTurns <= LOW_REMAINING_TURNS_THRESHOLD;
        boolean guidedCandidate = !missingEmpty && !input.hasNewlyAccumulatedElement()
                && (input.isExplicitZeroInfoRejection() || stagnant || lowInformation || turnsRunningOut);

        if (guidedCandidate && input.guidedTurnProtectionUsed() < GUIDED_TURN_PROTECTION_LIMIT) {
            return ProgressDecision.protectedGuided();
        }

        // 3. MAX_TURNS / 미션 최대 턴 종료
        if (missionActive) {
            if (input.missionEngagedTurns() >= MISSION_MAX_TURNS_AFTER_REVEAL) {
                return ProgressDecision.closing(SceneEndReason.MAX_TURNS);
            }
        } else {
            if (input.turnCount() >= input.maxTurns()) {
                return ProgressDecision.closing(SceneEndReason.MAX_TURNS);
            }
        }

        // 4. 강한 유도 제한 조건 — 신규 요소는 무조건 NORMAL. 첫 발화·직전 GUIDED는 guidedCandidate가
        // 아닐 때만 NORMAL을 강제한다. guidedCandidate인데 보호 예산이 이미 소진됐다면(2단계에서
        // 반환하지 못한 경우) 여기서 NORMAL로 되돌리지 않고 5단계의 일반 GUIDED로 넘긴다 —
        // "직전이 GUIDED였다"는 이유만으로 정체가 풀린 것처럼 되돌리지 않는다.
        boolean isFirstUtterance = input.turnCount() <= 1;
        boolean previousWasGuided = input.previousMode() == ResponseMode.GUIDED;
        if (input.hasNewlyAccumulatedElement() || ((isFirstUtterance || previousWasGuided) && !guidedCandidate)) {
            return ProgressDecision.normal();
        }

        // 5. 유도 필요성 확인 — 보호 예산이 소진된 뒤에도 정체가 이어지면 예산을 소모하는 일반 GUIDED.
        if (guidedCandidate) {
            return ProgressDecision.guided();
        }

        // 6. 기본값
        return ProgressDecision.normal();
    }
}
