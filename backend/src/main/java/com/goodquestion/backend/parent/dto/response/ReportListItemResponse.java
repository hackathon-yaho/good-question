package com.goodquestion.backend.parent.dto.response;

import java.util.UUID;

public record ReportListItemResponse(UUID sessionId, String storyTitle, String coverImageUrl, String date, String status) {
}
