package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.common.enums.ThoughtElement;
import com.goodquestion.backend.message.entity.DetectedElement;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * 분석 LLM 출력에 대한 서버 후처리 (M-36, PRD 6.7). LLM을 쓰지 않는 순수 함수다.
 * 1) evidence가 아이 발화 원문에 실제로 있는지 대조 → 없으면 삭제
 * 2) 같은 type이 중복 탐지되면 하나로 정리
 * 3) 8개 스키마에 없는 type은 제거
 */
public final class AnalysisPostProcessor {

    private AnalysisPostProcessor() {
    }

    public static List<DetectedElement> process(List<DetectedElement> rawElements, String childUtterance) {
        if (rawElements == null || rawElements.isEmpty()) return List.of();

        Set<String> seenTypes = new LinkedHashSet<>();
        List<DetectedElement> result = new ArrayList<>();

        for (DetectedElement element : rawElements) {
            if (element == null || element.type() == null || element.evidence() == null) continue;
            if (!isKnownType(element.type())) continue;
            if (!hasEvidenceInUtterance(childUtterance, element.evidence())) continue;
            if (!seenTypes.add(element.type())) continue;
            result.add(element);
        }
        return List.copyOf(result);
    }

    private static boolean isKnownType(String type) {
        try {
            ThoughtElement.valueOf(type);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private static boolean hasEvidenceInUtterance(String childUtterance, String evidence) {
        return childUtterance != null && !evidence.isBlank() && childUtterance.contains(evidence);
    }
}
