package com.goodquestion.backend.parent.entity;

/**
 * 리포트 가이드 3-2·3-3, 4절 표시 순서(역량명→특징→근거 발화→잘한 점→보완할 부분).
 * `evidence`는 이번 세션에 해당 역량이 나타났을 때만 값이 있고, 없으면 null이다.
 */
public record CompetencyCard(String name, String feature, String evidence, String strength, String next) {
}
