package com.goodquestion.backend.wordbook.repository;

import com.goodquestion.backend.child.entity.Child;
import com.goodquestion.backend.story.entity.Story;
import com.goodquestion.backend.wordbook.entity.Wordbook;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WordbookRepository extends JpaRepository<Wordbook, UUID> {

    List<Wordbook> findAllByChildOrderByCreatedAtDesc(Child child);

    List<Wordbook> findAllByChildAndLikedOrderByCreatedAtDesc(Child child, boolean liked);

    List<Wordbook> findAllByChildAndSourceScene_StoryOrderByCreatedAtDesc(Child child, Story story);
}
