package com.goodquestion.backend.child.service;

import com.goodquestion.backend.child.dto.request.ChildCreateRequest;
import com.goodquestion.backend.child.dto.request.ChildUpdateRequest;
import com.goodquestion.backend.child.dto.request.ConsentsPayload;
import com.goodquestion.backend.child.dto.response.ChildResponse;
import com.goodquestion.backend.child.dto.response.ChildrenResponse;
import com.goodquestion.backend.child.entity.Child;
import com.goodquestion.backend.child.entity.ChildConsent;
import com.goodquestion.backend.child.enums.VerificationMethod;
import com.goodquestion.backend.child.repository.ChildConsentRepository;
import com.goodquestion.backend.child.repository.ChildRepository;
import com.goodquestion.backend.common.global.ErrorCode;
import com.goodquestion.backend.common.global.exception.BusinessException;
import com.goodquestion.backend.parent.entity.Parent;
import com.goodquestion.backend.parent.repository.ParentRepository;
import com.goodquestion.backend.session.entity.StorySession;
import com.goodquestion.backend.session.repository.StorySessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChildServiceImpl implements ChildService {

    /** PRD I-09. */
    private static final int MAX_CHILDREN_PER_PARENT = 3;
    private static final String CONSENT_VERSION = "mvp_v1";

    private final ChildRepository childRepository;
    private final ChildConsentRepository childConsentRepository;
    private final ParentRepository parentRepository;
    private final StorySessionRepository storySessionRepository;

    @Override
    @Transactional(readOnly = true)
    public ChildrenResponse getChildren(UUID parentId) {
        Parent parent = getParent(parentId);
        var children = childRepository.findAllByParent(parent).stream()
                .map(this::toResponse)
                .toList();
        return new ChildrenResponse(children, MAX_CHILDREN_PER_PARENT);
    }

    @Override
    @Transactional
    public ChildResponse createChild(UUID parentId, ChildCreateRequest request) {
        Parent parent = getParent(parentId);

        if (childRepository.countByParent(parent) >= MAX_CHILDREN_PER_PARENT) {
            throw new BusinessException(ErrorCode.CHILD_LIMIT_EXCEEDED);
        }
        if (!isRequiredConsentGranted(request.consents())) {
            throw new BusinessException(ErrorCode.CONSENT_REQUIRED);
        }

        Child child = Child.create(parent, request.name(), request.birthYear(), request.avatarId());
        childRepository.save(child);
        childConsentRepository.save(
                ChildConsent.create(child, CONSENT_VERSION, VerificationMethod.AUTHENTICATED_PARENT));

        return ChildResponse.of(child, true, null);
    }

    @Override
    @Transactional
    public ChildResponse updateChild(UUID parentId, UUID childId, ChildUpdateRequest request) {
        Child child = getOwnedChild(parentId, childId);
        child.updateProfile(request.name(), request.avatarId());
        return toResponse(child);
    }

    @Override
    @Transactional
    public void deleteChild(UUID parentId, UUID childId) {
        Child child = getOwnedChild(parentId, childId);
        childRepository.delete(child);
    }

    private boolean isRequiredConsentGranted(ConsentsPayload consents) {
        return Boolean.TRUE.equals(consents.termsOfService())
                && Boolean.TRUE.equals(consents.privacyPolicy())
                && Boolean.TRUE.equals(consents.childDataProcessing());
    }

    private Parent getParent(UUID parentId) {
        return parentRepository.findById(parentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    /** 다른 보호자의 아이를 건드리면 404가 아니라 403 FORBIDDEN이다 (plan.md Phase 2 완료 조건). */
    private Child getOwnedChild(UUID parentId, UUID childId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!child.getParent().getId().equals(parentId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return child;
    }

    private ChildResponse toResponse(Child child) {
        boolean consentGranted = childConsentRepository.findFirstByChildOrderByConsentedAtDesc(child)
                .map(ChildConsent::isActive)
                .orElse(false);
        Instant lastActivityAt = storySessionRepository.findFirstByChildOrderByLastActivityAtDesc(child)
                .map(StorySession::getLastActivityAt)
                .orElse(null);
        return ChildResponse.of(child, consentGranted, lastActivityAt);
    }
}
