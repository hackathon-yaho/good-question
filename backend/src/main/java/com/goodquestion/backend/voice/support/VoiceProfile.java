package com.goodquestion.backend.voice.support;

import com.goodquestion.backend.story.constant.DialogueContents;
import com.goodquestion.backend.story.constant.DialogueSceneConstants;
import com.goodquestion.backend.story.entity.StoryScene;

/**
 * 캐릭터별 TTS 목소리(D-35). `instructions`는 새로 만들지 않고 GUIDED 유도용으로 이미 있던
 * `guidanceStyle`(PRD 7.5.3)을 그대로 재사용한다 — 둘 다 "이 캐릭터가 어떤 말투인가"를
 * 나타내는 같은 정보다.
 */
public record VoiceProfile(String voice, String instructions) {

    public static final VoiceProfile NARRATOR =
            new VoiceProfile("alloy", "차분하고 다정한 동화 구연 톤으로, 또박또박 천천히 읽어주세요.");

    public static VoiceProfile forScene(StoryScene scene) {
        if (!scene.isDialogue()) return NARRATOR;
        DialogueSceneConstants constants = DialogueContents.forSceneOrder(scene.getSceneOrder());
        return new VoiceProfile(constants.ttsVoice(), constants.guidanceStyle());
    }
}
