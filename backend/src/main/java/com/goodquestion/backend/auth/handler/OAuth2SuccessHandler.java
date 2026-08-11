package com.goodquestion.backend.auth.handler;

import com.goodquestion.backend.auth.service.JwtCookieService;
import com.goodquestion.backend.auth.service.JwtTokenProvider;
import com.goodquestion.backend.child.repository.ChildRepository;
import com.goodquestion.backend.parent.entity.Parent;
import com.goodquestion.backend.parent.repository.ParentRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.UUID;

/**
 * 로그인 성공 시 JWT를 쿠키로 심고 프론트로 리다이렉트한다.
 * hasCompletedOnboarding(아이 등록 여부)을 쿼리로 실어 보내 프론트가 별도 API 호출 없이
 * 바로 분기(/onboarding/consent vs /profiles)할 수 있게 한다 — 화면 명세 A-2 요구사항.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final ParentRepository parentRepository;
    private final ChildRepository childRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtCookieService jwtCookieService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                         Authentication authentication) throws IOException {
        OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
        UUID parentId = (UUID) oauth2User.getAttributes().get("parentId");

        Parent parent = parentRepository.findById(parentId)
                .orElseThrow(() -> new IllegalStateException("로그인 처리된 parentId를 찾을 수 없습니다: " + parentId));

        String accessToken = jwtTokenProvider.generateAccessToken(parent.getId());
        jwtCookieService.setAccessTokenCookie(response, accessToken);

        boolean hasCompletedOnboarding = childRepository.countByParent(parent) > 0;

        String redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/auth/callback")
                .queryParam("hasCompletedOnboarding", hasCompletedOnboarding)
                .build().toUriString();

        log.info("[OAuth2] 로그인 성공 parentId={} hasCompletedOnboarding={}", parent.getId(), hasCompletedOnboarding);
        response.sendRedirect(redirectUrl);
    }
}
