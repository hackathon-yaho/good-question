package com.goodquestion.backend.session.engine;

import java.util.List;

/** GUIDED 유도 대상 선택 (M-41, PRD 6.9 "유도 대상 선택 원칙"). 직전 유도 요소 반복을 피한다. */
public final class GuidanceSelector {

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
}
