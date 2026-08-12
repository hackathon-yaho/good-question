package com.goodquestion.backend.parent.repository;

import com.goodquestion.backend.parent.entity.Report;
import com.goodquestion.backend.session.entity.StorySession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ReportRepository extends JpaRepository<Report, UUID> {

    Optional<Report> findBySession(StorySession session);
}
