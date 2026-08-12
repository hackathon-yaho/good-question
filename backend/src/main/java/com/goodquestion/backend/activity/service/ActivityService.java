package com.goodquestion.backend.activity.service;

import com.goodquestion.backend.activity.dto.request.RetellingRequest;
import com.goodquestion.backend.activity.dto.request.SubmitOrderRequest;
import com.goodquestion.backend.activity.dto.response.ActivityCardsResponse;
import com.goodquestion.backend.activity.dto.response.RetellingResponse;
import com.goodquestion.backend.activity.dto.response.SubmitOrderResponse;

import java.util.UUID;

public interface ActivityService {

    ActivityCardsResponse getCards(UUID parentId, UUID sessionId);

    SubmitOrderResponse submitOrder(UUID parentId, UUID sessionId, SubmitOrderRequest request);

    RetellingResponse submitRetelling(UUID parentId, UUID sessionId, RetellingRequest request);
}
