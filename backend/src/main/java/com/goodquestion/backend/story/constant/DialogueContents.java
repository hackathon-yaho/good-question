package com.goodquestion.backend.story.constant;

import com.goodquestion.backend.common.enums.ThoughtElement;
import com.goodquestion.backend.common.global.ErrorCode;
import com.goodquestion.backend.common.global.exception.BusinessException;

import java.util.List;
import java.util.Map;

/**
 * "방귀 뀌는 며느리" 대화 장면 4건의 팀 창작 상수 (PRD 7.5.3, I-13). scene_order로 키를 삼는다 —
 * 며느리가 대화1·대화4에 모두 등장하지만 심리 상태가 달라 캐릭터 단위가 아니라
 * 캐릭터+장면 조합 단위로 관리해야 하기 때문이다 (PRD 7.5.4).
 *
 * DB에 두지 않는 이유는 M-19·B-08(work-items.md 2장)과 같다 — 자문위원 검수 대상이 아닌
 * 팀 창작물이라 재배포로 바꾸는 편이 시드 데이터보다 다루기 쉽다.
 */
public final class DialogueContents {

    private static final String DAUGHTER_IN_LAW_SCENE3_TTS_GUIDE = """
            Natural conversational speech from a young adult Korean woman.

            Speak softly and naturally, as if talking to someone she trusts.
            She is slightly hesitant and worried, but remains calm and composed.

            Use subtle emotional expression and natural Korean conversational intonation.
            Allow brief, natural pauses between thoughts, but do not overuse pauses.

            Her speech should feel gentle, careful, and considerate.
            She tends to think about how others may react before speaking.

            Do not exaggerate the emotion.
            Do not sound theatrical or like a voice actor performing a character.
            Do not sound overly cute, childish, elderly, or motherly.

            Keep the delivery relaxed, warm, and human.
            She should sound like an ordinary young woman having a quiet conversation,
            not a narrator or a dramatic character.""";

    private static final String FATHER_IN_LAW_SCENE5_TTS_GUIDE = """
            Natural conversational speech from an older Korean man.

            He is an old-fashioned father-in-law who cares strongly about dignity,
            family reputation, and what other people think.

            Speak with confident, slightly formal Korean conversational phrasing.
            He is stubborn and certain about his own opinions.

            In this scene, he is genuinely flustered and surprised.
            His energy rises naturally when he reacts, and he may speak a little louder
            or faster when caught off guard.

            His reactions should feel humorous and exaggerated in a charming way,
            like a funny older man who gets worked up easily.

            Do not sound harsh, intimidating, threatening, or genuinely angry.
            His frustration should feel more like flustered stubbornness than aggression.

            Do not sound theatrical or like a stage performance.
            Keep the delivery conversational, warm, and suitable for a children's story.""";

    private static final String VILLAGE_CHIEF_SCENE7_TTS_GUIDE = """
            Natural conversational speech from a friendly Korean man in his 50s.

            He is a warm and approachable village chief who is used to talking
            with many different people and helping solve everyday problems.

            Speak clearly and naturally, with an easygoing and friendly conversational tone.
            He is practical and curious, and he genuinely wants to find a solution.

            In this scene, he is a little stuck and frustrated because he cannot
            figure out the problem immediately.
            Show mild confusion and impatience, but keep him good-natured and hopeful.

            When he hears an interesting idea, let genuine curiosity appear in his voice.
            When something seems useful, react openly and positively.

            Do not sound intimidating, angry, overly loud, or overly comedic.
            Do not sound theatrical or like a voice actor performing a character.

            Keep the delivery warm, conversational, energetic, and human.
            He should feel like a friendly village elder that children can comfortably talk to.""";

    private static final String DAUGHTER_IN_LAW_SCENE9_TTS_GUIDE = """
            Natural conversational speech from the same young adult Korean woman.

            She is now more at ease than earlier in the story.
            She still has a gentle and slightly shy personality,
            but she is noticeably calmer and more confident.

            Speak warmly and naturally, as if talking to someone she trusts
            and has gradually become more comfortable with.

            Use natural Korean conversational intonation.
            Allow brief pauses where natural, but use fewer hesitant pauses than earlier.

            Her confidence should feel subtle and gradual.
            She is beginning to accept herself, so there is a quiet sense of comfort
            and self-assurance beneath her words.

            Do not exaggerate the emotion.
            Do not sound theatrical or like a voice actor performing a character.
            Do not sound overly cute, childish, elderly, or motherly.

            Keep the delivery relaxed, warm, and human.
            She should still sound like the same person from the earlier scene,
            just slightly more comfortable and confident.""";

