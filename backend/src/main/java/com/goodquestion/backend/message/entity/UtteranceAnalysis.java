package com.goodquestion.backend.message.entity;

import com.goodquestion.backend.message.enums.ChildIntent;
import com.goodquestion.backend.message.enums.UtteranceValidity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.type.SqlTypes;

import java.util.List;
import java.util.UUID;

/**
 * PRD 8.10. 아이 메시지에만 1:1로 존재한다. 서버 후처리(원문 근거 대조·중복 제거·스키마 외 값 제거,
 * PRD 6.7)를 통과한 값만 저장한다 — 분석 LLM의 원본 출력을 그대로 저장하지 않는다.
 */
@Entity
@Table(name = "utterance_analyses")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UtteranceAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false, unique = true)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Message message;

    @Enumerated(EnumType.STRING)
    @Column(name = "child_intent", nullable = false)
    private ChildIntent childIntent;

    @Column(name = "main_point", columnDefinition = "text")
    private String mainPoint;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "detected_elements", nullable = false)
    private List<DetectedElement> detectedElements;

    @Enumerated(EnumType.STRING)
    @Column(name = "utterance_validity", nullable = false)
    private UtteranceValidity utteranceValidity;

    public static UtteranceAnalysis create(Message message, ChildIntent childIntent, String mainPoint,
                                            List<DetectedElement> detectedElements,
                                            UtteranceValidity utteranceValidity) {
        UtteranceAnalysis analysis = new UtteranceAnalysis();
        analysis.message = message;
        analysis.childIntent = childIntent;
        analysis.mainPoint = mainPoint;
        analysis.detectedElements = detectedElements;
        analysis.utteranceValidity = utteranceValidity;
        return analysis;
    }
}
