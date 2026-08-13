package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.common.enums.ThoughtElement;
import com.goodquestion.backend.message.enums.ChildIntent;
import com.goodquestion.backend.session.enums.ResponseMode;

import java.util.List;

/**
 * 미션 노출 판정에 필요한 입력 (PRD 7.6).
 *
 * previousMode·previousGuidanceTarget은 **이번 턴 결과를 세션에 반영하기 전**의 값이어야 한다.
 * 조건 4가 "직전 턴에 유도했는데 이번 턴에도 안 나왔다"를 보기 때문이다.
 *
 * maxTurns는 강제 노출(D-29, 주최측 확정 — 미션은 항상 나와야 한다) 판정에만 쓰인다.
 */
public record MissionTriggerContext(
        int turnCount,
        ChildIntent childIntent,
        String childUtterance,
        List<String> accumulatedElements,
        List<String> missingElements,
        ResponseMode previousMode,
        ThoughtElement previousGuidanceTarget,
        int maxTurns
) {
}
