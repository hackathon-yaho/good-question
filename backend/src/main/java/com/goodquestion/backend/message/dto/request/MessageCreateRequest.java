package com.goodquestion.backend.message.dto.request;

/** text가 빈 문자열/공백이면 서비스 계층에서 422 STT_EMPTY로 거절한다 (api.md 3.5) — @NotBlank를 쓰지 않는다. */
public record MessageCreateRequest(String text, String sttRawText) {
}
