package com.goodquestion.backend.wordbook.service;

import com.goodquestion.backend.child.entity.Child;
import com.goodquestion.backend.child.repository.ChildRepository;
import com.goodquestion.backend.common.global.ErrorCode;
import com.goodquestion.backend.common.global.exception.BusinessException;
import com.goodquestion.backend.story.entity.StoryScene;
import com.goodquestion.backend.story.repository.StorySceneRepository;
import com.goodquestion.backend.wordbook.dto.request.WordbookCreateRequest;
import com.goodquestion.backend.wordbook.dto.request.WordbookUpdateRequest;
import com.goodquestion.backend.wordbook.dto.response.StoryFilterResponse;
import com.goodquestion.backend.wordbook.dto.response.WordEntryResponse;
import com.goodquestion.backend.wordbook.dto.response.WordbookListResponse;
import com.goodquestion.backend.wordbook.entity.Wordbook;
import com.goodquestion.backend.wordbook.repository.WordbookRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** O-06~O-10, work-items.md 12장. 선택-후순위. api.md 3.7. */
@Service
@RequiredArgsConstructor
public class WordbookServiceImpl implements WordbookService {

    private static final String FILTER_ALL = "all";
    private static final String FILTER_LIKED = "liked";
    private static final String FILTER_STORY_PREFIX = "story:";

    private final ChildRepository childRepository;
    private final StorySceneRepository storySceneRepository;
    private final WordbookRepository wordbookRepository;

    @Override
    @Transactional(readOnly = true)
    public WordbookListResponse list(UUID parentId, UUID childId, String filter) {
        Child child = getOwnedChild(parentId, childId);
        List<Wordbook> all = wordbookRepository.findAllByChildOrderByCreatedAtDesc(child);

        List<WordEntryResponse> words = applyFilter(all, filter).stream()
                .map(WordEntryResponse::from)
                .toList();

        List<StoryFilterResponse> storyFilters = all.stream()
                .map(w -> w.getSourceScene().getStory())
                .distinct()
                .map(story -> new StoryFilterResponse(story.getId(), story.getTitle()))
                .toList();

        // total은 필터와 무관한 전체 개수다 (api.md 3.7) — words.size()가 아니라 all.size().
        return new WordbookListResponse(words, all.size(), storyFilters);
    }

    private List<Wordbook> applyFilter(List<Wordbook> all, String filter) {
        if (filter == null || FILTER_ALL.equals(filter)) return all;
        if (FILTER_LIKED.equals(filter)) return all.stream().filter(Wordbook::getLiked).toList();
        if (filter.startsWith(FILTER_STORY_PREFIX)) {
            UUID storyId = parseStoryId(filter);
            return all.stream()
                    .filter(w -> w.getSourceScene().getStory().getId().equals(storyId))
                    .toList();
        }
        throw new BusinessException(ErrorCode.INVALID_REQUEST, "filter 값이 올바르지 않습니다.");
    }

    private UUID parseStoryId(String filter) {
        try {
            return UUID.fromString(filter.substring(FILTER_STORY_PREFIX.length()));
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "filter의 storyId 형식이 올바르지 않습니다.");
        }
    }

    @Override
    @Transactional
    public WordEntryResponse save(UUID parentId, WordbookCreateRequest request) {
        Child child = getOwnedChild(parentId, request.childId());
        StoryScene scene = storySceneRepository.findById(request.sourceSceneId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));

        Wordbook saved = wordbookRepository.save(
                Wordbook.create(child, request.word(), request.meaning(), scene, request.contextSentence()));
        return WordEntryResponse.from(saved);
    }

    @Override
    @Transactional
    public WordEntryResponse updateLiked(UUID parentId, UUID wordbookId, WordbookUpdateRequest request) {
        Wordbook wordbook = wordbookRepository.findById(wordbookId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!wordbook.getChild().getParent().getId().equals(parentId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        wordbook.updateLiked(request.liked());
        return WordEntryResponse.from(wordbook);
    }

    private Child getOwnedChild(UUID parentId, UUID childId) {
        Child child = childRepository.findById(childId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
        if (!child.getParent().getId().equals(parentId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return child;
    }
}
