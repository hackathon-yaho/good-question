package com.goodquestion.backend.message.entity;

import com.goodquestion.backend.message.enums.SpeakerType;
import com.goodquestion.backend.session.entity.StorySession;
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
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;
import java.util.UUID;

/**
 * PRD 8.9. 원본 음성 파일은 저장하지 않는다. STT 변환 실패로 확정 텍스트가 없으면
 * 이 엔티티 자체를 생성하지 않는다 — 그 판단은 서비스 계층(STT 엔드포인트 분리, decisions.md D-02)의 책임이다.
 */
@Entity
@Table(name = "messages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private StorySession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scene_id", nullable = false)
    private StoryScene scene;

    @Enumerated(EnumType.STRING)
    @Column(name = "speaker_type", nullable = false)
    private SpeakerType speakerType;

    @Column(name = "turn_order", nullable = false)
    private Integer turnOrder;

    @Column(name = "text", nullable = false, columnDefinition = "text")
    private String text;

    /** 아이 발화에만 저장한다 (PRD 8.9). */
    @Column(name = "stt_raw_text", columnDefinition = "text")
    private String sttRawText;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    protected void onPersist() {
        this.createdAt = Instant.now();
    }

    public static Message ofChild(StorySession session, StoryScene scene, int turnOrder,
                                   String text, String sttRawText) {
        Message message = new Message();
        message.session = session;
        message.scene = scene;
        message.speakerType = SpeakerType.CHILD;
        message.turnOrder = turnOrder;
        message.text = text;
        message.sttRawText = sttRawText;
        return message;
    }

    public static Message ofCharacter(StorySession session, StoryScene scene, int turnOrder, String text) {
        Message message = new Message();
        message.session = session;
        message.scene = scene;
        message.speakerType = SpeakerType.CHARACTER;
        message.turnOrder = turnOrder;
        message.text = text;
        return message;
    }

    public static Message ofSystem(StorySession session, StoryScene scene, int turnOrder, String text) {
        Message message = new Message();
        message.session = session;
        message.scene = scene;
        message.speakerType = SpeakerType.SYSTEM;
        message.turnOrder = turnOrder;
        message.text = text;
        return message;
    }
}
