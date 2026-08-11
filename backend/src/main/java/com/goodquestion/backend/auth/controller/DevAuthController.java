package com.goodquestion.backend.auth.controller;

import com.goodquestion.backend.auth.service.JwtCookieService;
import com.goodquestion.backend.auth.service.JwtTokenProvider;
import com.goodquestion.backend.parent.entity.Parent;
import com.goodquestion.backend.parent.enums.Provider;
import com.goodquestion.backend.parent.repository.ParentRepository;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * 개발용 — 카카오 없이 JWT 쿠키를 즉시 발급한다. 없으면 dev provider_id로 parent를
 * 만들어서라도 발급한다. 카카오 앱 등록 전에 다른 파트가 인증 때문에 막히지 않게 하기 위함이다.
 *
 * 시연 배포에서는 반드시 제거하거나 비활성화한다.
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class DevAuthController {

    private static final String DEV_PROVIDER_ID = "dev-user";

    private final ParentRepository parentRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final JwtCookieService jwtCookieService;

    @PostMapping("/dev-login")
    public DevLoginResponse devLogin(@RequestParam(defaultValue = "개발용 보호자") String name,
                                      HttpServletResponse response) {
        Parent parent = parentRepository.findByProviderAndProviderId(Provider.KAKAO, DEV_PROVIDER_ID)
                .orElseGet(() -> parentRepository.save(
                        Parent.create(name, Provider.KAKAO, DEV_PROVIDER_ID, null)
                ));

        String accessToken = jwtTokenProvider.generateAccessToken(parent.getId());
        jwtCookieService.setAccessTokenCookie(response, accessToken);

        return new DevLoginResponse(parent.getId(), accessToken);
    }

    record DevLoginResponse(UUID parentId, String accessToken) {
    }
}
