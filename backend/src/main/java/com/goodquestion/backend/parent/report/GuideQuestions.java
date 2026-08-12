package com.goodquestion.backend.parent.report;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * 리포트 가이드 6절(이야기 주제 이어가기·일상생활로 연결하기) 예시 질문 세트. 프론트 mock의
 * STORY_QUESTIONS·DAILY_QUESTIONS를 그대로 옮겼다 — 새로 짓지 않았다.
 *
 * STORY_QUESTIONS에는 SHORT 세트가 없다 — 답변이 짧은 아이에게도 "이야기 주제"는
 * REASON 세트를 그대로 쓴다 (mock의 `kind === "short" ? STORY_QUESTIONS.reason : ...`).
 */
public final class GuideQuestions {

    private static final Map<QuestionKind, List<String>> STORY_QUESTIONS = new EnumMap<>(Map.of(
            QuestionKind.REASON, List.of(
                    "며느리는 사람들 앞에서 방귀를 뀌었을 때 어떤 기분이었을까?",
                    "며느리의 마음을 기분 날씨로 표현하면 맑음, 흐림, 비 중 무엇일까? 왜 그렇게 생각했어?"
            ),
            QuestionKind.PERSPECTIVE, List.of(
                    "시아버지는 처음에 왜 며느리를 집에서 내보내려고 했을까?",
                    "시아버지는 며느리에게 어떤 말을 해주면 좋을까?"
            ),
            QuestionKind.SOLUTION, List.of(
                    "며느리가 부엌에서 방귀를 뀌어 그릇이 깨졌다면 어떻게 해야 할까?",
                    "빨래를 빨리 말리기 위해 며느리의 방귀를 어떻게 활용하면 좋을까?"
            )
    ));

    private static final Map<QuestionKind, List<String>> DAILY_QUESTIONS = new EnumMap<>(Map.of(
            QuestionKind.REASON, List.of(
                    "너도 창피해서 하고 싶은 말을 하지 못한 적이 있어?",
                    "그때 어떤 일이 있었고, 왜 창피했어?"
            ),
            QuestionKind.PERSPECTIVE, List.of(
                    "친구가 자신의 특징 때문에 부끄러워한다면 어떤 기분일까?",
                    "그 친구에게 어떤 말을 해주고 싶어?"
            ),
            QuestionKind.SOLUTION, List.of(
                    "친구의 단점을 놀리면 그 친구는 어떤 기분이 들까?",
                    "그런 일이 계속되면 친구 사이에는 어떤 일이 생길까?"
            ),
            QuestionKind.SHORT, List.of(
                    "단점이라고 생각했던 것이 도움이 된 적이 있어?",
                    "언제 있었던 일인지, 어떻게 도움이 됐는지 자세히 말해줄래?"
            )
    ));

    private GuideQuestions() {
    }

    public static List<String> storyQuestions(QuestionKind kind) {
        return STORY_QUESTIONS.getOrDefault(kind, STORY_QUESTIONS.get(QuestionKind.REASON));
    }

    public static List<String> dailyQuestions(QuestionKind kind) {
        return DAILY_QUESTIONS.get(kind);
    }
}
