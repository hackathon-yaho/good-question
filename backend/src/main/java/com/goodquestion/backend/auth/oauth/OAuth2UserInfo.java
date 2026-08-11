package com.goodquestion.backend.auth.oauth;

import java.util.Map;

/** 소셜 제공자별 사용자 정보 응답 파싱. 카카오 단독이라 지금은 구현체가 하나뿐이다. */
public interface OAuth2UserInfo {

    String getId();

    String getEmail();

    String getName();

    Map<String, Object> getAttributes();
}
