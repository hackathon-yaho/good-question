package com.goodquestion.backend.activity.dto.response;

import com.goodquestion.backend.story.entity.PostActivityCard;

/** imageUrl은 아직 없다 — 카드 이미지 에셋 미수령(U-03). 컬럼 없이 항상 null로 내려간다. */
public record ActivityCardResponse(String id, String text, String imageUrl) {

    public static ActivityCardResponse from(PostActivityCard card) {
        return new ActivityCardResponse(card.id(), card.text(), null);
    }
}
