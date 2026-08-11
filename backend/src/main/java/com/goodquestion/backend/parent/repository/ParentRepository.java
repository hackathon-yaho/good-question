package com.goodquestion.backend.parent.repository;

import com.goodquestion.backend.parent.entity.Parent;
import com.goodquestion.backend.parent.enums.Provider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ParentRepository extends JpaRepository<Parent, UUID> {

    Optional<Parent> findByProviderAndProviderId(Provider provider, String providerId);
}
