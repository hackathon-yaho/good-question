package com.goodquestion.backend.shop.service;

import com.goodquestion.backend.child.entity.Child;
import com.goodquestion.backend.child.repository.ChildRepository;
import com.goodquestion.backend.common.global.ErrorCode;
import com.goodquestion.backend.common.global.exception.BusinessException;
import com.goodquestion.backend.shop.dto.request.AvatarPurchaseRequest;
import com.goodquestion.backend.shop.dto.response.AvatarPurchaseResponse;
import com.goodquestion.backend.shop.entity.AvatarPurchase;
import com.goodquestion.backend.shop.repository.AvatarPurchaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.UUID;

/**
 * avatar-shop-purchase.md (D-59). 구매만 한다 — 장착(현재 아바타 변경)은 기존
 * {@code PATCH /children/{childId}}가 그대로 맡는다.
 */
@Service
@RequiredArgsConstructor
public class AvatarPurchaseServiceImpl implements AvatarPurchaseService {

    /** 등록 시 기본으로 주어지는 무료 6종 — 상점에서 다시 구매할 수 없다 (D-59). */
    private static final Set<String> FREE_AVATAR_IDS =
            Set.of("color1", "color2", "color3", "color4", "color5", "color6");

    private final ChildRepository childRepository;
    private final AvatarPurchaseRepository avatarPurchaseRepository;

    @Override
    @Transactional
    public AvatarPurchaseResponse purchase(UUID parentId, UUID childId, AvatarPurchaseRequest request) {
        Child child = getOwnedChild(parentId, childId);
        String avatarId = request.avatarId();

        if (FREE_AVATAR_IDS.contains(avatarId)
                || avatarPurchaseRepository.existsByChildAndAvatarId(child, avatarId)) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "이미 보유했거나 무료로 제공되는 아바타입니다.");
        }
        if (child.getStarDust() < request.price()) {
            throw new BusinessException(ErrorCode.INSUFFICIENT_STAR_DUST);
        }

        child.deductStarDust(request.price());
        try {
            avatarPurchaseRepository.save(AvatarPurchase.create(child, avatarId, request.price()));
        } catch (DataIntegrityViolationException e) {
            // 동시 요청으로 유니크 제약(child_id, avatar_id)에 걸린 경우 — 이미 위에서 놓친 중복 구매다.
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "이미 보유했거나 무료로 제공되는 아바타입니다.");
        }

        var ownedAvatarIds = avatarPurchaseRepository.findAllByChild(child).stream()
                .map(AvatarPurchase::getAvatarId)
                .toList();
        return new AvatarPurchaseResponse(child.getStarDust(), ownedAvatarIds);
    }

    private Child getOwnedChild(UUID parentId, UUID childId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!child.getParent().getId().equals(parentId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return child;
    }
}
