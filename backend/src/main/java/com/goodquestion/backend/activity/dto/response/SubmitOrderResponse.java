package com.goodquestion.backend.activity.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * api.md 3.6 예시가 필드를 null이 아니라 **생략**으로 표현한다 — 오답(3회 미만)일 때는
 * correctOrder·retellingKeywords 키 자체가 응답에 없어야 한다. 그래서 missionTriggered와
 * 달리 여기서는 NON_NULL로 생략한다.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SubmitOrderResponse(
        boolean isCorrect,
        int attemptCount,
        List<String> correctOrder,
        List<String> retellingKeywords,
        List<Boolean> slotResults
) {

    public static SubmitOrderResponse of(boolean isCorrect, int attemptCount, List<String> correctOrder,
                                          List<String> retellingKeywords, List<Boolean> slotResults) {
        return new SubmitOrderResponse(isCorrect, attemptCount, correctOrder, retellingKeywords, slotResults);
    }
}
