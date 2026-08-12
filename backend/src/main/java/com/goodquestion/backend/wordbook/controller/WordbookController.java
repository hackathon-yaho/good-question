package com.goodquestion.backend.wordbook.controller;

import com.goodquestion.backend.wordbook.dto.request.WordbookCreateRequest;
import com.goodquestion.backend.wordbook.dto.request.WordbookUpdateRequest;
import com.goodquestion.backend.wordbook.dto.response.WordEntryResponse;
import com.goodquestion.backend.wordbook.dto.response.WordbookListResponse;
import com.goodquestion.backend.wordbook.service.WordbookService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/wordbook")
@RequiredArgsConstructor
public class WordbookController {

    private final WordbookService wordbookService;

    @GetMapping
    public WordbookListResponse list(@AuthenticationPrincipal UUID parentId,
                                      @RequestParam UUID childId,
                                      @RequestParam(defaultValue = "all") String filter) {
        return wordbookService.list(parentId, childId, filter);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WordEntryResponse create(@AuthenticationPrincipal UUID parentId,
                                     @Valid @RequestBody WordbookCreateRequest request) {
        return wordbookService.save(parentId, request);
    }

    @PatchMapping("/{wordbookId}")
    public WordEntryResponse update(@AuthenticationPrincipal UUID parentId,
                                     @PathVariable UUID wordbookId,
                                     @Valid @RequestBody WordbookUpdateRequest request) {
        return wordbookService.updateLiked(parentId, wordbookId, request);
    }
}
