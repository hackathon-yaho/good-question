package com.goodquestion.backend.story.constant;

import com.goodquestion.backend.story.dto.response.CharacterResponse;

import java.util.List;
import java.util.Map;

/**
 * 준비 중(comingSoon) 이야기의 등장인물 (D-63). 대화 장면이 없어
 * {@code StoryServiceImpl.distinctCharacters(scenes)}로 뽑을 데이터가 없는 이야기 전용 —
 * 이름·표시명은 프론트 목 카탈로그(story-catalog.ts)와 동일하게 맞췄고, 이미지는 AI 파트가
 * 넘긴 실제 자산(generated/folktales-v1)을 그대로 쓴다.
 */
public final class ComingSoonCharacters {

    private static final String BASE = "/story-assets/generated/folktales-v1/";

    private static final Map<String, List<CharacterResponse>> BY_TITLE = Map.of(
            "해님과 달님", List.of(
                    new CharacterResponse("sister", "누이", BASE + "ch-sun-moon-sister-neutral.png"),
                    new CharacterResponse("brother", "오빠", BASE + "ch-sun-moon-brother-neutral.png")
            ),
            "콩쥐와 팥쥐", List.of(
                    new CharacterResponse("kongjwi", "콩쥐", BASE + "ch-kongjwi-neutral.png"),
                    new CharacterResponse("patjwi", "팥쥐", BASE + "ch-patjwi-neutral.png")
            ),
            "흥부와 놀부", List.of(
                    new CharacterResponse("heungbu", "흥부", BASE + "ch-heungbu-neutral.png"),
                    new CharacterResponse("nolbu", "놀부", BASE + "ch-nolbu-neutral.png")
            )
    );

    private ComingSoonCharacters() {
    }

    /** 매핑에 없는 제목이면 빈 목록. */
    public static List<CharacterResponse> forTitle(String title) {
        return BY_TITLE.getOrDefault(title, List.of());
    }
}
