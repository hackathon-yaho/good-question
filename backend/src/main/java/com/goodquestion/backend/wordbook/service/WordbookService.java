package com.goodquestion.backend.wordbook.service;

import com.goodquestion.backend.wordbook.dto.request.WordbookCreateRequest;
import com.goodquestion.backend.wordbook.dto.request.WordbookUpdateRequest;
import com.goodquestion.backend.wordbook.dto.response.WordEntryResponse;
import com.goodquestion.backend.wordbook.dto.response.WordbookListResponse;

import java.util.UUID;

public interface WordbookService {

    WordbookListResponse list(UUID parentId, UUID childId, String filter);

    WordEntryResponse save(UUID parentId, WordbookCreateRequest request);

    WordEntryResponse updateLiked(UUID parentId, UUID wordbookId, WordbookUpdateRequest request);
}
