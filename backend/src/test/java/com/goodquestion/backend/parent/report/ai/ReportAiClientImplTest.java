package com.goodquestion.backend.parent.report.ai;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

/** parent-report-ai-generation.md — POST /report 클라이언트. */
class ReportAiClientImplTest {

    private HttpServer server;
    private final AtomicReference<String> receivedToken = new AtomicReference<>();
    private final AtomicReference<Integer> responseStatus = new AtomicReference<>(200);
    private final AtomicReference<String> responseBody = new AtomicReference<>("""
            {
              "competencies": [
                { "name": "관점과 공감", "feature": "f", "evidenceIndex": 0, "strength": "s", "next": "n" }
              ],
              "representativeIndex": 0,
              "representativeReason": "이유",
              "storyQuestions": ["q1", "q2"],
              "dailyQuestions": ["q3", "q4"]
            }
            """);

    @BeforeEach
    void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/report", exchange -> {
            receivedToken.set(exchange.getRequestHeaders().getFirst("X-Internal-Token"));
            byte[] body = responseBody.get().getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(responseStatus.get(), body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
    }

    @AfterEach
    void stopServer() {
        server.stop(0);
    }

    private ReportAiClientImpl client() {
        return new ReportAiClientImpl("http://localhost:" + server.getAddress().getPort(), 5, "secret-token");
    }

    private ReportAiRequest sampleRequest() {
        return new ReportAiRequest("방귀 뀌는 며느리",
                List.of(new ReportUtterance(0, "며느리가 창피해서 그랬을 것 같아요", "장면 2", List.of("PERSPECTIVE"))),
                List.of(new CompetencyHint("관점과 공감", true)));
    }

    @Test
    void 정상_응답이면_X_Internal_Token_헤더를_담아_보내고_결과를_그대로_반환한다() {
        ReportAiResult result = client().generate(sampleRequest());

        assertThat(receivedToken.get()).isEqualTo("secret-token");
        assertThat(result.success()).isTrue();
        assertThat(result.competencies()).hasSize(1);
        assertThat(result.storyQuestions()).containsExactly("q1", "q2");
    }

    @Test
    void storyQuestions_개수가_2개가_아니면_실패로_처리한다() {
        responseBody.set("""
                {
                  "competencies": [{ "name": "관점과 공감", "feature": "f", "evidenceIndex": 0, "strength": "s", "next": "n" }],
                  "representativeIndex": 0,
                  "representativeReason": "이유",
                  "storyQuestions": ["q1"],
                  "dailyQuestions": ["q3", "q4"]
                }
                """);

        ReportAiResult result = client().generate(sampleRequest());

        assertThat(result.success()).isFalse();
    }

    @Test
    void competencies가_비어있으면_실패로_처리한다() {
        responseBody.set("""
                {
                  "competencies": [],
                  "representativeIndex": 0,
                  "representativeReason": "이유",
                  "storyQuestions": ["q1", "q2"],
                  "dailyQuestions": ["q3", "q4"]
                }
                """);

        ReportAiResult result = client().generate(sampleRequest());

        assertThat(result.success()).isFalse();
    }

    @Test
    void representativeIndex가_요청한_발화_범위를_벗어나면_실패로_처리한다() {
        responseBody.set("""
                {
                  "competencies": [{ "name": "관점과 공감", "feature": "f", "evidenceIndex": 0, "strength": "s", "next": "n" }],
                  "representativeIndex": 5,
                  "representativeReason": "이유",
                  "storyQuestions": ["q1", "q2"],
                  "dailyQuestions": ["q3", "q4"]
                }
                """);

        ReportAiResult result = client().generate(sampleRequest());

        assertThat(result.success()).isFalse();
    }

    @Test
    void matched_true_카테고리인데_evidenceIndex가_null이면_실패로_처리한다() {
        responseBody.set("""
                {
                  "competencies": [{ "name": "관점과 공감", "feature": "f", "evidenceIndex": null, "strength": "s", "next": "n" }],
                  "representativeIndex": 0,
                  "representativeReason": "이유",
                  "storyQuestions": ["q1", "q2"],
                  "dailyQuestions": ["q3", "q4"]
                }
                """);

        ReportAiResult result = client().generate(sampleRequest());

        assertThat(result.success()).isFalse();
    }

    @Test
    void 서버가_502를_반환하면_실패로_처리한다() {
        responseStatus.set(502);

        ReportAiResult result = client().generate(sampleRequest());

        assertThat(result.success()).isFalse();
    }
}
