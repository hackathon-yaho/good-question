package com.goodquestion.backend.session.entity;

import com.goodquestion.backend.child.entity.Child;
import com.goodquestion.backend.common.enums.ThoughtElement;
import com.goodquestion.backend.session.enums.ResponseMode;
import com.goodquestion.backend.session.enums.SceneEndReason;
import com.goodquestion.backend.session.enums.SessionStatus;
import com.goodquestion.backend.story.entity.Story;
import com.goodquestion.backend.story.entity.StoryScene;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * PRD 8.8. 아이의 이야기 진행 상태 머신.
 *
 * 턴마다 누적 요소·모드·유도 대상을 갱신하는 로직(대화 엔진 ②③)은 여기 없다 — 그 계산은
 * 규칙 엔진(Phase 4)의 책임이고, 이 엔티티는 계산된 결과를 반영하는 역할만 한다.
 * 지금 구현된 메서드는 PRD가 이미 명시적으로 규정한 상태 전이(장면 전환 시 초기화, 세션 생성/중단/완료)뿐이다.
 */
@Entity
@Table(name = "story_sessions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StorySession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "child_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Child child;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_scene_id")
    private StoryScene currentScene;

    @Column(name = "current_child_turn_count", nullable = false)
    private Integer currentChildTurnCount;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "accumulated_elements", nullable = false)
    private List<String> accumulatedElements;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "last_detected_elements", nullable = false)
    private List<String> lastDetectedElements;

    @Enumerated(EnumType.STRING)
    @Column(name = "last_response_mode")
    private ResponseMode lastResponseMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "last_guidance_target")
    private ThoughtElement lastGuidanceTarget;

    @Column(name = "turns_without_new_element", nullable = false)
    private Integer turnsWithoutNewElement;

    @Column(name = "consecutive_low_information_turns", nullable = false)
    private Integer consecutiveLowInformationTurns;

    @Column(name = "scene_goal_met", nullable = false)
    private Boolean sceneGoalMet;

    @Enumerated(EnumType.STRING)
    @Column(name = "scene_end_reason")
    private SceneEndReason sceneEndReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SessionStatus status;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "last_activity_at", nullable = false)
    private Instant lastActivityAt;

    @PrePersist
    protected void onPersist() {
        Instant now = Instant.now();
        this.startedAt = now;
        this.lastActivityAt = now;
    }

    public static StorySession create(Child child, Story story, StoryScene introScene) {
        StorySession session = new StorySession();
        session.child = child;
        session.story = story;
        session.currentScene = introScene;
        session.currentChildTurnCount = 0;
        session.accumulatedElements = new ArrayList<>();
        session.lastDetectedElements = new ArrayList<>();
        session.turnsWithoutNewElement = 0;
        session.consecutiveLowInformationTurns = 0;
        session.sceneGoalMet = false;
        session.status = SessionStatus.IN_PROGRESS;
        return session;
    }

    /**
     * 장면 전환 시 초기화 (PRD 8.8). 다음 장면이 이전 장면의 누적 요소를 물려받으면
     * 첫 턴에 즉시 종료되므로 반드시 호출해야 한다.
     */
    public void advanceToScene(StoryScene nextScene) {
        this.currentScene = nextScene;
        this.currentChildTurnCount = 0;
        this.accumulatedElements = new ArrayList<>();
        this.lastDetectedElements = new ArrayList<>();
        this.turnsWithoutNewElement = 0;
        this.consecutiveLowInformationTurns = 0;
        this.sceneGoalMet = false;
        this.sceneEndReason = null;
        this.lastResponseMode = null;
        this.lastGuidanceTarget = null;
        this.lastActivityAt = Instant.now();
    }

    public void startPostActivity() {
        this.status = SessionStatus.POST_ACTIVITY;
        this.lastActivityAt = Instant.now();
    }

    public void complete() {
        this.status = SessionStatus.COMPLETED;
        this.completedAt = Instant.now();
        this.lastActivityAt = this.completedAt;
    }

    public void stop() {
        this.status = SessionStatus.STOPPED;
        this.lastActivityAt = Instant.now();
    }
}
