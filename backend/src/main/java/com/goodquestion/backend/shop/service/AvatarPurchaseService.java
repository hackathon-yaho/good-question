package com.goodquestion.backend.shop.service;

import com.goodquestion.backend.shop.dto.request.AvatarPurchaseRequest;
import com.goodquestion.backend.shop.dto.response.AvatarPurchaseResponse;

import java.util.UUID;

public interface AvatarPurchaseService {

    AvatarPurchaseResponse purchase(UUID parentId, UUID childId, AvatarPurchaseRequest request);
}
