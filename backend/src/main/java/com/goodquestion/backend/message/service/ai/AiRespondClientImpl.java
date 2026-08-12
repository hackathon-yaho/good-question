package com.goodquestion.backend.message.service.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * B-10. 타임아웃 5초·재시도 0회(D-03). 실패 시 폴백은 호출 측(MessageService)이 처리한다 —
 * "character_closing 조회 후 장면 종료"는 이 클라이언트가 아니라 대화 흐름 전체를 아는 쪽의 책임이다.
 */
@Slf4j
@Component
public class AiRespondClientImpl implements AiRespondClient {

    private final RestClient restClient;

    public AiRespondClientImpl(@Value("${ai.server.base-url}") String baseUrl,
                                @Value("${ai.server.timeout-seconds}") long timeoutSeconds) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(timeoutSeconds));
        requestFactory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .build();
    }

    @Override
    public RespondAiResult respond(RespondAiRequest request) {
        try {
            RespondAiResponseBody body = restClient.post()
                    .uri("/respond")
                    .body(request)
                    .retrieve()
                    .body(RespondAiResponseBody.class);

            if (body == null || body.text() == null || body.text().isBlank()) {
                return RespondAiResult.failure();
            }
            return new RespondAiResult(true, body.text());
        } catch (Exception e) {
            log.warn("[AiRespondClient] /respond 호출 실패: {}", e.getMessage());
            return RespondAiResult.failure();
        }
    }

    private record RespondAiResponseBody(String text) {
    }
}
