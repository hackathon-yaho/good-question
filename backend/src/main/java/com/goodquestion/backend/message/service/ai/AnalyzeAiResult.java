package com.goodquestion.backend.message.service.ai;

import com.goodquestion.backend.message.entity.DetectedElement;
import com.goodquestion.backend.message.enums.ChildIntent;
import com.goodquestion.backend.message.enums.UtteranceValidity;

import java.util.List;

/**
 * success=false는 호출 실패(타임아웃·오류)를 뜻한다. 이때 나머지 필드는 B-12 폴백 값
 * (빈 분석, UNCLEAR)으로 채워져 있어 호출 측이 실패 여부를 매번 따로 분기하지 않아도 된다.
 */
public record AnalyzeAiResult(
        boolean success,
        ChildIntent childIntent,
        String mainPoint,
        List<DetectedElement> detectedElements,
        UtteranceValidity utteranceValidity
) {

    public static AnalyzeAiResult failure() {
        return new AnalyzeAiResult(false, ChildIntent.UNCLEAR, null, List.of(), UtteranceValidity.UNCLEAR);
    }
}
