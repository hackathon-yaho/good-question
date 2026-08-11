package com.goodquestion.backend.child.service;

import com.goodquestion.backend.child.dto.request.ChildCreateRequest;
import com.goodquestion.backend.child.dto.request.ChildUpdateRequest;
import com.goodquestion.backend.child.dto.response.ChildResponse;
import com.goodquestion.backend.child.dto.response.ChildrenResponse;

import java.util.UUID;

public interface ChildService {

    ChildrenResponse getChildren(UUID parentId);

    ChildResponse createChild(UUID parentId, ChildCreateRequest request);

    ChildResponse updateChild(UUID parentId, UUID childId, ChildUpdateRequest request);

    void deleteChild(UUID parentId, UUID childId);
}
