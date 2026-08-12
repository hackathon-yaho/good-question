package com.goodquestion.backend.voice.dto.response;

public record SttResponse(String text) {

    public static SttResponse of(String text) {
        return new SttResponse(text);
    }
}
