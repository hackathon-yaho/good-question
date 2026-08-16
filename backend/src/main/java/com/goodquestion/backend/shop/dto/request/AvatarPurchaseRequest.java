package com.goodquestion.backend.shop.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/** POST /children/{childId}/avatar-purchases (avatar-shop-purchase.md). price는 프론트 값을 그대로 신뢰한다 (D-59). */
public record AvatarPurchaseRequest(
        @NotBlank String avatarId,
        @NotNull @Positive Integer price
) {
}
