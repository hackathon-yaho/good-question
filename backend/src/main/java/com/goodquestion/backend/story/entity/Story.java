package com.goodquestion.backend.story.entity;

import com.goodquestion.backend.story.enums.StoryStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;
import java.util.UUID;

/**
 * PRD 8.6 + 팀 추가 컬럼 3개(situation, child_role, cover_image_url — decisions.md D-07 · D-15).
 * situation/child_role은 화면 상세의 "이야기 상황"·"아이 역할" 문구다. conflict(장면별 캐릭터 딜레마)와는
 * 다른 값이므로 절대 혼동하지 않는다.
 */
@Entity
@Table(name = "stories")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Story {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "summary", nullable = false, columnDefinition = "text")
    private String summary;

    @Column(name = "situation")
    private String situation;

    @Column(name = "child_role")
    private String childRole;

    @Column(name = "cover_image_url")
    private String coverImageUrl;

    @Column(name = "difficulty", nullable = false)
    private String difficulty;

    @JdbcTypeCode(SqlTypes.ARRAY)
    @Column(name = "topics")
    private List<String> topics;

    @Column(name = "estimated_minutes")
    private Integer estimatedMinutes;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "post_activity_config")
    private PostActivityConfig postActivityConfig;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private StoryStatus status;

    public static Story create(String title, String summary, String situation, String childRole,
                                String difficulty, List<String> topics, Integer estimatedMinutes) {
        Story story = new Story();
        story.title = title;
        story.summary = summary;
        story.situation = situation;
        story.childRole = childRole;
        story.difficulty = difficulty;
        story.topics = topics;
        story.estimatedMinutes = estimatedMinutes;
        story.status = StoryStatus.DRAFT;
        return story;
    }

    public void publish() {
        this.status = StoryStatus.PUBLISHED;
    }

    public void updateCoverImageUrl(String coverImageUrl) {
        this.coverImageUrl = coverImageUrl;
    }

    public void updatePostActivityConfig(PostActivityConfig postActivityConfig) {
        this.postActivityConfig = postActivityConfig;
    }
}
