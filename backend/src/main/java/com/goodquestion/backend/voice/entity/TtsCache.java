package com.goodquestion.backend.voice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

/**
 * PRD 8.1 (팀 추가, decisions.md D-05). 텍스트 해시 → 생성된 오디오.
 * Render 무료 티어는 재배포 시 파일시스템이 초기화되므로 파일이 아니라 DB(bytea)에 저장한다.
 * columnDefinition을 명시해 Hibernate가 large object(oid)가 아닌 bytea로 매핑하도록 강제한다.
 */
@Entity
@Table(name = "tts_cache")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TtsCache {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "text_hash", nullable = false, unique = true)
    private String textHash;

    @Column(name = "audio", nullable = false, columnDefinition = "bytea")
    private byte[] audio;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    protected void onPersist() {
        this.createdAt = Instant.now();
    }

    public static TtsCache create(String textHash, byte[] audio) {
        TtsCache cache = new TtsCache();
        cache.textHash = textHash;
        cache.audio = audio;
        return cache;
    }
}
