package com.goodquestion.backend.shop.dto.response;

import java.util.List;

/** POST /children/{childId}/avatar-purchases 성공 응답 (avatar-shop-purchase.md). */
public record AvatarPurchaseResponse(int starDust, List<String> ownedAvatarIds) {
}
