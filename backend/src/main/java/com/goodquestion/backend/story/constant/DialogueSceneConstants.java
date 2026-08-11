package com.goodquestion.backend.story.constant;

import java.util.List;

/**
 * 대화 장면 하나(scene_order)에 묶인 팀 창작 상수. characterDisplayName은 화면 표시용(PRD I-13),
 * guidanceStyle·remainingWorries는 GUIDED 모드에서 캐릭터 응답 모듈에 전달하는 유도 재료다 (PRD 7.5.3).
 */
public record DialogueSceneConstants(
        String characterDisplayName,
        String guidanceStyle,
        List<RemainingWorry> remainingWorries
) {
}
