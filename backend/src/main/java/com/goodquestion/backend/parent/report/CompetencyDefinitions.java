package com.goodquestion.backend.parent.report;

import java.util.List;

/**
 * 리포트 가이드 3-2(표현 3종)·3-3(논리 2종). 문구는 프론트 mock(`frontend/src/lib/api/mock-parent.ts`
 * COMPETENCY_DEFS)을 그대로 옮겼다 — 새로 쓰지 않았다. 팀 창작 콘텐츠라 DB가 아니라 코드 상수로 둔다
 * (DialogueContents·HighlightWords와 같은 이유).
 */
public final class CompetencyDefinitions {

    public static final List<CompetencyDefinition> ALL = List.of(
            new CompetencyDefinition(
                    "관점과 공감",
                    List.of("PERSPECTIVE", "EMPATHY"),
                    "다른 인물의 처지를 헤아려 말한 부분이 있었어요.",
                    "이번에는 다른 인물의 입장에서 말한 부분이 잘 보이지 않았어요.",
                    "상대가 왜 그렇게 느꼈을지 먼저 생각해 본 점이 좋았어요.",
                    "자기 생각을 분명하게 말한 점이 좋았어요.",
                    "\"그 사람은 어떤 마음이었을까?\"처럼 상대의 입장을 묻는 질문을 해보세요."
            ),
            new CompetencyDefinition(
                    "감정 표현",
                    List.of("EMOTION"),
                    "감정을 가리키는 말을 직접 사용했어요.",
                    "감정을 나타내는 말은 아직 자주 나오지 않았어요.",
                    "느낌을 자기 말로 표현한 점이 좋았어요.",
                    "상황을 차분히 설명한 점이 좋았어요.",
                    "\"그때 어떤 기분이었어?\"를 덧붙여 감정과 이유를 함께 말해보게 해주세요."
            ),
            new CompetencyDefinition(
                    "상호작용",
                    List.of("REQUEST"),
                    "상대에게 무엇을 해달라고 구체적으로 말했어요.",
                    "상대에게 부탁하거나 요청하는 말은 아직 적었어요.",
                    "무엇을 원하는지 분명히 전한 점이 좋았어요.",
                    "끝까지 이야기에 집중한 점이 좋았어요.",
                    "\"누구에게 어떻게 말하면 좋을까?\"로 요청을 연습해 보세요."
            ),
            new CompetencyDefinition(
                    "생각과 이유",
                    List.of("DECISION", "REASON"),
                    "자기 판단과 그 까닭을 함께 말했어요.",
                    "판단은 말했지만 까닭은 아직 짧게 지나갔어요.",
                    "\"왜냐하면\"에 해당하는 말을 스스로 붙인 점이 좋았어요.",
                    "자기 생각을 망설이지 않고 말한 점이 좋았어요.",
                    "\"왜 그렇게 생각했어?\"를 한 번 더 물어봐 주세요."
            ),
            new CompetencyDefinition(
                    "결과와 해결",
                    List.of("RESULT", "SOLUTION"),
                    "무엇을 하면 좋을지, 그러면 어떻게 될지를 말했어요.",
                    "해결 방법이나 그 뒤에 벌어질 일은 아직 적게 나왔어요.",
                    "방법을 떠올려 말한 점이 좋았어요.",
                    "이야기를 끝까지 따라간 점이 좋았어요.",
                    "\"그러면 그다음엔 어떻게 될까?\"로 결과를 상상하게 해보세요."
            )
    );

    private CompetencyDefinitions() {
    }
}
