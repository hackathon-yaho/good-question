package com.goodquestion.backend.message.dto.response;

import com.goodquestion.backend.story.constant.MissionDefinition;

import java.util.List;

public record MissionTriggeredResponse(String id, String title, List<MissionChecklistItemResponse> checklist) {

    public static MissionTriggeredResponse of(MissionDefinition mission) {
        List<MissionChecklistItemResponse> checklist = mission.checklist().stream()
                .map(item -> new MissionChecklistItemResponse(item.label(), item.element()))
                .toList();
        return new MissionTriggeredResponse(mission.id(), mission.title(), checklist);
    }
}
