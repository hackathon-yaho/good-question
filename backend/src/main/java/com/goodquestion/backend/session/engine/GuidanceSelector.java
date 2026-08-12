package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.session.enums.ResponseMode;

import java.util.List;
import java.util.Set;

/** GUIDED 유도 대상 선택 (M-41, PRD 6.9 "유도 대상 선택 원칙"). 직전 유도 요소 반복을 피한다. */
public final class GuidanceSelector {

    /** O-13 NORMAL soft-cue를 스킵하는 반응 키 (PRD 6.14). */
    private static final Set<String> SOFT_CUE_SKIP_REACTIONS = Set.of("playfulUtterance", "questionFromChild", "unclearUtterance");

    private GuidanceSelector() {
    }

    /** missingElements가 비어 있으면 null이다 — GUIDED인데 missing이 없는 경우는 호출 측에서 생기지 않는다. */
    public static String select(List<String> missingElements, String previousGuidanceTarget) {
        if (missingElements.isEmpty()) return null;
        return missingElements.stream()
                .filter(element -> !element.equals(previousGuidanceTarget))
                .findFirst()
                .orElse(missingElements.get(0));
    }

    /**
     * M-41(GUIDED) + O-13 NORMAL soft-cue (PRD 6.14). soft-cue는 새 AI 필드 없이 GUIDED와 같은
     * guidanceTarget/remainingWorry를 재사용한다 — responseMode만 NORMAL로 둔 채 함께 실어 보낸다
     * (api.md 4.2). 신규 요소가 막 잡혀 강한 유도 제한(ProgressJudge)으로 NORMAL이 강제된 턴에서,
     * missing이 아직 남아 있고 장난·질문·불명확 반응이 아닐 때만 약하게 다음 요소를 곁들인다.
     */
    public static String selectForTurn(ResponseMode mode, String reactionKey, List<String> missingElements,
                                        boolean hasNewlyAccumulatedElement, String previousGuidanceTarget) {
        boolean guided = mode == ResponseMode.GUIDED;
        boolean softCueEligible = mode == ResponseMode.NORMAL && hasNewlyAccumulatedElement
                && !missingElements.isEmpty() && !SOFT_CUE_SKIP_REACTIONS.contains(reactionKey);
        if (!guided && !softCueEligible) return null;
        return select(missingElements, previousGuidanceTarget);
    }
}
