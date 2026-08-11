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

    private static final Map<Integer, DialogueSceneConstants> BY_SCENE_ORDER = Map.of(
            3, new DialogueSceneConstants(
                    "방귀쟁이 며느리",
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
