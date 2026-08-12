package com.goodquestion.backend.parent.dto.response;

import com.goodquestion.backend.child.entity.Child;

import java.util.UUID;

/** G-1 아이 전환 칩. */
public record ChildChipResponse(UUID id, String name) {

    public static ChildChipResponse of(Child child) {
        return new ChildChipResponse(child.getId(), child.getName());
    }
}
