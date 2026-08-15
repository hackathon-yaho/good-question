package com.goodquestion.backend.parent.report.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * parent-report-ai-generation.md. 응답시간 초기값 60초(대화 엔드포인트의 10초보다 여유) — AI팀
 * 실측 후 재조정 예정이라 dialogue 타임아웃과 별도 프로퍼티로 둔다. 재시도는 AI Worker가 자체
 * 제어하므로(최초 포함 최대 3회) 여기서는 하지 않는다 — B-10·D-51과 같은 원칙.
 */
@Slf4j
@Component
public class ReportAiClientImpl implements ReportAiClient {

    private final RestClient restClient;

    public ReportAiClientImpl(@Value("${ai.server.base-url}") String baseUrl,
                               @Value("${ai.server.report-timeout-seconds}") long timeoutSeconds,
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
    public ReportAiResult generate(ReportAiRequest request) {
        try {
            ResponseBody body = restClient.post()
                    .uri("/report")
                    .body(request)
                    .retrieve()
                    .body(ResponseBody.class);

            if (!isWellFormed(body, request)) {
                log.warn("[ReportAiClient] /report 응답이 스키마를 벗어나 실패로 처리합니다: {}", body);
                return ReportAiResult.failure();
            }
            return new ReportAiResult(true, body.competencies(), body.representativeIndex(),
                    body.representativeReason(), body.storyQuestions(), body.dailyQuestions());
        } catch (Exception e) {
            log.warn("[ReportAiClient] /report 호출 실패, 기존 규칙 기반 리포트를 유지합니다: {}", e.getMessage());
            return ReportAiResult.failure();
        }
    }

    /**
     * 완료조건 — storyQuestions·dailyQuestions는 정확히 2개, competencies는 비어 있으면 안 된다.
     * representativeIndex·evidenceIndex는 요청에 보낸 발화 개수 안에 있어야 하고, matched=true인
     * 카테고리인데 evidenceIndex가 null이면(품질 기준 위반) 실패로 본다 — 서비스 레이어가 index를
     * 그대로 믿고 조회할 수 있게, 검증은 여기서 전부 끝낸다.
     */
    private boolean isWellFormed(ResponseBody body, ReportAiRequest request) {
        if (body == null || body.competencies() == null || body.competencies().isEmpty()) return false;
        if (!hasExactlyTwo(body.storyQuestions()) || !hasExactlyTwo(body.dailyQuestions())) return false;

        int utteranceCount = request.utterances().size();
        if (!isValidIndex(body.representativeIndex(), utteranceCount)) return false;

        Map<String, Boolean> matchedByName = request.competencyHints().stream()
                .collect(Collectors.toMap(CompetencyHint::name, CompetencyHint::matched));
        for (CompetencyAiCard card : body.competencies()) {
            Integer evidenceIndex = card.evidenceIndex();
            if (evidenceIndex != null && !isValidIndex(evidenceIndex, utteranceCount)) return false;
            if (Boolean.TRUE.equals(matchedByName.get(card.name())) && evidenceIndex == null) return false;
        }
        return true;
    }

    private boolean isValidIndex(Integer index, int size) {
        return index != null && index >= 0 && index < size;
    }

    private boolean hasExactlyTwo(List<String> questions) {
        return questions != null && questions.size() == 2;
    }

    private record ResponseBody(
            List<CompetencyAiCard> competencies,
            Integer representativeIndex,
            String representativeReason,
            List<String> storyQuestions,
            List<String> dailyQuestions
    ) {
    }
}
