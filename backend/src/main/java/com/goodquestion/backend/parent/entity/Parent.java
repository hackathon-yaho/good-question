package com.goodquestion.backend.parent.entity;

import com.goodquestion.backend.parent.enums.Provider;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
 * PRD 8.3 + 팀 추가 컬럼(provider, provider_id, email).
 * PRD 원본 정의는 id/name/created_at 뿐이나, 카카오 로그인 시 재방문 사용자를 조회할 방법이
 * 없어 추가했다. email은 카카오 동의항목에서 선택으로 빠질 수 있어 nullable로 둔다 — 식별은
 * provider_id로 하므로 email 없이도 서비스는 동작한다.
 */
@Entity
@Table(name = "parents")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Parent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @Column(name = "name", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider", nullable = false)
    private Provider provider;

    @Column(name = "provider_id", nullable = false, unique = true)
    private String providerId;

    @Column(name = "email")
    private String email;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    protected void onPersist() {
        this.createdAt = Instant.now();
    }

    public static Parent create(String name, Provider provider, String providerId, String email) {
        Parent parent = new Parent();
        parent.name = name;
        parent.provider = provider;
        parent.providerId = providerId;
        parent.email = email;
        return parent;
    }

    public void updateLoginInfo(String name, String email) {
        if (name != null && !name.isBlank()) this.name = name;
        if (email != null && !email.isBlank()) this.email = email;
    }
}
