package com.goodquestion.backend.shop.controller;

import com.goodquestion.backend.shop.dto.request.AvatarPurchaseRequest;
import com.goodquestion.backend.shop.dto.response.AvatarPurchaseResponse;
import com.goodquestion.backend.shop.service.AvatarPurchaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/children/{childId}/avatar-purchases")
@RequiredArgsConstructor
public class AvatarPurchaseController {

    private final AvatarPurchaseService avatarPurchaseService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AvatarPurchaseResponse purchase(@AuthenticationPrincipal UUID parentId,
                                            @PathVariable UUID childId,
                                            @Valid @RequestBody AvatarPurchaseRequest request) {
        return avatarPurchaseService.purchase(parentId, childId, request);
    }
}
