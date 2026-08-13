package com.goodquestion.backend.voice.support;

import com.goodquestion.backend.story.constant.DialogueContents;
import com.goodquestion.backend.story.constant.DialogueSceneConstants;
import com.goodquestion.backend.story.entity.StoryScene;

/**
 * 캐릭터별 TTS 목소리(D-35). `instructions`는 `guidanceStyle`(AI 텍스트 생성 지시)을 재사용하지
 * 않고 전용 필드 `ttsGuideStyle`을 쓴다 — 하나는 "무슨 말을 할지", 하나는 "그 말을 어떻게
 * 읽을지"라 목적이 달라 별개로 관리한다.
 */
public record VoiceProfile(String voice, String instructions) {

    public static final VoiceProfile NARRATOR =
            new VoiceProfile("alloy", "차분하고 다정한 동화 구연 톤으로, 또박또박 천천히 읽어주세요.");

    public static VoiceProfile forScene(StoryScene scene) {
        if (!scene.isDialogue()) return NARRATOR;
        DialogueSceneConstants constants = DialogueContents.forSceneOrder(scene.getSceneOrder());
        return new VoiceProfile(constants.ttsVoice(), constants.ttsGuideStyle());
    }
}
