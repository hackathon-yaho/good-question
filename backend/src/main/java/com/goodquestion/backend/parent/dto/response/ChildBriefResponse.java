package com.goodquestion.backend.parent.dto.response;

import com.goodquestion.backend.child.entity.Child;

import java.time.Year;
import java.util.UUID;

public record ChildBriefResponse(UUID id, String name, String avatarId, int age) {

    public static ChildBriefResponse of(Child child) {
        int age = Year.now().getValue() - child.getBirthYear();
        return new ChildBriefResponse(child.getId(), child.getName(), child.getAvatarId(), age);
    }
}
