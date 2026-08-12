package com.goodquestion.backend.message.repository;

import com.goodquestion.backend.message.entity.UtteranceAnalysis;
import com.goodquestion.backend.session.entity.StorySession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UtteranceAnalysisRepository extends JpaRepository<UtteranceAnalysis, UUID> {

    List<UtteranceAnalysis> findAllByMessage_Session(StorySession session);
}
