package com.goodquestion.backend.shop.repository;

import com.goodquestion.backend.child.entity.Child;
import com.goodquestion.backend.shop.entity.AvatarPurchase;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AvatarPurchaseRepository extends JpaRepository<AvatarPurchase, UUID> {

    List<AvatarPurchase> findAllByChild(Child child);

    boolean existsByChildAndAvatarId(Child child, String avatarId);
}
