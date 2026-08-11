package com.goodquestion.backend.auth.oauth;

import java.util.Map;

/**
 * 카카오 `GET /v2/user/me` 응답 형태.
 * https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api#req-user-info
 */
public class KakaoOAuth2UserInfo implements OAuth2UserInfo {

    private final Map<String, Object> attributes;

    public KakaoOAuth2UserInfo(Map<String, Object> attributes) {
        this.attributes = attributes;
    }

    @Override
    public String getId() {
        Object id = attributes.get("id");
        return id != null ? String.valueOf(id) : null;
    }

    @SuppressWarnings("unchecked")
    @Override
    public String getEmail() {
        Map<String, Object> account = (Map<String, Object>) attributes.get("kakao_account");
        return account != null ? (String) account.get("email") : null;
    }

    @SuppressWarnings("unchecked")
    @Override
    public String getName() {
        Map<String, Object> properties = (Map<String, Object>) attributes.get("properties");
        return properties != null ? (String) properties.get("nickname") : null;
    }

    @Override
    public Map<String, Object> getAttributes() {
        return attributes;
    }
}
