package com.goodquestion.backend.voice.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Map;

/** D-05. OpenAI TTS 호출. 모델·목소리 선택 근거는 decisions.md D-21·D-35. */
@Component
public class OpenAiTtsClientImpl implements OpenAiTtsClient {

    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    public OpenAiTtsClientImpl(@Value("${openai.api-key}") String apiKey,
                                @Value("${openai.tts.model}") String model,
                                @Value("${openai.tts.timeout-seconds}") long timeoutSeconds) {
        this.apiKey = apiKey;
        this.model = model;

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(timeoutSeconds));
        requestFactory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));

        this.restClient = RestClient.builder()
                .baseUrl("https://api.openai.com/v1")
                .requestFactory(requestFactory)
                .build();
    }

    @Override
    public byte[] synthesize(String text, String voice, String instructions) {
        return restClient.post()
                .uri("/audio/speech")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("model", model, "voice", voice, "input", text, "instructions", instructions))
                .retrieve()
                .body(byte[].class);
    }
}
