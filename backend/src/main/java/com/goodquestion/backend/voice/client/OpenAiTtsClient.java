package com.goodquestion.backend.voice.client;

public interface OpenAiTtsClient {

    /** instructions는 gpt-4o-mini-tts 전용 연기 지시(D-35) — voice만으로는 캐릭터성이 약해서 함께 보낸다. */
    byte[] synthesize(String text, String voice, String instructions);
}
