package com.goodquestion.backend.wordbook.dto.response;

import com.goodquestion.backend.story.entity.Story;
import com.goodquestion.backend.story.entity.StoryScene;
import com.goodquestion.backend.wordbook.entity.Wordbook;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

public record WordEntryResponse(
        UUID id,
        String word,
        String meaning,
        UUID storyId,
        String storyTitle,
        int sceneIndex,
        String contextSentence,
        boolean liked,
        Instant savedAt,
        boolean isNew
) {

    private static final int NEW_THRESHOLD_HOURS = 24;

    public static WordEntryResponse from(Wordbook wordbook) {
        StoryScene scene = wordbook.getSourceScene();
        Story story = scene.getStory();
        boolean isNew = wordbook.getCreatedAt().isAfter(Instant.now().minus(NEW_THRESHOLD_HOURS, ChronoUnit.HOURS));

        return new WordEntryResponse(
                wordbook.getId(), wordbook.getWord(), wordbook.getMeaning(),
                story.getId(), story.getTitle(),
                sceneIndex(scene.getSceneOrder()), wordbook.getContextSentence(),
                wordbook.getLiked(), wordbook.getCreatedAt(), isNew);
    }

    /** D-12와 같은 변환식 — DB 단위 1~9를 화면 단위 1~4로 나눗셈 버림한다. */
    private static int sceneIndex(int sceneOrder) {
        return sceneOrder / 2;
    }
}
