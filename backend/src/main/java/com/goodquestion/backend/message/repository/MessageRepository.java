package com.goodquestion.backend.message.repository;

import com.goodquestion.backend.message.entity.Message;
import com.goodquestion.backend.message.enums.SpeakerType;
import com.goodquestion.backend.session.entity.StorySession;
import com.goodquestion.backend.story.entity.StoryScene;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {

    List<Message> findAllBySessionOrderByTurnOrderAsc(StorySession session);

    Optional<Message> findFirstBySessionAndSpeakerTypeOrderByTurnOrderDesc(StorySession session, SpeakerType speakerType);

    Optional<Message> findFirstBySessionAndSceneAndSpeakerTypeOrderByTurnOrderDesc(
            StorySession session, StoryScene scene, SpeakerType speakerType);

    boolean existsBySessionAndSceneAndSpeakerType(StorySession session, StoryScene scene, SpeakerType speakerType);

    long countBySessionAndSpeakerType(StorySession session, SpeakerType speakerType);

    List<Message> findAllBySessionAndSpeakerType(StorySession session, SpeakerType speakerType);
}
