package com.goodquestion.backend.auth.controller;

import com.goodquestion.backend.auth.service.JwtCookieService;
import com.goodquestion.backend.child.repository.ChildRepository;
import com.goodquestion.backend.common.global.ErrorCode;
import com.goodquestion.backend.common.global.exception.BusinessException;
import com.goodquestion.backend.parent.entity.Parent;
import com.goodquestion.backend.parent.repository.ParentRepository;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * 로그인 자체(카카오 리다이렉트)는 SecurityConfig의 oauth2Login이 처리하므로 여기 엔드포인트가 없다.
 * 여기서는 "로그인이 됐는지 확인"과 "로그아웃"만 다룬다.
 *
 * 아이 목록·프로필 등 parents 도메인의 나머지 조회 API(GET /api/parents/me 등, api.md 3.1)는
 * Phase 3에서 별도 컨트롤러로 만든다. 이 엔드포인트는 그것과 합쳐질 수 있다.
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final ParentRepository parentRepository;
    private final ChildRepository childRepository;
    private final JwtCookieService jwtCookieService;

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal UUID parentId) {
        Parent parent = parentRepository.findById(parentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        boolean hasCompletedOnboarding = childRepository.countByParent(parent) > 0;
        return new MeResponse(parent.getId(), parent.getName(), parent.getEmail(), hasCompletedOnboarding);
    }

    @PostMapping("/logout")
    public void logout(HttpServletResponse response) {
        jwtCookieService.deleteAccessTokenCookie(response);
    }

    record MeResponse(UUID id, String name, String email, boolean hasCompletedOnboarding) {
    }
}
