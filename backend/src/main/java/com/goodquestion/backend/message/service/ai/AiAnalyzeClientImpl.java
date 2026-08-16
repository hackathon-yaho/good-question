package com.goodquestion.backend.message.service.ai;

import com.goodquestion.backend.message.entity.DetectedElement;
import com.goodquestion.backend.message.enums.ChildIntent;
import com.goodquestion.backend.message.enums.UtteranceValidity;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.util.List;

/**
 * B-09. 타임아웃 5초·재시도 0회(D-03). 실패하면 B-12 폴백(빈 분석)을 돌려주고
 * 예외를 던지지 않는다 — 호출 측(MessageService)이 매번 try/catch를 반복하지 않게 하기 위함이다.
 */
@Slf4j
@Component
public class AiAnalyzeClientImpl implements AiAnalyzeClient {

    private final RestClient restClient;

    public AiAnalyzeClientImpl(@Value("${ai.server.base-url}") String baseUrl,
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
    public AnalyzeAiResult analyze(AnalyzeAiRequest request) {
        try {
            AnalyzeAiResponseBody body = restClient.post()
                    .uri("/analyze")
                    .body(request)
                    .retrieve()
                    .body(AnalyzeAiResponseBody.class);

            if (body == null) return AnalyzeAiResult.failure();

            return new AnalyzeAiResult(
                    true,
                    parseChildIntent(body.childIntent()),
                    body.mainPoint(),
                    body.detectedElements() == null ? List.of() : body.detectedElements(),
                    parseValidity(body.utteranceValidity())
            );
        } catch (RestClientResponseException e) {
            log.warn("[AiAnalyzeClient] /analyze 호출 실패(status={}), 빈 분석으로 폴백합니다. body={}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            return AnalyzeAiResult.failure();
        } catch (Exception e) {
            log.warn("[AiAnalyzeClient] /analyze 호출 실패({}), 빈 분석으로 폴백합니다: {}",
                    e.getClass().getSimpleName(), e.getMessage());
            return AnalyzeAiResult.failure();
        }
    }

    private ChildIntent parseChildIntent(String raw) {
        try {
            return ChildIntent.valueOf(raw);
        } catch (Exception e) {
            return ChildIntent.UNCLEAR;
        }
    }

    private UtteranceValidity parseValidity(String raw) {
        try {
            return UtteranceValidity.valueOf(raw);
        } catch (Exception e) {
            return UtteranceValidity.UNCLEAR;
        }
    }

    private record AnalyzeAiResponseBody(
            String childIntent,
            String mainPoint,
            List<DetectedElement> detectedElements,
            String utteranceValidity
    ) {
    }
}
