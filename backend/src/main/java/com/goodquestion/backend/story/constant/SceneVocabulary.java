package com.goodquestion.backend.story.constant;

import java.util.Map;

/**
 * 대화 장면별 "오늘의 단어" 카드 (scene-vocabulary-recommendation.md). HighlightWords와 달리
 * 캐릭터 대사에 실제로 등장하는지와 무관하게 장면마다 항상 하나씩 내려간다 — LLM 입출력에는
 * 관여하지 않는, 대화와 분리된 별도 추천 데이터다. 콘텐츠 담당 확인 전 AI팀 제안 초안을 그대로 썼다.
 */
public final class SceneVocabulary {

    private static final Map<Integer, SceneVocabularyWord> BY_SCENE_ORDER = Map.of(
            3, new SceneVocabularyWord("예의", "다른 사람에게 바르게 행동하는 마음이나 모습"),
            5, new SceneVocabularyWord("창피한", "다른 사람이 볼까 봐 얼굴이 뜨거운 마음"),
            7, new SceneVocabularyWord("탐스러운", "먹음직스럽고 보기 좋은 모습"),
            9, new SceneVocabularyWord("특징", "다른 것과 구별되는 눈에 띄는 점")
    );

    private SceneVocabulary() {
    }

    /** 후보가 없는 장면이면 null. */
    public static SceneVocabularyWord forSceneOrder(int sceneOrder) {
        return BY_SCENE_ORDER.get(sceneOrder);
    }
}
