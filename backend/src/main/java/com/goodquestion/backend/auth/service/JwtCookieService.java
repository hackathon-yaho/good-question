package com.goodquestion.backend.auth.service;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

/**
 * JWT를 HttpOnly 쿠키로 주고받는다. 값 자체를 별도로 암호화하지 않는다 — JWT가 이미
 * 서명되어 있어 변조 여부는 검증되고, 내용에는 parentId(UUID)만 담겨 민감정보가 없다.
 *
 * cookie-secure=false(로컬)면 SameSite=Lax, true(배포, HTTPS)면 SameSite=None.
 * Vercel↔Render처럼 서로 다른 도메인 간 쿠키 전송에는 SameSite=None; Secure가 필요하다.
 */
@Service
public class JwtCookieService {

    private static final String COOKIE_NAME = "accessToken";

    private final JwtTokenProvider jwtTokenProvider;
    private final boolean cookieSecure;

    public JwtCookieService(JwtTokenProvider jwtTokenProvider,
                             @Value("${app.cookie-secure}") boolean cookieSecure) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.cookieSecure = cookieSecure;
    }

    public void setAccessTokenCookie(HttpServletResponse response, String accessToken) {
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, accessToken)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(sameSite())
                .path("/")
                .maxAge(jwtTokenProvider.getAccessTokenValidityMillis() / 1000)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    public void deleteAccessTokenCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(COOKIE_NAME, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(sameSite())
                .path("/")
                .maxAge(0)
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    public String extractAccessToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie cookie : cookies) {
            if (COOKIE_NAME.equals(cookie.getName())) return cookie.getValue();
        }
        return null;
    }

    private String sameSite() {
        return cookieSecure ? "None" : "Lax";
    }
}
