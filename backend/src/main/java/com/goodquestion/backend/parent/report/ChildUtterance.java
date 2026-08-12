package com.goodquestion.backend.parent.report;

/** ReportGenerator 입력용 — 아이 발화 원문 + 화면 단위 장면 번호(D-12 변환식과 동일). */
public record ChildUtterance(String text, int sceneIndex) {
}
