package com.goodquestion.backend.parent.report.ai;

/**
 * AI가 돌려주는 역량 카드 하나. evidenceIndex는 요청의 utterances[].index를 가리킨다 —
 * 백엔드가 이 index로 실제 발화 원문을 채운다(AI가 원문을 직접 쓰지 않는다).
 */
public record CompetencyAiCard(String name, String feature, Integer evidenceIndex, String strength, String next) {
}
