package com.goodquestion.backend.message.service.ai;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

/** U-01 해소 — 실 AI 서버가 요구하는 X-Internal-Token 헤더가 /respond 요청에 실려 나가는지 확인한다. */
class AiRespondClientImplTest {

    private HttpServer server;
    private final AtomicReference<String> receivedToken = new AtomicReference<>();

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/respond", exchange -> {
            receivedToken.set(exchange.getRequestHeaders().getFirst("X-Internal-Token"));
            byte[] body = "{\"text\":\"안녕\"}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    @Test
    void respond_호출시_X_Internal_Token_헤더를_담아_보낸다() {
        String baseUrl = "http://localhost:" + server.getAddress().getPort();
        AiRespondClientImpl client = new AiRespondClientImpl(baseUrl, 5, "secret-token");

        client.respond(new RespondAiRequest("며느리", "조심스러운 말투", "장면 맥락", "직전 대사", "아이 발화",
                new RespondAnalysisPayload("OPINION", null), "NORMAL", "directResponse", null, null));

        assertThat(receivedToken.get()).isEqualTo("secret-token");
    }

    /** ai-retry-deadline-v2.md 완료조건 — 502(MODEL_UPSTREAM_ERROR)도 실패로 처리되는지 확인. */
    @Test
    void respond_호출시_502를_받으면_실패를_반환한다() throws IOException {
        assertFailureOnStatus(502);
    }

    /** ai-retry-deadline-v2.md 완료조건 — 504(MODEL_TIMEOUT)도 502와 동일하게 실패로 처리되는지 확인.
     * AiRespondClientImpl은 상태 코드로 분기하지 않고 모든 예외를 failure()로 묶어, 이 경로가
     * MessageServiceImpl의 B-12 안전 폴백(character_closing)으로 그대로 이어진다. */
    @Test
    void respond_호출시_504를_받으면_실패를_반환한다() throws IOException {
        assertFailureOnStatus(504);
    }

    private void assertFailureOnStatus(int status) throws IOException {
        HttpServer errorServer = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        errorServer.createContext("/respond", exchange -> {
            byte[] body = "{}".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(status, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        errorServer.start();
        try {
            String baseUrl = "http://localhost:" + errorServer.getAddress().getPort();
            AiRespondClientImpl client = new AiRespondClientImpl(baseUrl, 5, "secret-token");

            RespondAiResult result = client.respond(new RespondAiRequest("며느리", "조심스러운 말투", "장면 맥락",
                    "직전 대사", "아이 발화", new RespondAnalysisPayload("OPINION", null), "NORMAL",
                    "directResponse", null, null));

            assertThat(result.success()).isFalse();
        } finally {
            errorServer.stop(0);
        }
    }
}
