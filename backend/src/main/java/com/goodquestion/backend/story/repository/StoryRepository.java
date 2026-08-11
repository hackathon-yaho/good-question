package com.goodquestion.backend.story.repository;

import com.goodquestion.backend.story.entity.Story;
import com.goodquestion.backend.story.enums.StoryStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StoryRepository extends JpaRepository<Story, UUID> {

    List<Story> findAllByStatus(StoryStatus status);

    boolean existsByTitle(String title);
}
