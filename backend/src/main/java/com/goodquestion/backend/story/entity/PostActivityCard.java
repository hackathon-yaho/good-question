package com.goodquestion.backend.story.entity;

/** PRD 7.8 post_activity_config.cards 요소. Story.postActivityConfig의 jsonb 안에 저장된다. */
public record PostActivityCard(String id, String text, int correctOrder) {
}
