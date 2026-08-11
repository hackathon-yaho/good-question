package com.goodquestion.backend.child.dto.response;

import com.goodquestion.backend.child.entity.Child;

import java.time.Instant;
import java.time.Year;
import java.util.UUID;

public record ChildResponse(
        UUID id,
        String name,
        Integer birthYear,
        int age,
        String avatarId,
        boolean consentGranted,
        Instant lastActivityAt,
        Instant registeredAt
) {

    /** age는 저장값이 아니라 현재 연도 - birthYear로 매번 계산한다 (PRD I-11). */
    public static ChildResponse of(Child child, boolean consentGranted, Instant lastActivityAt) {
        int age = Year.now().getValue() - child.getBirthYear();
        return new ChildResponse(
                child.getId(),
                child.getName(),
                child.getBirthYear(),
                age,
                child.getAvatarId(),
                consentGranted,
                lastActivityAt,
                child.getCreatedAt()
        );
    }
}
