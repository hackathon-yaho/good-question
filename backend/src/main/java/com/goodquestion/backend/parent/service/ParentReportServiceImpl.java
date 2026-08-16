package com.goodquestion.backend.parent.service;

import com.goodquestion.backend.child.entity.Child;
import com.goodquestion.backend.child.repository.ChildRepository;
import com.goodquestion.backend.common.global.ErrorCode;
import com.goodquestion.backend.common.global.exception.BusinessException;
import com.goodquestion.backend.message.entity.DetectedElement;
import com.goodquestion.backend.message.entity.Message;
import com.goodquestion.backend.message.entity.UtteranceAnalysis;
import com.goodquestion.backend.message.enums.SpeakerType;
import com.goodquestion.backend.message.repository.MessageRepository;
import com.goodquestion.backend.message.repository.UtteranceAnalysisRepository;
import com.goodquestion.backend.parent.dto.response.ChildBriefResponse;
import com.goodquestion.backend.parent.dto.response.ChildChipResponse;
import com.goodquestion.backend.parent.dto.response.ParentSummaryResponse;
import com.goodquestion.backend.parent.dto.response.ReportDetailResponse;
import com.goodquestion.backend.parent.dto.response.ReportListItemResponse;
import com.goodquestion.backend.parent.dto.response.ReportListResponse;
import com.goodquestion.backend.parent.dto.response.WeeklyTrendPointResponse;
import com.goodquestion.backend.parent.entity.CompetencyCard;
import com.goodquestion.backend.parent.entity.ElementCount;
import com.goodquestion.backend.parent.entity.HomeGuide;
import com.goodquestion.backend.parent.entity.Report;
import com.goodquestion.backend.parent.entity.RepresentativeUtterance;
import com.goodquestion.backend.parent.entity.ReportVocabulary;
import com.goodquestion.backend.parent.report.ChildUtterance;
import com.goodquestion.backend.parent.report.QuestionKind;
import com.goodquestion.backend.parent.report.ReportGenerator;
import com.goodquestion.backend.parent.report.ai.CompetencyAiCard;
import com.goodquestion.backend.parent.report.ai.ReportAiClient;
import com.goodquestion.backend.parent.report.ai.ReportAiRequest;
import com.goodquestion.backend.parent.report.ai.ReportAiResult;
import com.goodquestion.backend.parent.report.ai.ReportUtterance;
import com.goodquestion.backend.parent.repository.ReportRepository;
import com.goodquestion.backend.session.entity.StorySession;
import com.goodquestion.backend.session.enums.SessionStatus;
import com.goodquestion.backend.session.repository.StorySessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** O-01~O-05, work-items.md 12장. 계산 로직은 {@link ReportGenerator}에 순수 함수로 분리했다. */
@Slf4j
@Service
@RequiredArgsConstructor
public class ParentReportServiceImpl implements ParentReportService {

    /** 리포트 가이드가 며느리 이야기 기준으로 만들어져 한국 시간 기준으로 날짜를 표기한다. */
    private static final ZoneId DISPLAY_ZONE = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy.MM.dd").withZone(DISPLAY_ZONE);
    private static final int WEEKLY_TREND_WEEKS = 4;

    private final ChildRepository childRepository;
    private final StorySessionRepository storySessionRepository;
    private final MessageRepository messageRepository;
    private final UtteranceAnalysisRepository utteranceAnalysisRepository;
    private final ReportRepository reportRepository;
    private final ReportAiClient reportAiClient;

    @Override
    @Transactional(readOnly = true)
    public ParentSummaryResponse getSummary(UUID parentId, UUID childId) {
        Child child = getOwnedChild(parentId, childId);
        List<StorySession> sessions = storySessionRepository.findAllByChild(child);
        List<StorySession> completed = sessions.stream().filter(s -> s.getStatus() == SessionStatus.COMPLETED).toList();

        Instant weekAgo = Instant.now().minus(7, ChronoUnit.DAYS);
        long thisWeekCount = completed.stream().filter(s -> referenceInstant(s).isAfter(weekAgo)).count();

        List<String> allChildTexts = sessions.stream()
                .flatMap(s -> messageRepository.findAllBySessionAndSpeakerType(s, SpeakerType.CHILD).stream())
                .map(Message::getText)
                .toList();

        double avg = allChildTexts.isEmpty() ? 0
                : allChildTexts.stream().mapToInt(ReportGenerator::sentenceCount).average().orElse(0);

        return new ParentSummaryResponse(
                ChildBriefResponse.of(child),
                (int) thisWeekCount,
                completed.size(),
                Math.round(avg * 10) / 10.0,
                !allChildTexts.isEmpty());
    }

