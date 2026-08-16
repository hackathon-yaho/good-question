package com.goodquestion.backend.shop.entity;

import com.goodquestion.backend.child.entity.Child;
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
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;
import java.util.UUID;

/**
 * avatar-shop-purchase.md (D-59). 구매 이력을 남기는 별도 테이블 — {@code ownedAvatarIds}는
 * 이 테이블에서 아이별로 조회해 만든다. {@code price}는 요청 값을 그대로 신뢰해 저장한다
 * (avatarId를 검증하지 않는 기존 정책 D-08과 같은 이유, D-59).
 */
@Entity
@Table(name = "avatar_purchases", uniqueConstraints = @UniqueConstraint(columnNames = {"child_id", "avatar_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AvatarPurchase {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "child_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Child child;

    @Column(name = "avatar_id", nullable = false)
    private String avatarId;

    @Column(name = "price", nullable = false)
    private Integer price;

    @Column(name = "purchased_at", nullable = false)
    private Instant purchasedAt;

    @PrePersist
    protected void onPersist() {
        this.purchasedAt = Instant.now();
    }

    public static AvatarPurchase create(Child child, String avatarId, int price) {
        AvatarPurchase purchase = new AvatarPurchase();
        purchase.child = child;
        purchase.avatarId = avatarId;
        purchase.price = price;
        return purchase;
    }
}
