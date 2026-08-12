package com.goodquestion.backend.parent.report;

import com.goodquestion.backend.parent.entity.CompetencyCard;
import com.goodquestion.backend.parent.entity.ElementCount;
import com.goodquestion.backend.parent.entity.HomeGuide;
import com.goodquestion.backend.parent.entity.RepresentativeUtterance;
import com.goodquestion.backend.parent.entity.ReportVocabulary;

import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 보호자 리포트 계산 로직 (O-01~O-05, work-items.md 12장). `frontend/src/lib/api/mock-parent.ts`의
 * 알고리즘을 그대로 포팅했다 — 새로 설계하지 않았다. 순수 함수로 두고 단위 테스트를 붙인다
 * (session/engine 패키지와 같은 원칙).
 */
public final class ReportGenerator {

    /** 아이 화면과 같은 4그룹, 표시 순서 고정 (frontend thinking-elements.ts KID_GROUPS). */
    private static final List<String> KID_GROUPS = List.of("마음", "이유", "생각", "방법");

    private static final Map<String, String> KID_LABEL = Map.of(
            "EMOTION", "마음",
            "EMPATHY", "마음",
            "REASON", "이유",
            "PERSPECTIVE", "생각",
            "DECISION", "생각",
            "RESULT", "생각",
            "SOLUTION", "방법",
            "REQUEST", "방법"
    );

    private static final Set<String> EXPRESSIVE_ELEMENTS = Set.of("PERSPECTIVE", "EMPATHY", "EMOTION", "REQUEST");
    private static final Set<String> LOGICAL_ELEMENTS = Set.of("DECISION", "REASON", "RESULT", "SOLUTION");

    private static final int MAIN_WORDS_LIMIT = 6;
    private static final int REPEATED_WORDS_LIMIT = 3;
    private static final int MIN_WORD_LENGTH = 2;
    private static final int REPEATED_THRESHOLD = 2;
    private static final int SHORT_AVG_LENGTH_THRESHOLD = 15;

    private ReportGenerator() {
    }

    /** 한국어 문장 수 — 문장 부호 뒤 공백 기준 분리. 대표 발화 선정의 1차 기준. */
    public static int sentenceCount(String text) {
        String[] parts = text.split("(?<=[.!?])\\s+");
        long nonBlank = Arrays.stream(parts).filter(p -> !p.isBlank()).count();
        return (int) Math.max(1, nonBlank);
    }

    /** 리포트 가이드 3-1. 형태소 분석 없이 단순 빈도로 센다 — 뚜렷하지 않아도 부정적으로 평가하지 않는다. */
    public static ReportVocabulary vocabularyOf(List<String> childUtterances) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (String utterance : childUtterances) {
            for (String word : utterance.split("[\\s,.!?\"']+")) {
                String trimmed = word.trim();
                if (trimmed.length() >= MIN_WORD_LENGTH) {
                    counts.merge(trimmed, 1, Integer::sum);
                }
            }
        }

        List<Map.Entry<String, Integer>> sorted = counts.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .toList();

        List<String> mainWords = sorted.stream().map(Map.Entry::getKey).limit(MAIN_WORDS_LIMIT).toList();
        List<String> repeated = sorted.stream()
                .filter(e -> e.getValue() >= REPEATED_THRESHOLD)
                .map(Map.Entry::getKey)
                .limit(REPEATED_WORDS_LIMIT)
                .toList();

        String feedback = repeated.isEmpty()
                ? "이번 활동에서 쓴 낱말을 살펴봤어요. 새로운 낱말을 함께 찾아보면 표현이 더 풍부해져요."
                : "자주 쓴 말이 있어요. 비슷한 뜻의 다른 낱말도 함께 알려주면 표현이 넓어져요.";

        return new ReportVocabulary(mainWords, repeated, feedback);
    }

    /** 리포트 가이드 3-2·3-3. 근거는 실제 발화 중 가장 긴 것 — 5개 역량 모두, 매칭 안 돼도 문구는 항상 긍정적으로. */
    public static List<CompetencyCard> competenciesOf(List<String> detectedElementTypes, List<String> childUtterances) {
        Set<String> seen = Set.copyOf(detectedElementTypes);
        String longestUtterance = childUtterances.stream()
                .max(Comparator.comparingInt(String::length))
                .orElse(null);

        return CompetencyDefinitions.ALL.stream()
                .map(def -> {
                    boolean matched = def.elements().stream().anyMatch(seen::contains);
                    return new CompetencyCard(
                            def.name(),
                            matched ? def.seenFeature() : def.unseenFeature(),
                            matched ? longestUtterance : null,
                            matched ? def.strengthSeen() : def.strengthUnseen(),
                            def.next());
                })
                .toList();
    }

    /** 세션 전체(장면 초기화와 무관)에서 탐지된 사고 요소를 4그룹으로 집계 — 많고 적음이 잘함·못함을 뜻하지 않는다. */
    public static List<ElementCount> elementCountsOf(List<String> detectedElementTypes) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        KID_GROUPS.forEach(group -> counts.put(group, 0));

        for (String type : detectedElementTypes) {
            String group = KID_LABEL.get(type);
            if (group != null) counts.merge(group, 1, Integer::sum);
        }

        return KID_GROUPS.stream().map(label -> new ElementCount(label, counts.get(label))).toList();
    }

    /** 리포트 가이드 5절 — 1개만. 문장수 많은 순 → 길이 순으로 가장 완성도 높은 발화를 고른다 (Q-08). */
    public static RepresentativeUtterance representativeOf(List<ChildUtterance> utterances) {
        if (utterances.isEmpty()) return null;

        ChildUtterance best = utterances.stream()
                .max(Comparator.comparingInt((ChildUtterance u) -> sentenceCount(u.text()))
                        .thenComparingInt(u -> u.text().length()))
                .orElseThrow();

        return new RepresentativeUtterance(
                best.text(),
                "장면 " + best.sceneIndex(),
                "생각과 그 까닭이 한 번에 이어져, 아이의 말하기 강점이 가장 잘 드러난 발화예요.");
    }

    /** 리포트 가이드 7절 맞춤형 질문 추천 기준. */
    public static QuestionKind pickQuestionKind(List<String> childUtterances, List<String> detectedElementTypes) {
        double avgLength = childUtterances.isEmpty()
                ? 0
                : childUtterances.stream().mapToInt(String::length).average().orElse(0);
        if (avgLength > 0 && avgLength < SHORT_AVG_LENGTH_THRESHOLD) return QuestionKind.SHORT;

        long expressive = detectedElementTypes.stream().filter(EXPRESSIVE_ELEMENTS::contains).count();
        long logical = detectedElementTypes.stream().filter(LOGICAL_ELEMENTS::contains).count();

        if (expressive > logical) return QuestionKind.REASON;
        if (logical > expressive) return QuestionKind.PERSPECTIVE;
        return QuestionKind.SOLUTION;
    }

    public static String summaryOf(int childUtteranceCount) {
        return "이번 이야기에서 아이가 " + childUtteranceCount + "번 말했어요. 아래는 그 말들을 바탕으로 정리한 내용입니다.";
    }

    public static HomeGuide guideFor(QuestionKind kind) {
        return new HomeGuide(
                "학습 과제가 아니라, 오늘 나눈 이야기를 자연스럽게 이어가기 위한 질문이에요.",
                GuideQuestions.storyQuestions(kind),
                GuideQuestions.dailyQuestions(kind));
    }
}
