package com.goodquestion.backend.child.entity;

import com.goodquestion.backend.child.enums.VerificationMethod;
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
 * PRD 8.5. 동의가 없거나 철회된 아이는 새 세션을 시작할 수 없다 — 이 판단은 서비스 계층에서 한다.
 */
@Entity
@Table(name = "child_consents")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChildConsent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "child_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Child child;

    @Column(name = "consent_version", nullable = false)
    private String consentVersion;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_method", nullable = false)
    private VerificationMethod verificationMethod;

    @Column(name = "consented_at", nullable = false)
    private Instant consentedAt;

    @Column(name = "withdrawn_at")
    private Instant withdrawnAt;

    @PrePersist
    protected void onPersist() {
        this.consentedAt = Instant.now();
    }

    public static ChildConsent create(Child child, String consentVersion, VerificationMethod verificationMethod) {
        ChildConsent consent = new ChildConsent();
        consent.child = child;
        consent.consentVersion = consentVersion;
        consent.verificationMethod = verificationMethod;
        return consent;
    }

    public void withdraw() {
        this.withdrawnAt = Instant.now();
    }

    public boolean isActive() {
        return this.withdrawnAt == null;
    }
}
