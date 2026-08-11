package com.goodquestion.backend.home.controller;

import com.goodquestion.backend.home.dto.response.HomeResponse;
import com.goodquestion.backend.home.service.HomeService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class HomeController {

    private final HomeService homeService;

    @GetMapping("/home")
    public HomeResponse getHome(@AuthenticationPrincipal UUID parentId, @RequestParam UUID childId) {
        return homeService.getHome(parentId, childId);
    }
}
