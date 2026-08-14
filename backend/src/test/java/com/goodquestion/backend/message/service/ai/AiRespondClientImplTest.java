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
}
