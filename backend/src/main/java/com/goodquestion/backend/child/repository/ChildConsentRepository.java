package com.goodquestion.backend.child.repository;

import com.goodquestion.backend.child.entity.Child;
import com.goodquestion.backend.child.entity.ChildConsent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ChildConsentRepository extends JpaRepository<ChildConsent, UUID> {

    Optional<ChildConsent> findFirstByChildOrderByConsentedAtDesc(Child child);
}