    @Override
    @Transactional(readOnly = true)
    public ReportListResponse listReports(UUID parentId, UUID childId) {
        Child child = getOwnedChild(parentId, childId);
        List<Child> siblings = childRepository.findAllByParent(child.getParent());
        List<StorySession> sessions = storySessionRepository.findAllByChild(child);

        Map<UUID, List<Message>> childMessagesBySession = new HashMap<>();
        List<Message> allChildMessages = new ArrayList<>();
        for (StorySession session : sessions) {
            List<Message> messages = messageRepository.findAllBySessionAndSpeakerType(session, SpeakerType.CHILD);
            childMessagesBySession.put(session.getId(), messages);
            allChildMessages.addAll(messages);
        }

        List<WeeklyTrendPointResponse> weeklyTrend = weeklyTrendOf(allChildMessages);
        String trendMessage = trendMessageOf(weeklyTrend);

        List<ReportListItemResponse> reports = sessions.stream()
                .filter(s -> !childMessagesBySession.get(s.getId()).isEmpty())
                .map(s -> new ReportListItemResponse(
                        s.getId(), s.getStory().getTitle(), s.getStory().getCoverImageUrl(),
                        DATE_FORMAT.format(referenceInstant(s)), s.getStatus().name().toLowerCase()))
                .toList();

        return new ReportListResponse(
                siblings.stream().map(ChildChipResponse::of).toList(),
                weeklyTrend,
                trendMessage,
                reports);
    }

    /** 최근 4주, 오늘부터 7일 단위로 역산 — 오래된 주부터 순서대로. */
    private List<WeeklyTrendPointResponse> weeklyTrendOf(List<Message> allChildMessages) {
        Instant now = Instant.now();
        List<WeeklyTrendPointResponse> weeklyTrend = new ArrayList<>();
        for (int back = WEEKLY_TREND_WEEKS - 1; back >= 0; back--) {
            Instant from = now.minus((long) (back + 1) * 7, ChronoUnit.DAYS);
            Instant to = now.minus((long) back * 7, ChronoUnit.DAYS);
            long count = allChildMessages.stream()
                    .filter(m -> !m.getCreatedAt().isBefore(from) && m.getCreatedAt().isBefore(to))
                    .count();
            String label = back == 0 ? "이번 주" : back + "주 전";
            weeklyTrend.add(new WeeklyTrendPointResponse(label, (int) count));
        }
        return weeklyTrend;
    }

    /** 없는 추세를 말하지 않는다 — 직전 주보다 늘었을 때만 문구, 기록이 아예 없으면 null. */
    private String trendMessageOf(List<WeeklyTrendPointResponse> weeklyTrend) {
        long filledWeeks = weeklyTrend.stream().filter(w -> w.utteranceCount() > 0).count();
        int last = weeklyTrend.size() - 1;
        if (filledWeeks >= 2 && weeklyTrend.get(last).utteranceCount() > weeklyTrend.get(last - 1).utteranceCount()) {
            return "말하기 문장 수가 늘고 있어요";
        }
        if (filledWeeks == 0) return null;
        return "기록이 조금씩 모이고 있어요";
    }

