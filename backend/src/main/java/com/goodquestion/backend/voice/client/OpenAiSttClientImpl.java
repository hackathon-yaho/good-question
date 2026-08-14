package com.goodquestion.backend.voice.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.Duration;

/**
 * B-14. 음성 인식 호출. 타임아웃 8초·재시도 0회 (D-03). 실패하면 예외를 그대로 던진다 —
 * `/analyze`·`/respond`와 달리 STT/TTS는 별도 폴백이 정의돼 있지 않고, api.md 2.3의
 * 일반 5xx 처리로 충분하다.
 *
 * 오디오는 바이트 배열로 메모리에만 올려 전달한다 — 디스크에 별도로 쓰지 않는다(B-15).
 * {@code MultipartBodyBuilder}는 이 프로젝트에 없는 reactive-streams를 요구해
 * {@code NoClassDefFoundError}가 나므로 쓰지 않는다 — 서블릿(비-WebFlux) 프로젝트라 겪은 문제다.
 *
 * 모델은 `whisper-1`이 아니라 `gpt-4o-transcribe`다(D-46, 이전 D-43은 `gpt-4o-mini-transcribe`) —
 * `whisper-1`은 무음·저품질 구간에서 유튜브 자막체 상투구를 지어내는 환각이 있었다(D-42).
 * `language=ko`는 짧고 모호한 오디오에서 언어 자체를 잘못 추측하는 문제(예: 중국어·일본어
 * 오인식) 방지용으로 보내는데, OpenAI 문서상 `language`/`prompt`가 공식 지원되는 모델은
 * `gpt-4o-transcribe`뿐이라(mini는 비공식) D-46에서 이 모델로 올렸다. `prompt`(LANGUAGE_HINT_PROMPT)로
 * 한국어 아동 발화라는 문맥도 같이 보내 언어 추정을 추가로 편향시킨다 — 다만 이 두
 * 파라미터도 100% 강제는 아니라서 여전히 다른 언어가 나올 수 있다(완전 차단은 별도 필터가 필요).
 *
 * 이 모델은 `response_format=verbose_json`을 지원하지 않는다(400) — `whisper-1` 시절
 * 썼던 구간별 신뢰도 필터링은 더 필요 없어져 제거했다.
 */
@Component
public class OpenAiSttClientImpl implements OpenAiSttClient {

    /** D-46. language만으로 뚫린 사례(다른 언어 오인식)가 있어 문맥을 추가로 보낸다. */
    private static final String LANGUAGE_HINT_PROMPT = "이것은 한국어를 사용하는 7~9세 아동의 발화입니다.";

    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    public OpenAiSttClientImpl(@Value("${openai.api-key}") String apiKey,
                                @Value("${openai.stt.model}") String model,
                                @Value("${openai.stt.timeout-seconds}") long timeoutSeconds) {
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
    public String transcribe(MultipartFile audio) {
        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        form.add("model", model);
        form.add("language", "ko");
        form.add("prompt", LANGUAGE_HINT_PROMPT);
        form.add("file", new ByteArrayResource(readBytes(audio)) {
            @Override
            public String getFilename() {
                return audio.getOriginalFilename();
            }
        });

        TranscriptionResponseBody body = restClient.post()
                .uri("/audio/transcriptions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(form)
                .retrieve()
                .body(TranscriptionResponseBody.class);

        return body == null || body.text() == null ? "" : body.text();
    }

    private byte[] readBytes(MultipartFile audio) {
        try {
            return audio.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private record TranscriptionResponseBody(String text) {
    }
}
