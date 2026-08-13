package com.goodquestion.backend.story.constant;

import java.util.List;

/**
 * 대화 장면 하나(scene_order)에 묶인 팀 창작 상수. characterDisplayName은 화면 표시용(PRD I-13),
 * guidanceStyle·remainingWorries는 GUIDED 모드에서 캐릭터 응답 모듈에 전달하는 유도 재료다 (PRD 7.5.3).
 * ttsVoice는 D-35 — 같은 캐릭터(며느리: 대화1·4)는 장면이 달라도 같은 값을 쓴다.
 */
public record DialogueSceneConstants(
        String characterDisplayName,
        String ttsVoice,
        String guidanceStyle,
        List<RemainingWorry> remainingWorries
) {
}
