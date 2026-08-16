package com.goodquestion.backend.mypage.dto.response;

import com.goodquestion.backend.child.entity.Child;

import java.time.Year;
import java.util.List;
import java.util.UUID;

/** ownedAvatarIds는 avatar-shop-purchase.md(D-59) — 이 아이가 상점에서 구매한 아바타 id 목록. */
public record MypageChildResponse(UUID id, String name, String avatarId, int age, int starDust, List<String> ownedAvatarIds) {

    public static MypageChildResponse of(Child child, List<String> ownedAvatarIds) {
        int age = Year.now().getValue() - child.getBirthYear();
        return new MypageChildResponse(
                child.getId(), child.getName(), child.getAvatarId(), age, child.getStarDust(), ownedAvatarIds);
    }
}
