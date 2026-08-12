package com.goodquestion.backend.activity.controller;

import com.goodquestion.backend.activity.dto.request.RetellingRequest;
import com.goodquestion.backend.activity.dto.request.SubmitOrderRequest;
import com.goodquestion.backend.activity.dto.response.ActivityCardsResponse;
import com.goodquestion.backend.activity.dto.response.RetellingResponse;
import com.goodquestion.backend.activity.dto.response.SubmitOrderResponse;
import com.goodquestion.backend.activity.service.ActivityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/sessions/{sessionId}/activity")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;

    @GetMapping
    public ActivityCardsResponse getCards(@AuthenticationPrincipal UUID parentId, @PathVariable UUID sessionId) {
        return activityService.getCards(parentId, sessionId);
    }

    @PostMapping("/order")
    public SubmitOrderResponse submitOrder(@AuthenticationPrincipal UUID parentId, @PathVariable UUID sessionId,
                                            @Valid @RequestBody SubmitOrderRequest request) {
        return activityService.submitOrder(parentId, sessionId, request);
    }

    @PostMapping("/retelling")
    public RetellingResponse submitRetelling(@AuthenticationPrincipal UUID parentId, @PathVariable UUID sessionId,
                                              @Valid @RequestBody RetellingRequest request) {
        return activityService.submitRetelling(parentId, sessionId, request);
    }
}
