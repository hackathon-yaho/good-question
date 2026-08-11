package com.goodquestion.backend.story.entity;

import java.util.List;

/** PRD 7.8. stories.post_activity_config jsonb의 구조. 카드 정답 순서와 재구성 핵심 단어를 담는다. */
public record PostActivityConfig(List<PostActivityCard> cards, List<String> retellingKeywords) {
}
