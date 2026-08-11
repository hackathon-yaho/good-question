package com.goodquestion.backend.activity.repository;

import com.goodquestion.backend.activity.entity.PostActivityResult;
import com.goodquestion.backend.session.entity.StorySession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PostActivityResultRepository extends JpaRepository<PostActivityResult, UUID> {

    Optional<PostActivityResult> findBySession(StorySession session);
}
