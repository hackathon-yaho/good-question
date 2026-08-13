package com.goodquestion.backend.story.constant;

import java.util.List;

/**
 * 대화 장면 하나(scene_order)에 묶인 팀 창작 상수. characterDisplayName은 화면 표시용(PRD I-13),
 * guidanceStyle·remainingWorries는 GUIDED 모드에서 캐릭터 응답 모듈에 전달하는 유도 재료다 (PRD 7.5.3).
 * ttsVoice·ttsGuideStyle은 D-35 — 같은 캐릭터(며느리: 대화1·4)는 장면이 달라도 같은 voice를 쓴다.
 * ttsGuideStyle은 guidanceStyle과 다른 필드다 — guidanceStyle은 AI가 대사 "내용"을 생성할 때
 * 쓰는 지시고, ttsGuideStyle은 이미 만들어진 대사를 TTS가 "어떻게 읽을지" 지시하는 것이라
 * 목적이 달라 재사용하지 않고 분리했다.
 */
public record DialogueSceneConstants(
        String characterDisplayName,
        String ttsVoice,
        String ttsGuideStyle,
        String guidanceStyle,
        List<RemainingWorry> remainingWorries
) {
}
