package com.goodquestion.backend.story.constant;

import java.util.Map;

/**
 * 대화 장면별 "오늘의 단어" 후보 (character-utterance-vocabulary-v2.md, D-62 — v1의 "장면 번호로
 * 고정 추천"을 대체). 이 후보가 이번 턴 최종 확정 캐릭터 대사에 실제로 포함될 때만
 * {@code recommendedWord}로 내려간다 — 호출부(MessageServiceImpl)가 대사 대조를 책임진다.
 * LLM 입출력에는 관여하지 않는다. 콘텐츠 담당 확인 전 AI팀 제안 초안을 그대로 썼다.
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

    /**
     * D-62(character-utterance-vocabulary-v2.md). 장면 후보가 {@code characterText}(이번 턴
     * 최종 확정 캐릭터 대사 — Worker 응답이든 character_closing 폴백이든 호출부는 구분하지
     * 않는다) 안에 실제로 있을 때만 추천한다. 후보가 없거나 대사에 없으면 null.
     */
    public static SceneVocabularyWord matchInText(int sceneOrder, String characterText) {
        SceneVocabularyWord candidate = forSceneOrder(sceneOrder);
        if (candidate == null || characterText == null || !characterText.contains(candidate.word())) {
            return null;
        }
        return candidate;
    }
}
