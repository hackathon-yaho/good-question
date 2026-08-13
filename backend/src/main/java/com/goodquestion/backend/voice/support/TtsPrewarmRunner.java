package com.goodquestion.backend.voice.support;

import com.goodquestion.backend.story.entity.StoryScene;
import com.goodquestion.backend.story.repository.StorySceneRepository;
import com.goodquestion.backend.voice.service.TtsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * B-18. 고정 대사 11건을 기동 시 미리 생성한다 (D-05). ContentSeeder(@Order(1))가 장면을
 * 먼저 적재해야 하므로 그 뒤(@Order(2))에 돈다.
 *
 * "ㅇㅇ아"/"ㅇㅇ이" 자리표시자가 남아 있는 character_opening 2건(대화1·대화4)은 아이마다
 * 텍스트가 달라 여기서 만들 수 없다 — 첫 재생 시 GET /api/tts가 생성해 캐시에 넣는다.
 *
 * ApplicationRunner에서 던진 예외는 ApplicationContext 기동 자체를 실패시킨다. OpenAI 장애·
 * 크레딧 소진 같은 외부 요인으로 서버 전체가 못 뜨면 안 되므로, 항목 하나가 실패해도 나머지를
 * 계속 시도하고 경고만 남긴다 — 프리워밍은 최적화지 기동 조건이 아니다.
 */
@Slf4j
@Component
@Order(2)
@RequiredArgsConstructor
public class TtsPrewarmRunner implements ApplicationRunner {

    private final StorySceneRepository storySceneRepository;
    private final TtsService ttsService;

    @Override
    public void run(ApplicationArguments args) {
        int generated = 0;
        for (StoryScene scene : storySceneRepository.findAll()) {
            VoiceProfile profile = VoiceProfile.forScene(scene);
            if (scene.isDialogue()) {
                generated += warmIfFixed(scene.getCharacterOpening(), profile);
                generated += warmIfFixed(scene.getCharacterClosing(), profile);
            } else {
                generated += warmIfFixed(scene.getSceneDescription(), profile);
            }
        }
        log.info("[TtsPrewarmRunner] 고정 대사 프리워밍 완료 — 신규 생성 {}건.", generated);
    }

    private int warmIfFixed(String text, VoiceProfile profile) {
        if (text == null || text.contains("ㅇㅇ")) return 0;
        try {
            return ttsService.ensureCached(text, profile.voice(), profile.instructions()) ? 1 : 0;
        } catch (Exception e) {
            log.warn("[TtsPrewarmRunner] 프리워밍 실패, 건너뜁니다 (첫 재생 시 GET /api/tts가 재시도합니다): {}", e.getMessage());
            return 0;
        }
    }
}
