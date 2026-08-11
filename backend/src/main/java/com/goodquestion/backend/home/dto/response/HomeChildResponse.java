package com.goodquestion.backend.home.dto.response;

import com.goodquestion.backend.child.entity.Child;

import java.util.UUID;

public record HomeChildResponse(UUID id, String name, String avatarId) {

    public static HomeChildResponse of(Child child) {
        return new HomeChildResponse(child.getId(), child.getName(), child.getAvatarId());
    }
}
