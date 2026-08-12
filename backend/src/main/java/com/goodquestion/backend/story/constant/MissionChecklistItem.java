package com.goodquestion.backend.story.constant;

/** api.md 3.5 missionTriggered.checklist 요소. element는 이 확인 항목이 어떤 사고 요소에 대응하는지다. */
public record MissionChecklistItem(String label, String element) {
}
