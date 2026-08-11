package com.goodquestion.backend.home.dto.response;

/** DB 단위(scene_order 1~9)와 화면 단위(4구간)를 분리한다 (decisions.md D-12). */
public record SceneProgressResponse(int current, int total) {
}