    private static final Map<Integer, DialogueSceneConstants> BY_SCENE_ORDER = Map.of(
            3, new DialogueSceneConstants(
                    "방귀쟁이 며느리",
                    "marin",
                    DAUGHTER_IN_LAW_SCENE3_TTS_GUIDE,
                    "조심스럽고 걱정이 많은 말투",
                    List.of(
                            new RemainingWorry(ThoughtElement.PERSPECTIVE, "가족들이 내 사정을 알아줄지 도무지 모르겠어."),
                            new RemainingWorry(ThoughtElement.EMOTION, "내가 얼마나 힘든지 아무도 몰라주는 것 같아."),
                            new RemainingWorry(ThoughtElement.REASON, "왜 꼭 말해야 하는지 나는 아직 잘 모르겠어."),
                            new RemainingWorry(ThoughtElement.SOLUTION, "말을 꺼내고 싶어도 어떻게 시작해야 할지 모르겠어.")
                    )
            ),
            5, new DialogueSceneConstants(
                    "시아버지",
                    "onyx",
                    FATHER_IN_LAW_SCENE5_TTS_GUIDE,
                    "완고하고 언성이 높은 말투",
                    List.of(
                            new RemainingWorry(ThoughtElement.PERSPECTIVE, "며느리에게 무슨 사정이 있었는지 나는 알 길이 없구나."),
                            new RemainingWorry(ThoughtElement.EMOTION, "나는 아직도 놀란 가슴이 가라앉지 않는구나."),
                            new RemainingWorry(ThoughtElement.REASON, "일부러 그런 것이 아니라는 걸 내가 어찌 믿겠느냐."),
                            new RemainingWorry(ThoughtElement.SOLUTION, "그래서 나더러 어찌하란 말이냐.")
                    )
            ),
            7, new DialogueSceneConstants(
                    "마을 이장",
                    "echo",
                    VILLAGE_CHIEF_SCENE7_TTS_GUIDE,
                    "사람 좋고 답답해하는 말투",
                    List.of(
                            new RemainingWorry(ThoughtElement.SOLUTION, "배를 딸 방도가 도무지 떠오르지 않는구려."),
                            new RemainingWorry(ThoughtElement.REASON, "그 방법이 정말 통할지 나는 알 수가 없구려."),
                            new RemainingWorry(ThoughtElement.REQUEST, "며느리에게 어찌 부탁을 해야 할지 모르겠구려."),
                            new RemainingWorry(ThoughtElement.RESULT, "사람들이 다치지나 않을까 그것이 걱정이구려.")
                    )
            ),
            9, new DialogueSceneConstants(
                    "방귀쟁이 며느리",
                    "marin",
                    DAUGHTER_IN_LAW_SCENE9_TTS_GUIDE,
                    "조금 밝아졌으나 아직 조심스러운 말투",
                    List.of(
                            new RemainingWorry(ThoughtElement.EMOTION, "아직은 마음이 조금 어색해."),
                            new RemainingWorry(ThoughtElement.PERSPECTIVE, "다른 사람들도 나처럼 남과 다른 점이 있을까."),
                            new RemainingWorry(ThoughtElement.RESULT, "내가 방귀를 뀌면 또 무슨 일이 생길지 모르겠어."),
                            new RemainingWorry(ThoughtElement.SOLUTION, "언제 어떻게 써야 좋을지 아직 모르겠어.")
                    )
            )
    );

    private DialogueContents() {
    }

    public static DialogueSceneConstants forSceneOrder(int sceneOrder) {
        DialogueSceneConstants constants = BY_SCENE_ORDER.get(sceneOrder);
        if (constants == null) {
            throw new BusinessException(ErrorCode.NOT_FOUND, "scene_order=" + sceneOrder + "에 대한 대화 상수가 없습니다.");
        }
        return constants;
    }

    /** 재료가 없으면 null을 반환한다 — 대체 문구를 만들어 채우지 않는다 (PRD 6.14). */
    public static String remainingWorryFor(int sceneOrder, ThoughtElement element) {
        return forSceneOrder(sceneOrder).remainingWorries().stream()
                .filter(worry -> worry.element() == element)
                .map(RemainingWorry::worry)
                .findFirst()
                .orElse(null);
    }
}
