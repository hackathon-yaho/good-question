package com.goodquestion.backend.session.dto.request;

import jakarta.validation.constraints.NotBlank;

/** C-13 "이야기 나가기" (api.md 3.4). 지금은 "stopped" 하나만 허용한다. */
public record SessionStopRequest(@NotBlank String status) {
}
