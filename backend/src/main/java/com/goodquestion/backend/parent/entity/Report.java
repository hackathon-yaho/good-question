package com.goodquestion.backend.parent.entity;

import com.goodquestion.backend.session.entity.StorySession;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * PRD 8.12 확장 (decisions.md D-24). 원 스키마(summary·strengths·next_focus 3컬럼)로는
 * 리포트 가이드가 요구하는 구조(어휘·역량 5개·사고요소 집계·대표 발화·가정 가이드)를 담을 수
 * 없어 jsonb로 확장했다. 세션 완료(M-57) 시점에 규칙 기반으로 **한 번 생성**한다 — 계산 로직을
 * 나중에 바꿔도 이미 만들어진 리포트는 그대로 남는다. 다만 {@link #updateFromAi}로 AI가
 * 백그라운드에서 competencies·representative·guide만 한 번 더 덮어쓸 수 있다
 * (parent-report-ai-generation.md).
 */
@Entity
@Table(name = "reports")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false, unique = true)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private StorySession session;

    @Column(name = "summary", nullable = false, columnDefinition = "text")
    private String summary;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "vocabulary", nullable = false)
    private ReportVocabulary vocabulary;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "competencies", nullable = false)
    private List<CompetencyCard> competencies;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "element_counts", nullable = false)
    private List<ElementCount> elementCounts;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "representative")
    private RepresentativeUtterance representative;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "guide", nullable = false)
    private HomeGuide guide;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    protected void onPersist() {
        this.createdAt = Instant.now();
    }

    public static Report create(StorySession session, String summary, ReportVocabulary vocabulary,
                                 List<CompetencyCard> competencies, List<ElementCount> elementCounts,
                                 RepresentativeUtterance representative, HomeGuide guide) {
        Report report = new Report();
        report.session = session;
        report.summary = summary;
        report.vocabulary = vocabulary;
        report.competencies = competencies;
        report.elementCounts = elementCounts;
        report.representative = representative;
        report.guide = guide;
        return report;
    }

    /**
     * AI 생성 결과로 규칙 기반 내용을 덮어쓴다 (parent-report-ai-generation.md). 세션 완료 시
     * 동기로 만든 규칙 기반 리포트가 이미 저장돼 있고, 이건 그 뒤 백그라운드에서 AI가 성공했을
     * 때만 호출된다 — summary·vocabulary·elementCounts는 그대로 둔다(AI 담당 아님).
     */
    public void updateFromAi(List<CompetencyCard> competencies, RepresentativeUtterance representative, HomeGuide guide) {
        this.competencies = competencies;
        this.representative = representative;
        this.guide = guide;
    }
}
