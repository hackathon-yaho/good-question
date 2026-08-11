package com.goodquestion.backend.story.repository;

import com.goodquestion.backend.story.entity.Story;
import com.goodquestion.backend.story.entity.StoryScene;
import com.goodquestion.backend.story.enums.SceneType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StorySceneRepository extends JpaRepository<StoryScene, UUID> {

    List<StoryScene> findAllByStoryOrderBySceneOrderAsc(Story story);

    long countByStoryAndSceneType(Story story, SceneType sceneType);
}
