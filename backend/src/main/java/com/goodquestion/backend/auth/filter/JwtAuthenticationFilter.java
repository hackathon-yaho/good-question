package com.goodquestion.backend.auth.filter;

import com.goodquestion.backend.auth.service.JwtCookieService;
import com.goodquestion.backend.auth.service.JwtTokenProvider;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * accessToken을 쿠키 또는 Authorization 헤더에서 읽어 인증 컨텍스트를 채운다.
 * 브라우저(프론트)는 쿠키를, Postman/curl로 테스트하는 다른 파트는 Bearer 헤더를 쓰면 된다.
 * principal은 parentId(UUID) 하나뿐이다 — role·status 기반 접근 제어가 없어
 * 참고 프로젝트들처럼 DB를 매 요청 조회하지 않는다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final JwtCookieService jwtCookieService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        String token = resolveToken(request);

        if (StringUtils.hasText(token) && jwtTokenProvider.isValid(token)) {
            UUID parentId = jwtTokenProvider.getParentId(token);
            var auth = new UsernamePasswordAuthenticationToken(
                    parentId, null, List.of(new SimpleGrantedAuthority("ROLE_PARENT")));
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        filterChain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String cookieToken = jwtCookieService.extractAccessToken(request);
        if (StringUtils.hasText(cookieToken)) return cookieToken;

        String header = request.getHeader("Authorization");
        if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
