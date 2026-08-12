package com.goodquestion.backend.wordbook.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

/** contextSentence는 api.md 3.7 원안에 없다 — 저장 시점 화면 대사 원문을 서버가 역산할 방법이 없어 프론트가 함께 보낸다 (D-22). */
public record WordbookCreateRequest(
        @NotNull UUID childId,
        @NotBlank String word,
        @NotBlank String meaning,
        @NotNull UUID sourceSceneId,
        String contextSentence
) {
}
