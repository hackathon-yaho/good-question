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
        boolean hasUnrevealedMission
) {
}
