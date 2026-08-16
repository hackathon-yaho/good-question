package com.goodquestion.backend.story.constant;

import java.util.List;
import java.util.Map;

/**
 * 대화 장면별 밑줄 단어 후보 (D-11 → D-22). 선정 기준이 문서에 없어 팀이 창작했다 — 자문위원
 * 검수 대상이 아니라 DialogueContents와 같은 이유로 DB가 아니라 코드 상수로 둔다.
 *
 * "LLM이 그 단어를 안 쓸 수 있다"는 문제(D-11)는 후보 목록을 그대로 내려주는 게 아니라
 * **이번 캐릭터 응답 텍스트에 실제로 포함될 때만** 한 개를 골라내는 방식으로 해결한다 — 후보가
 * 안 나오면 그냥 이번 턴은 빈 배열이고, 다음 턴에 나오면 그때 뜬다. 틀린 밑줄이 생기지 않는다.
 */
public final class HighlightWords {

    private static final Map<Integer, List<HighlightWordCandidate>> BY_SCENE_ORDER = Map.of(
            3, List.of(new HighlightWordCandidate("망설여", "어떻게 할지 바로 정하지 못하고 고민하는 모습")),
            5, List.of(new HighlightWordCandidate("사정", "어떤 일이 생긴 까닭이나 형편")),
            7, List.of(new HighlightWordCandidate("방법", "어떤 일을 하는 길이나 수단")),
            9, List.of(new HighlightWordCandidate("특별한", "다른 것보다 더 눈에 띄거나 소중한"))
    );

    private HighlightWords() {
    }

    public static List<HighlightWordCandidate> forSceneOrder(int sceneOrder) {
        return BY_SCENE_ORDER.getOrDefault(sceneOrder, List.of());
    }

    /**
     * 프론트가 현재 턴 대사에 밑줄을 그릴 수 있는 단어만 최대 하나 반환한다.
     * 아이 발화·이전 대사·장면 번호만으로 단어를 만들어 내지 않는다.
     */
    public static List<HighlightWordCandidate> findInCharacterText(int sceneOrder, String characterText) {
        if (characterText == null || characterText.isBlank()) {
            return List.of();
        }
        return forSceneOrder(sceneOrder).stream()
                .filter(candidate -> characterText.contains(candidate.word()))
                .limit(1)
                .toList();
    }
}
