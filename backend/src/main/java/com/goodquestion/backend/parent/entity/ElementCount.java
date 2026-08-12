package com.goodquestion.backend.parent.entity;

/** 사고 요소를 아이 화면과 같은 4그룹(마음/이유/생각/방법)으로 집계한 결과. */
public record ElementCount(String label, int count) {
}
