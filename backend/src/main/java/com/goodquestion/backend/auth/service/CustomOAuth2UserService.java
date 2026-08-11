package com.goodquestion.backend.auth.service;

import com.goodquestion.backend.auth.oauth.KakaoOAuth2UserInfo;
import com.goodquestion.backend.auth.oauth.OAuth2UserInfo;
import com.goodquestion.backend.parent.entity.Parent;
import com.goodquestion.backend.parent.enums.Provider;
import com.goodquestion.backend.parent.repository.ParentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * 카카오 사용자 정보를 받아 parents 레코드를 조회하거나 생성한다.
 * 카카오 단독이라 provider 분기가 없다 — 다른 제공자가 추가되면 그때 나눈다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final ParentRepository parentRepository;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest request) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = new DefaultOAuth2UserService().loadUser(request);
        OAuth2UserInfo userInfo = new KakaoOAuth2UserInfo(oauth2User.getAttributes());

        if (userInfo.getId() == null) {
            throw new OAuth2AuthenticationException("카카오 사용자 식별값을 확인할 수 없습니다.");
        }

        Parent parent = parentRepository.findByProviderAndProviderId(Provider.KAKAO, userInfo.getId())
                .map(existing -> {
                    existing.updateLoginInfo(userInfo.getName(), userInfo.getEmail());
                    return existing;
                })
                .orElseGet(() -> parentRepository.save(
                        Parent.create(userInfo.getName(), Provider.KAKAO, userInfo.getId(), userInfo.getEmail())
                ));

        log.info("[Kakao] 로그인 처리 완료 parentId={}", parent.getId());

        Map<String, Object> attributes = new HashMap<>(oauth2User.getAttributes());
        attributes.put("parentId", parent.getId());

        return new DefaultOAuth2User(Set.of(new SimpleGrantedAuthority("ROLE_PARENT")), attributes, "id");
    }
}
