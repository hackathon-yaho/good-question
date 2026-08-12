package com.goodquestion.backend.mypage.dto.response;

import java.time.Instant;
import java.util.UUID;

/** post_activity_results.retelling_text — 텍스트다. 오디오가 아니다 (Q-07, TTS로 읽는다). */
public record RetellingItemResponse(UUID sessionId, String storyTitle, String text, Instant createdAt) {
}
