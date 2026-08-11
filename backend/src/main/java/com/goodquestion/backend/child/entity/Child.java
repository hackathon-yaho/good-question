package com.goodquestion.backend.child.entity;

import com.goodquestion.backend.parent.entity.Parent;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

import java.time.Instant;
import java.util.UUID;

/**
 * PRD 8.4. avatar_id · star_dust는 팀 추가 컬럼이다 (decisions.md D-08 · D-09).
 * 나이는 저장하지 않고 birth_year로만 저장한다 — 연도 기준 연령 계산은 조회 시점(DTO)에서 한다.
 */
@Entity
@Table(name = "children")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Child {

    private static final int DEFAULT_STAR_DUST = 0;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id", nullable = false)
    private Parent parent;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "birth_year", nullable = false)
    private Integer birthYear;

    /** 값 검증은 하지 않는다 — 아바타 6종 목록이 문서에 없다 (decisions.md D-08). */
    @Column(name = "avatar_id")
    private String avatarId;

    /** 이야기 완료 시 +100. 차감·사용처 없음 (decisions.md D-09). */
    @Column(name = "star_dust", nullable = false)
    private Integer starDust;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    protected void onPersist() {
        this.createdAt = Instant.now();
        if (this.starDust == null) this.starDust = DEFAULT_STAR_DUST;
    }

    public static Child create(Parent parent, String name, Integer birthYear, String avatarId) {
        Child child = new Child();
        child.parent = parent;
        child.name = name;
        child.birthYear = birthYear;
        child.avatarId = avatarId;
        child.starDust = DEFAULT_STAR_DUST;
        return child;
    }

    public void addStarDust(int amount) {
        this.starDust += amount;
    }
}
