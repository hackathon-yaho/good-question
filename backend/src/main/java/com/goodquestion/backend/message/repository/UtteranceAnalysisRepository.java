package com.goodquestion.backend.message.repository;

import com.goodquestion.backend.message.entity.UtteranceAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UtteranceAnalysisRepository extends JpaRepository<UtteranceAnalysis, UUID> {
}
