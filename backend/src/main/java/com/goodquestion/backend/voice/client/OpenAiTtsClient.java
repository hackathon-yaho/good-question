package com.goodquestion.backend.voice.client;

public interface OpenAiTtsClient {

    byte[] synthesize(String text);
}
