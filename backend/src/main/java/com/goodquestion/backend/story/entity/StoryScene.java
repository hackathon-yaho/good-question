package com.goodquestion.backend.story.entity;

import com.goodquestion.backend.story.enums.SceneType;
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
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * PRD 8.7 + 팀 추가 컬럼(background_image_url — decisions.md D-15).
 *
 * 조건부 필수 규칙 (PRD I-05, 팀 결정): conflict ~ max_turns는 scene_type = DIALOGUE일 때만 값이 있다.
 * intro/narrative 장면에는 해당 값이 없으므로 전부 nullable로 둔다. JPA에서는 강제하지 않고
 * 서비스 계층(시드 적재 시점)에서 dialogue 장면만 값을 채우는 방식으로 지킨다.
 *
 * requiredElements는 ThoughtElement 값의 문자열 배열로 저장한다. enum 배열 매핑의 위험을 피하고
 * 실제 변환은 대화 엔진(Phase 4)에서 한다.
 */
@Entity
@Table(name = "story_scenes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StoryScene {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "story_id", nullable = false)
    private Story story;

    @Column(name = "scene_order", nullable = false)
    private Integer sceneOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "scene_type", nullable = false)
    private SceneType sceneType;

    @Column(name = "scene_description", nullable = false, columnDefinition = "text")
    private String sceneDescription;

    @Column(name = "background_image_url")
    private String backgroundImageUrl;

    /** dialogue 장면에만 값이 있다. 캐릭터 시점의 딜레마 — 화면에 노출하는 값이 아니다. */
    @Column(name = "conflict", columnDefinition = "text")
    private String conflict;

    /** 식별자를 저장한다 (예: ch_banggui_daughter_in_law). 표시명은 별도 코드 상수로 관리한다 (PRD I-13). */
    @Column(name = "character_name")
    private String characterName;

    @Column(name = "character_opening", columnDefinition = "text")
    private String characterOpening;

    @Column(name = "character_closing", columnDefinition = "text")
    private String characterClosing;

    @Column(name = "scene_goal", columnDefinition = "text")
    private String sceneGoal;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "required_elements")
    private List<String> requiredElements;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "element_criteria")
    private Map<String, String> elementCriteria;

    @Column(name = "preferred_turns")
    private Integer preferredTurns;

    @Column(name = "max_turns")
    private Integer maxTurns;

    public static StoryScene createNarrative(Story story, int sceneOrder, SceneType sceneType,
                                              String sceneDescription, String backgroundImageUrl) {
        StoryScene scene = new StoryScene();
        scene.story = story;
        scene.sceneOrder = sceneOrder;
        scene.sceneType = sceneType;
        scene.sceneDescription = sceneDescription;
        scene.backgroundImageUrl = backgroundImageUrl;
        return scene;
    }

    public static StoryScene createDialogue(Story story, int sceneOrder, String sceneDescription,
                                             String backgroundImageUrl, String conflict, String characterName,
                                             String characterOpening, String characterClosing, String sceneGoal,
                                             List<String> requiredElements, Map<String, String> elementCriteria,
                                             int preferredTurns, int maxTurns) {
        StoryScene scene = new StoryScene();
        scene.story = story;
        scene.sceneOrder = sceneOrder;
        scene.sceneType = SceneType.DIALOGUE;
        scene.sceneDescription = sceneDescription;
        scene.backgroundImageUrl = backgroundImageUrl;
        scene.conflict = conflict;
        scene.characterName = characterName;
        scene.characterOpening = characterOpening;
        scene.characterClosing = characterClosing;
        scene.sceneGoal = sceneGoal;
        scene.requiredElements = requiredElements;
        scene.elementCriteria = elementCriteria;
        scene.preferredTurns = preferredTurns;
        scene.maxTurns = maxTurns;
        return scene;
    }

    public boolean isDialogue() {
        return this.sceneType == SceneType.DIALOGUE;
    }
}
