package com.goodquestion.backend.parent.report;

import com.goodquestion.backend.parent.entity.CompetencyCard;
import com.goodquestion.backend.parent.entity.ElementCount;
import com.goodquestion.backend.parent.entity.RepresentativeUtterance;
import com.goodquestion.backend.parent.entity.ReportVocabulary;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ReportGeneratorTest {

    // ── sentenceCount ────────────────────────────────────────────────

    @Test
    void 문장부호_기준으로_문장_수를_센다() {
        assertThat(ReportGenerator.sentenceCount("며느리가 속상했을 것 같아. 시아버지가 먼저 미안하다고 해야 해."))
                .isEqualTo(2);
    }

    @Test
    void 문장부호가_없어도_최소_1이다() {
        assertThat(ReportGenerator.sentenceCount("음")).isEqualTo(1);
    }

    // ── vocabularyOf ─────────────────────────────────────────────────

    @Test
    void 반복된_단어가_있으면_repeated에_담고_긍정_피드백을_준다() {
        ReportVocabulary vocabulary = ReportGenerator.vocabularyOf(
                List.of("방귀 방귀 방귀", "며느리가 방귀를 뀌었어요"));

        assertThat(vocabulary.repeated()).contains("방귀");
        assertThat(vocabulary.feedback()).contains("자주 쓴 말이 있어요");
    }

    @Test
    void 반복된_단어가_없으면_대체_피드백을_준다() {
        ReportVocabulary vocabulary = ReportGenerator.vocabularyOf(List.of("며느리가 배나무를 봤어요"));

        assertThat(vocabulary.repeated()).isEmpty();
        assertThat(vocabulary.feedback()).contains("새로운 낱말");
    }

    // ── competenciesOf ───────────────────────────────────────────────

    @Test
    void 사고요소가_있으면_긍정_문구와_근거_발화를_담는다() {
        List<CompetencyCard> cards = ReportGenerator.competenciesOf(
                List.of("PERSPECTIVE"), List.of("며느리가 속상했을 것 같아"));

        CompetencyCard perspective = cards.stream()
                .filter(c -> c.name().equals("관점과 공감")).findFirst().orElseThrow();

        assertThat(perspective.evidence()).isEqualTo("며느리가 속상했을 것 같아");
        assertThat(perspective.feature()).contains("헤아려 말한 부분이 있었어요");
    }

    @Test
    void 사고요소가_없으면_부정적이지_않은_문구를_주고_근거는_null이다() {
        List<CompetencyCard> cards = ReportGenerator.competenciesOf(List.of(), List.of("아무 말"));

        CompetencyCard perspective = cards.stream()
                .filter(c -> c.name().equals("관점과 공감")).findFirst().orElseThrow();

        assertThat(perspective.evidence()).isNull();
        assertThat(perspective.feature()).doesNotContain("아쉽");
    }

    @Test
    void 항상_5개_역량_전부를_반환한다() {
        assertThat(ReportGenerator.competenciesOf(List.of(), List.of())).hasSize(5);
    }

    // ── elementCountsOf ──────────────────────────────────────────────

    @Test
    void 사고요소를_4그룹으로_집계한다() {
        List<ElementCount> counts = ReportGenerator.elementCountsOf(
                List.of("EMOTION", "EMOTION", "EMPATHY", "REASON", "SOLUTION"));

        assertThat(counts).containsExactly(
                new ElementCount("마음", 3),
                new ElementCount("이유", 1),
                new ElementCount("생각", 0),
                new ElementCount("방법", 1));
    }

    @Test
    void 스키마에_없는_값은_조용히_무시한다() {
        List<ElementCount> counts = ReportGenerator.elementCountsOf(List.of("UNKNOWN"));

        assertThat(counts).allMatch(c -> c.count() == 0);
    }

    // ── representativeOf ─────────────────────────────────────────────

    @Test
    void 문장수가_많은_발화를_대표로_고른다() {
        RepresentativeUtterance result = ReportGenerator.representativeOf(List.of(
                new ChildUtterance("짧은 말.", 1),
                new ChildUtterance("며느리가 속상했을 것 같아. 시아버지가 먼저 미안하다고 해야 해.", 2)));

        assertThat(result.text()).contains("시아버지가 먼저 미안하다고 해야 해");
        assertThat(result.sceneLabel()).isEqualTo("장면 2");
    }

    @Test
    void 문장수가_같으면_더_긴_발화를_고른다() {
        RepresentativeUtterance result = ReportGenerator.representativeOf(List.of(
                new ChildUtterance("짧다", 1),
                new ChildUtterance("이것이 더 긴 발화입니다", 1)));

        assertThat(result.text()).isEqualTo("이것이 더 긴 발화입니다");
    }

    @Test
    void 발화가_없으면_null() {
        assertThat(ReportGenerator.representativeOf(List.of())).isNull();
    }

    // ── pickQuestionKind ─────────────────────────────────────────────

    @Test
    void 평균_발화_길이가_짧으면_SHORT() {
        QuestionKind kind = ReportGenerator.pickQuestionKind(List.of("응", "음"), List.of("PERSPECTIVE"));

        assertThat(kind).isEqualTo(QuestionKind.SHORT);
    }

    @Test
    void 표현_요소가_많으면_REASON() {
        QuestionKind kind = ReportGenerator.pickQuestionKind(
                List.of("충분히 긴 발화라서 짧지 않습니다"),
                List.of("PERSPECTIVE", "EMOTION", "REASON"));

        assertThat(kind).isEqualTo(QuestionKind.REASON);
    }

    @Test
    void 논리_요소가_많으면_PERSPECTIVE() {
        QuestionKind kind = ReportGenerator.pickQuestionKind(
                List.of("충분히 긴 발화라서 짧지 않습니다"),
                List.of("DECISION", "REASON", "EMOTION"));

        assertThat(kind).isEqualTo(QuestionKind.PERSPECTIVE);
    }

    @Test
    void 표현과_논리가_같으면_SOLUTION() {
        QuestionKind kind = ReportGenerator.pickQuestionKind(
                List.of("충분히 긴 발화라서 짧지 않습니다"),
                List.of("EMOTION", "REASON"));

        assertThat(kind).isEqualTo(QuestionKind.SOLUTION);
    }

    // ── guideFor / summaryOf ─────────────────────────────────────────

    @Test
    void SHORT_유형의_이야기_질문은_REASON_세트로_대체된다() {
        assertThat(ReportGenerator.guideFor(QuestionKind.SHORT).storyQuestions())
                .isEqualTo(GuideQuestions.storyQuestions(QuestionKind.REASON));
    }

    @Test
    void summary는_발화_횟수를_포함한다() {
        assertThat(ReportGenerator.summaryOf(18)).contains("18번");
    }
}
