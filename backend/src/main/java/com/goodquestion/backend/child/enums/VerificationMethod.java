package com.goodquestion.backend.child.enums;

/**
 * PRD 8.5. child_consents.verification_method 허용 값.
 * PRD 원문 표기는 소문자(authenticated_parent 등)이나 Java enum 관례상 대문자로 둔다.
 * 프론트/외부에 노출하는 값이 아니므로 DTO 변환이 필요 없다.
 */
public enum VerificationMethod {
    AUTHENTICATED_PARENT,
    INSTITUTION_PAPER,
    MOBILE_VERIFICATION
}
