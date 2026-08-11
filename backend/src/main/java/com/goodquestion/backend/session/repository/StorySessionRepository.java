package com.goodquestion.backend.session.repository;

import com.goodquestion.backend.child.entity.Child;
import com.goodquestion.backend.session.entity.StorySession;
import com.goodquestion.backend.session.enums.SessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StorySessionRepository extends JpaRepository<StorySession, UUID> {

    Optional<StorySession> findFirstByChildAndStatusOrderByLastActivityAtDesc(Child child, SessionStatus status);

    Optional<StorySession> findFirstByChildOrderByLastActivityAtDesc(Child child);

    List<StorySession> findAllByChild(Child child);
}
