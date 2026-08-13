package com.goodquestion.backend.mypage.dto.response;

import com.goodquestion.backend.child.entity.Child;

import java.time.Year;
import java.util.UUID;

public record MypageChildResponse(UUID id, String name, String avatarId, int age, int starDust) {

    public static MypageChildResponse of(Child child) {
        int age = Year.now().getValue() - child.getBirthYear();
        return new MypageChildResponse(child.getId(), child.getName(), child.getAvatarId(), age, child.getStarDust());
    }
}
