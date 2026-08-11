package com.goodquestion.backend.child.dto.request;

/** 부분 수정. null인 필드는 바꾸지 않는다 (api.md 3.2). */
public record ChildUpdateRequest(
        String name,
        String avatarId
) {
}