    @Override
    @Transactional(readOnly = true)
    public ReportDetailResponse getReport(UUID parentId, UUID sessionId) {
        StorySession session = storySessionRepository.findById(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!session.getChild().getParent().getId().equals(parentId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        Report report = reportRepository.findBySession(session)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        return ReportDetailResponse.of(report, session.getStory().getTitle(), DATE_FORMAT.format(referenceInstant(session)));
    }

    @Override
    @Transactional
    public void generateReportIfAbsent(StorySession session) {
        if (reportRepository.findBySession(session).isPresent()) return;

        List<Message> childMessages = messageRepository.findAllBySessionAndSpeakerType(session, SpeakerType.CHILD);
        List<UtteranceAnalysis> analyses = utteranceAnalysisRepository.findAllByMessage_Session(session);

        List<String> texts = childMessages.stream().map(Message::getText).toList();
        List<String> detectedTypes = analyses.stream()
                .flatMap(a -> a.getDetectedElements().stream())
                .map(DetectedElement::type)
                .toList();
        List<ChildUtterance> utterances = childMessages.stream()
                .map(m -> new ChildUtterance(m.getText(), m.getScene().getSceneOrder() / 2))
                .toList();

        ReportVocabulary vocabulary = ReportGenerator.vocabularyOf(texts);
        List<CompetencyCard> competencies = ReportGenerator.competenciesOf(detectedTypes, texts);
        List<ElementCount> elementCounts = ReportGenerator.elementCountsOf(detectedTypes);
        RepresentativeUtterance representative = ReportGenerator.representativeOf(utterances);
        QuestionKind kind = ReportGenerator.pickQuestionKind(texts, detectedTypes);
        HomeGuide guide = ReportGenerator.guideFor(kind);
        String summary = ReportGenerator.summaryOf(texts.size());

        reportRepository.save(Report.create(session, summary, vocabulary, competencies, elementCounts, representative, guide));
    }

    /**
     * parent-report-ai-generation.md. generateReportIfAbsent()가 이미 만든 규칙 기반 리포트를
     * 전제로 한다 — 없으면(비정상 호출 순서) 조용히 돌아간다. AI가 성공하면 그 행을 덮어쓰고,
     * 실패하면(재시도 소진·스키마 위반 등 전부 reportAiClient가 failure()로 묶는다) 아무것도
     * 하지 않는다 — 규칙 기반 버전이 그대로 안전망으로 남는다.
     */
    @Override
    @Async
    @Transactional
    public void enhanceReportWithAi(UUID sessionId) {
        StorySession session = storySessionRepository.findById(sessionId).orElse(null);
        if (session == null) return;
        Report report = reportRepository.findBySession(session).orElse(null);
        if (report == null) return;

        List<Message> childMessages = messageRepository.findAllBySessionAndSpeakerType(session, SpeakerType.CHILD);
        List<ReportUtterance> utterances = new ArrayList<>();
        List<String> allDetectedTypes = new ArrayList<>();
        for (int i = 0; i < childMessages.size(); i++) {
            Message message = childMessages.get(i);
            List<String> types = utteranceAnalysisRepository.findByMessage(message)
                    .map(a -> a.getDetectedElements().stream().map(DetectedElement::type).toList())
                    .orElse(List.of());
            allDetectedTypes.addAll(types);
            utterances.add(new ReportUtterance(i, message.getText(),
                    "장면 " + (message.getScene().getSceneOrder() / 2), types));
        }

        ReportAiRequest request = new ReportAiRequest(
                session.getStory().getTitle(), utterances, ReportGenerator.competencyHintsOf(allDetectedTypes));
        ReportAiResult result = reportAiClient.generate(request);
        if (!result.success()) {
            log.info("[ParentReportService] AI 리포트 생성 실패 — 규칙 기반 리포트 유지 (session={})", sessionId);
            return;
        }

        List<CompetencyCard> competencies = result.competencies().stream()
                .map(card -> toCompetencyCard(card, utterances))
                .toList();
        RepresentativeUtterance representative = toRepresentative(result, utterances);
        HomeGuide guide = new HomeGuide(report.getGuide().intro(), result.storyQuestions(), result.dailyQuestions());

        report.updateFromAi(competencies, representative, guide);
    }

    private CompetencyCard toCompetencyCard(CompetencyAiCard card, List<ReportUtterance> utterances) {
        String evidence = card.evidenceIndex() == null ? null : utterances.get(card.evidenceIndex()).text();
        return new CompetencyCard(card.name(), card.feature(), evidence, card.strength(), card.next());
    }

    private RepresentativeUtterance toRepresentative(ReportAiResult result, List<ReportUtterance> utterances) {
        ReportUtterance picked = utterances.get(result.representativeIndex());
        return new RepresentativeUtterance(picked.text(), picked.sceneLabel(), result.representativeReason());
    }

    /** 완료된 세션은 completedAt, 진행 중이면 lastActivityAt — mock-parent.ts와 같은 기준. */
    private Instant referenceInstant(StorySession session) {
        return session.getCompletedAt() != null ? session.getCompletedAt() : session.getLastActivityAt();
    }

    private Child getOwnedChild(UUID parentId, UUID childId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!child.getParent().getId().equals(parentId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return child;
    }
}
