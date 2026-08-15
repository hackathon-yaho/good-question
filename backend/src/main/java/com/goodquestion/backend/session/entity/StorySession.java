package com.goodquestion.backend.session.entity;

import com.goodquestion.backend.child.entity.Child;
import com.goodquestion.backend.common.enums.ThoughtElement;
import com.goodquestion.backend.session.engine.MissionTrigger;
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

    /** 미션이 노출된 턴 번호. 노출 전이면 null (D-49 — 미션과 대화 세션의 턴 예산 분리). */
    @Column(name = "mission_revealed_at_turn")
    private Integer missionRevealedAtTurn;

    /** 미션 노출 후 소모된 턴 수 — GUIDED로 응답한 턴은 세지 않는다 (D-50). */
    @Column(name = "mission_engaged_turns", nullable = false)
    private Integer missionEngagedTurns;

    /**
     * 미션 노출 후 "공짜로" 넘어간 GUIDED 턴 수 (D-50). 이 값이
     * {@link MissionTrigger#FREE_GUIDED_TURNS_AFTER_REVEAL}에 도달하면, 그다음부터의
     * GUIDED 턴은 {@link #missionEngagedTurns}를 소모한다 — 가이드 반복으로 턴이 무한히
     * 늘어지는 것을 막는다.
     */
    @Column(name = "mission_free_guided_turns_used", nullable = false)
    private Integer missionFreeGuidedTurnsUsed;

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
        session.missionEngagedTurns = 0;
        session.missionFreeGuidedTurnsUsed = 0;
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
        this.missionRevealedAtTurn = null;
        this.missionEngagedTurns = 0;
        this.missionFreeGuidedTurnsUsed = 0;
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

    /**
     * 진행 판단 규칙 엔진(M-38~M-41)이 계산한 이번 턴의 결과를 세션에 반영한다 (M-44, PRD 8.8).
     * guidanceTarget이 null이면(NORMAL/CLOSING) 직전 유도 대상을 그대로 둔다 — 다음 GUIDED 턴에서
     * "직전 유도 요소 반복 방지"에 계속 쓰이기 때문이다 (PRD 6.9 유도 대상 선택 원칙).
     */
    public void recordTurnResult(int turnCount, List<String> accumulatedElements, List<String> newlyDetectedTypes,
                                  ResponseMode mode, ThoughtElement guidanceTarget,
                                  int turnsWithoutNewElement, int consecutiveLowInformationTurns,
                                  boolean sceneGoalMet) {
        this.currentChildTurnCount = turnCount;
        this.accumulatedElements = accumulatedElements;
        this.lastDetectedElements = newlyDetectedTypes;
        this.lastResponseMode = mode;
        if (guidanceTarget != null) this.lastGuidanceTarget = guidanceTarget;
        this.turnsWithoutNewElement = turnsWithoutNewElement;
        this.consecutiveLowInformationTurns = consecutiveLowInformationTurns;
        this.sceneGoalMet = sceneGoalMet;
        this.lastActivityAt = Instant.now();
    }

    /** CLOSING 확정 시 종료 사유를 남긴다. AI 실패로 강제 종료된 경우는 사유가 없어 null일 수 있다 (B-12). */
    public void closeScene(SceneEndReason reason) {
        this.sceneEndReason = reason;
        this.lastActivityAt = Instant.now();
    }

    /** 미션이 노출된 턴을 기록한다 (D-49). 이후 진행 판단이 이 턴 기준으로 별도 턴 예산을 준다. */
    public void recordMissionRevealed(int turnCount) {
        this.missionRevealedAtTurn = turnCount;
        this.missionEngagedTurns = 0;
        this.missionFreeGuidedTurnsUsed = 0;
    }

    /** 미션 노출 후 예산을 소모하는 턴이 한 번 더 발생했음을 기록한다 (D-50). */
    public void recordMissionEngagedTurn() {
        this.missionEngagedTurns++;
    }

    /** 미션 노출 후 GUIDED 턴이 "공짜로" 한 번 더 넘어갔음을 기록한다 (D-50). */
    public void recordMissionFreeGuidedTurn() {
        this.missionFreeGuidedTurnsUsed++;
    }
}
