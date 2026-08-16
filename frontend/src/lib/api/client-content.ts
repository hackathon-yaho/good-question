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
import { SHOP_AVATARS } from "@/lib/shop-catalog";

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

  /**
   * 아바타 상점 구매 — docs/request/backend/avatar-shop-purchase.md.
   * 장착은 바꾸지 않는다 — `price`를 함께 보낸다. 서버가 `avatarId`를 검증하지
   * 않는 것과 같은 이유로, 가격 검증도 서버 카탈로그가 아니라 프론트가 보낸
   * 값을 신뢰한다(테스트 단계 한정).
   */
  purchaseAvatar(childId, avatarId) {
    const price = SHOP_AVATARS.find((a) => a.id === avatarId)?.price ?? 0;
    return request<{ starDust: number; ownedAvatarIds: string[] }>(
      `/children/${childId}/avatar-purchases`,
      { method: "POST", body: { avatarId, price } }
    );
  },

  /**
   * F-1 아바타 변경 — 새 엔드포인트가 아니다. 아이 등록·H-2 인라인 편집과 같은
   * `PATCH /children/{childId}`를 그대로 쓴다 (api-spec 2.1, avatarId 미검증).
   */
  equipAvatar(childId, avatarId) {
    return request<{ avatarId: string }>(`/children/${childId}`, {
      method: "PATCH",
      body: { avatarId },
    });
  },
};
