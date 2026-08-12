package com.goodquestion.backend.session.engine;

import com.goodquestion.backend.message.entity.DetectedElement;

import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/** 누적 요소·부족 요소 계산 (M-37, PRD 6.8). missingElements는 DB에 저장하지 않고 매번 계산한다. */
public final class AccumulatedElementsCalculator {

    private AccumulatedElementsCalculator() {
    }

    public static List<String> accumulate(List<String> existing, List<DetectedElement> newlyDetected) {
        Set<String> merged = new LinkedHashSet<>(existing);
        newlyDetected.forEach(element -> merged.add(element.type()));
        return List.copyOf(merged);
    }

    /** 이번 턴에 처음으로 누적된 type만 골라낸다 (진행 판단 규칙의 "신규 요소" 조건에 쓰인다). */
    public static List<String> newlyAccumulatedTypes(List<String> existingAccumulated, List<DetectedElement> newlyDetected) {
        Set<String> existingSet = new HashSet<>(existingAccumulated);
        Set<String> result = new LinkedHashSet<>();
        for (DetectedElement element : newlyDetected) {
            if (!existingSet.contains(element.type())) result.add(element.type());
        }
        return List.copyOf(result);
    }

    public static List<String> missing(List<String> requiredElements, List<String> accumulated) {
        if (requiredElements == null) return List.of();
        Set<String> accumulatedSet = new HashSet<>(accumulated);
        return requiredElements.stream().filter(required -> !accumulatedSet.contains(required)).toList();
    }
}
