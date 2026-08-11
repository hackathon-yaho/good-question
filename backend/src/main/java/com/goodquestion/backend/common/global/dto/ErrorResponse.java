package com.goodquestion.backend.common.global.dto;

import com.goodquestion.backend.common.global.ErrorCode;
import lombok.Builder;
import lombok.Getter;

/**
 * docs/spec/api.md 2.3 의 실패 응답 형태.
 * 성공 응답은 래퍼 없이 데이터를 그대로 반환하므로 이 클래스는 실패 시에만 쓰인다.
 */
@Getter
@Builder
public class ErrorResponse {

    private final String code;
    private final String message;

    public static ErrorResponse of(ErrorCode errorCode) {
        return ErrorResponse.builder()
                .code(errorCode.getCode())
                .message(errorCode.getMessage())
                .build();
    }

    public static ErrorResponse of(ErrorCode errorCode, String detail) {
        return ErrorResponse.builder()
                .code(errorCode.getCode())
                .message(errorCode.getMessage() + " | " + detail)
                .build();
    }
}
