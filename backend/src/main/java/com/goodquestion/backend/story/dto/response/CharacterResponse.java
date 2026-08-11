package com.goodquestion.backend.story.dto.response;

/** imageUrl은 캐릭터별 이미지 컬럼이 아직 없어 항상 null이다 (에셋 미수령). */
public record CharacterResponse(String name, String displayName, String imageUrl) {
}
