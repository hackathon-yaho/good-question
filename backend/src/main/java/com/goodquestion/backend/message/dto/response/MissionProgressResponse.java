package com.goodquestion.backend.message.dto.response;

import java.util.List;

public record MissionProgressResponse(String missionId, List<Integer> satisfiedIndexes) {
}
