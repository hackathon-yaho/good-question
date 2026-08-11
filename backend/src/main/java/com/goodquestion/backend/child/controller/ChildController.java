package com.goodquestion.backend.child.controller;

import com.goodquestion.backend.child.dto.request.ChildCreateRequest;
import com.goodquestion.backend.child.dto.request.ChildUpdateRequest;
import com.goodquestion.backend.child.dto.response.ChildResponse;
import com.goodquestion.backend.child.dto.response.ChildrenResponse;
import com.goodquestion.backend.child.service.ChildService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/children")
@RequiredArgsConstructor
public class ChildController {

    private final ChildService childService;

    @GetMapping
    public ChildrenResponse getChildren(@AuthenticationPrincipal UUID parentId) {
        return childService.getChildren(parentId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ChildResponse createChild(@AuthenticationPrincipal UUID parentId,
                                      @Valid @RequestBody ChildCreateRequest request) {
        return childService.createChild(parentId, request);
    }

    @PatchMapping("/{childId}")
    public ChildResponse updateChild(@AuthenticationPrincipal UUID parentId,
                                      @PathVariable UUID childId,
                                      @RequestBody ChildUpdateRequest request) {
        return childService.updateChild(parentId, childId, request);
    }

    @DeleteMapping("/{childId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteChild(@AuthenticationPrincipal UUID parentId, @PathVariable UUID childId) {
        childService.deleteChild(parentId, childId);
    }
}
