package com.goodquestion.backend.mypage.controller;

import com.goodquestion.backend.mypage.dto.response.MypageResponse;
import com.goodquestion.backend.mypage.service.MypageService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class MypageController {

    private final MypageService mypageService;

    @GetMapping("/mypage")
    public MypageResponse getMypage(@AuthenticationPrincipal UUID parentId, @RequestParam UUID childId) {
        return mypageService.getMypage(parentId, childId);
    }
}
