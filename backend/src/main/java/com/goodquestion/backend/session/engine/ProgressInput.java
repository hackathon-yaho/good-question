package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.session.enums.ResponseMode;

import java.util.List;

/**
 * ProgressJudge에 필요한 입력을 한데 묶은 값. story_sessions·story_scenes에서 조립해 넘긴다.
 * turnCount는 "이번 발화까지 포함한" 값이다 — 증가시킨 뒤 넘긴다.
 */
public record ProgressInput(
        int turnCount,
        int preferredTurns,
        int maxTurns,
        List<String> missingElements,
        boolean hasNewlyAccumulatedElement,
        ResponseMode previousMode,
        int turnsWithoutNewElement,
        int consecutiveLowInformationTurns,
        /** 이번 장면에 아직 노출 안 된 미션이 있는가 (D-29). true면 GOAL_MET을 maxTurns 전까지 미룬다. */
        boolean hasUnrevealedMission,
        /** 미션이 노출된 턴 번호. 노출 전이면 null (D-49 — 미션과 대화 세션의 턴 예산 분리). */
        Integer missionRevealedAtTurn,
        /**
         * 미션 노출 이후 소모된 턴 수 — GUIDED로 응답한 턴은 세지 않는다 (D-50).
         * 미션이 노출되지 않았으면 의미 없음(0).
         */
        int missionEngagedTurns,
        /**
         * 명백한 0정보 거절·회피·거친 말(싫어·몰라·모르겠어·닥쳐·닥처)인가
         * (low-engagement-turn-protection.md 조건 1). true면 첫 발화부터 GUIDED 후보다.
         */
        boolean isExplicitZeroInfoRejection,
        /** 이번 장면에서 이미 사용한 GUIDED 보호 턴 수. {@link ProgressJudge#GUIDED_TURN_PROTECTION_LIMIT}에 도달하면 더 이상 보호하지 않는다. */
        int guidedTurnProtectionUsed
) {
}
