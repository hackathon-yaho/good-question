/**
 * 실서버 클라이언트 — 이야기(§4) · 단어장(§9) · 마이페이지(§11)
 * 기준: backend/docs/api-spec.md
 */

import { request } from "@/lib/api/http";
import type {
  ContentApi,
  MypageSnapshot,
  StoryDetail,
  StoryListResult,
  WordEntry,
  WordbookResult,
} from "@/lib/api/types";

export const contentApiClient: ContentApi = {
  /**
   * 이야기 목록 — api-spec 4.1.
   * `childId`가 필수인 이유는 그 아이의 `sessionStatus`(B-2 배지)를 함께 계산하기
   * 때문이다. `availableTopics`는 필터와 무관하게 전체 기준으로 온다.
   */
  listStories(childId, topic) {
    const params = new URLSearchParams({ childId });
    if (topic) params.set("topic", topic);
    return request<StoryListResult>(`/stories?${params.toString()}`);
  },

  getStory(storyId, childId) {
    const params = new URLSearchParams({ childId });
    return request<StoryDetail>(`/stories/${storyId}?${params.toString()}`);
  },

  /** `filter`는 `all` / `liked` / `story:{storyId}`. 형식이 틀리면 400. */
  listWords(childId, filter = "all") {
    const params = new URLSearchParams({ childId, filter });
    return request<WordbookResult>(`/wordbook?${params.toString()}`);
  },

  /**
   * 단어 저장 — api-spec 9.2.
   *
   * ⚠️ `storyId`를 **보내지 않는다.** 서버가 `sourceSceneId`로 역산한다.
   *    인터페이스에는 남아 있다 — 목이 그 값으로 저장하기 때문이다.
   *
   * 저장 시점에 화면에 떠 있던 단어·뜻·대사 원문을 그대로 보낸다. 서버는 이 값을
   * 재계산하지 않는다(캐릭터 대사가 매 턴 LLM 생성이라 역산이 불가능하다 · D-22).
   *
   * 중복 방지 로직이 서버에 없다. 담김/안 담김은 화면이 관리한다.
   */
  saveWord(childId, body) {
    return request<WordEntry>("/wordbook", {
      method: "POST",
      body: {
        childId,
        word: body.word,
        meaning: body.meaning,
        sourceSceneId: body.sourceSceneId,
        contextSentence: body.contextSentence ?? null,
      },
    });
  },

  /** 좋아요 — 목표 값을 보낸다. 서버가 뒤집어 주지 않는다. (api-spec 9.3) */
  toggleWordLiked(_childId, wordId, liked) {
    return request<WordEntry>(`/wordbook/${wordId}`, {
      method: "PATCH",
      body: { liked },
    });
  },

  getMypage(childId) {
    return request<MypageSnapshot>(
      `/mypage?${new URLSearchParams({ childId }).toString()}`
    );
  },
};
