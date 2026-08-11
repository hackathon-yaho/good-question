package com.goodquestion.backend.common.global.exception;

import com.goodquestion.backend.common.global.ErrorCode;
import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public BusinessException(ErrorCode errorCode, String detail) {
        super(errorCode.getMessage() + " | " + detail);
        this.errorCode = errorCode;
    }
}
