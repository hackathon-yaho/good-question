package com.goodquestion.backend.message.service.ai;

import com.goodquestion.backend.message.enums.CharacterState;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

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
                                @Value("${ai.server.timeout-seconds}") long timeoutSeconds,
                                @Value("${ai.server.internal-token}") String internalToken) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(timeoutSeconds));
        requestFactory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));

        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .defaultHeader("X-Internal-Token", internalToken)
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
                log.warn("[AiRespondClient] /respond 응답이 비어 있어 실패로 처리합니다: {}", body);
                return RespondAiResult.failure();
            }
            return new RespondAiResult(true, body.text(), parseCharacterState(body.characterState()));
        } catch (RestClientResponseException e) {
            log.warn("[AiRespondClient] /respond 호출 실패(status={}): {}", e.getStatusCode(), e.getResponseBodyAsString());
            return RespondAiResult.failure();
        } catch (Exception e) {
            log.warn("[AiRespondClient] /respond 호출 실패({}): {}", e.getClass().getSimpleName(), e.getMessage());
            return RespondAiResult.failure();
        }
    }

    /** O-12. AI가 값을 안 주거나 5종 밖의 값을 주면 null로 폴백한다 — 프론트가 이전 상태를 유지한다. */
    private CharacterState parseCharacterState(String raw) {
        if (raw == null) return null;
        try {
            return CharacterState.valueOf(raw);
        } catch (IllegalArgumentException e) {
            log.warn("[AiRespondClient] 알 수 없는 characterState: {}", raw);
            return null;
        }
    }

    private record RespondAiResponseBody(String text, String characterState) {
    }
}
