package com.goodquestion.backend.parent.entity;

/** 리포트 가이드 5절 — 대표 발화는 1개만. sceneLabel은 화면 단위 "장면 N" 표기. */
public record RepresentativeUtterance(String text, String sceneLabel, String reason) {
}
