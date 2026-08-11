package com.goodquestion.backend.common.global;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/**
 * docs/spec/api.md 2.3 에 정의된 에러 코드 목록.
 * code 문자열은 계약이므로 임의로 바꾸지 않는다.
 */
@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "필수 파라미터가 없거나 형식이 올바르지 않습니다."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "토큰이 없거나 만료되었습니다."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "FORBIDDEN", "접근 권한이 없습니다."),
    CONSENT_REQUIRED(HttpStatus.FORBIDDEN, "CONSENT_REQUIRED", "아동 개인정보 처리 동의가 필요합니다."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "NOT_FOUND", "대상을 찾을 수 없습니다."),
    CHILD_LIMIT_EXCEEDED(HttpStatus.CONFLICT, "CHILD_LIMIT_EXCEEDED", "계정당 등록 가능한 아이는 최대 3명입니다."),
    SCENE_ALREADY_CLOSED(HttpStatus.CONFLICT, "SCENE_ALREADY_CLOSED", "이미 종료된 장면입니다."),
    STT_EMPTY(HttpStatus.UNPROCESSABLE_ENTITY, "STT_EMPTY", "변환된 텍스트가 없습니다."),

    // api.md 2.3에 명시된 5xx는 상태 코드만 정의되어 있고 code 값은 없다.
    // 팀 추가: GlobalExceptionHandler의 예외되지 않은 오류를 위한 fallback.
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "서버 내부 오류가 발생했습니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;
}
