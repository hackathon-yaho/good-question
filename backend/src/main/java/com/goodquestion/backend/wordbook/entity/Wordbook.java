package com.goodquestion.backend.wordbook.entity;

import com.goodquestion.backend.child.entity.Child;
import com.goodquestion.backend.story.entity.StoryScene;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;
import java.util.UUID;

/**
 * PRD 8.12 + 팀 추가 컬럼 2개 (decisions.md D-11 · D-22).
 * `liked`(D-11)와 `contextSentence`(D-22, 저장 시점 화면에 떠 있던 대사 원문 — 서버가
 * 역산할 방법이 없어 요청에 실어 받는다)는 PRD 원 스키마에 없다.
 */
@Entity
@Table(name = "wordbook")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Wordbook {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "child_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Child child;

    @Column(name = "word", nullable = false)
    private String word;

    @Column(name = "meaning", nullable = false, columnDefinition = "text")
    private String meaning;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_scene_id", nullable = false)
    private StoryScene sourceScene;

    @Column(name = "context_sentence", columnDefinition = "text")
    private String contextSentence;

    @Column(name = "liked", nullable = false)
    private Boolean liked;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    protected void onPersist() {
        this.createdAt = Instant.now();
        if (this.liked == null) this.liked = false;
    }

    public static Wordbook create(Child child, String word, String meaning, StoryScene sourceScene, String contextSentence) {
        Wordbook wordbook = new Wordbook();
        wordbook.child = child;
        wordbook.word = word;
        wordbook.meaning = meaning;
        wordbook.sourceScene = sourceScene;
        wordbook.contextSentence = contextSentence;
        wordbook.liked = false;
        return wordbook;
    }

    public void updateLiked(boolean liked) {
        this.liked = liked;
    }
}
