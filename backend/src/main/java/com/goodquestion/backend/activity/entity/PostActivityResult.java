package com.goodquestion.backend.activity.entity;

import com.goodquestion.backend.session.entity.StorySession;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * PRD 8.11. 세션당 최종 결과 한 건만 저장한다 — 시도별 과정은 저장하지 않고 최신 시도로 덮어쓴다.
 * 정답 여부는 서버가 계산한다 (프론트 판정 금지). 재시도 3회 제한은 decisions.md D-10 참조 —
 * 3회째 실패해도 다음 단계로 통과시키지만 is_order_correct는 false로 정직하게 남긴다.
 */
@Entity
@Table(name = "post_activity_results")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PostActivityResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false, unique = true)
    private StorySession session;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "submitted_order")
    private List<String> submittedOrder;

    @Column(name = "is_order_correct")
    private Boolean isOrderCorrect;

    @Column(name = "attempt_count", nullable = false)
    private Integer attemptCount;

    @Column(name = "retelling_text", columnDefinition = "text")
    private String retellingText;

    @Column(name = "completed_at")
    private Instant completedAt;

    public static PostActivityResult create(StorySession session) {
        PostActivityResult result = new PostActivityResult();
        result.session = session;
        result.attemptCount = 0;
        return result;
    }

    public void recordAttempt(List<String> submittedOrder, boolean isCorrect) {
        this.submittedOrder = submittedOrder;
        this.isOrderCorrect = isCorrect;
        this.attemptCount += 1;
    }

    public void completeRetelling(String retellingText) {
        this.retellingText = retellingText;
        this.completedAt = Instant.now();
    }
}
