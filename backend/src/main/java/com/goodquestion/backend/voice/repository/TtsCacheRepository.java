package com.goodquestion.backend.voice.repository;

import com.goodquestion.backend.voice.entity.TtsCache;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TtsCacheRepository extends JpaRepository<TtsCache, UUID> {

    Optional<TtsCache> findByTextHash(String textHash);
}
