package com.goodquestion.backend.message.repository;

import com.goodquestion.backend.message.entity.Message;
import com.goodquestion.backend.session.entity.StorySession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<Message, UUID> {

    List<Message> findAllBySessionOrderByTurnOrderAsc(StorySession session);
}
