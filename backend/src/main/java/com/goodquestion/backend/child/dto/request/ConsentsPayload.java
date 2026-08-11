package com.goodquestion.backend.child.dto.request;

import jakarta.validation.constraints.NotNull;

/**
 * termsOfService·privacyPolicy·childDataProcessing 중 하나라도 true가 아니면
 * 서비스 계층에서 403 CONSENT_REQUIRED로 거절한다 (api.md 3.2). marketing은 선택이다.
 */
public record ConsentsPayload(
        @NotNull Boolean termsOfService,
        @NotNull Boolean privacyPolicy,
        @NotNull Boolean childDataProcessing,
        Boolean marketing
) {
}
