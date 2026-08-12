package com.goodquestion.backend.story.constant;

import java.util.List;
import java.util.Map;

/**
 * 대화 장면별 밑줄 단어 후보 (D-11 → D-22). 선정 기준이 문서에 없어 팀이 창작했다 — 자문위원
 * 검수 대상이 아니라 DialogueContents와 같은 이유로 DB가 아니라 코드 상수로 둔다.
 *
 * "LLM이 그 단어를 안 쓸 수 있다"는 문제(D-11)는 후보 목록을 그대로 내려주는 게 아니라
 * **캐릭터 응답 텍스트에 실제로 포함될 때만** 골라내는 방식으로 해결한다 — 후보가 이번 턴에
 * 안 나오면 그냥 이번 턴은 빈 배열이고, 다음 턴에 나오면 그때 뜬다. 틀린 밑줄이 생기지 않는다.
 */
public final class HighlightWords {

    private static final Map<Integer, List<HighlightWordCandidate>> BY_SCENE_ORDER = Map.of(
            3, List.of(new HighlightWordCandidate("이상하게", "정상적이지 않고 낯설게")),
            5, List.of(new HighlightWordCandidate("창피한", "남이 볼까 봐 부끄럽고 얼굴이 뜨거워지는 마음")),
            7, List.of(new HighlightWordCandidate("탐스러운", "보기에 먹음직스럽고 소담한")),
            9, List.of(new HighlightWordCandidate("부끄러워", "남에게 보이기 부끄럽고 수줍은 마음"))
    );

    private HighlightWords() {
    }

    public static List<HighlightWordCandidate> forSceneOrder(int sceneOrder) {
        return BY_SCENE_ORDER.getOrDefault(sceneOrder, List.of());
    }
}
