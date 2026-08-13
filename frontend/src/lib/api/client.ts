/**
 * 실서버 클라이언트 — 대화(§5·6) · 후속 활동(§8)
 * 기준: backend/docs/api-spec.md (구현된 코드 기준이라 docs/spec/api.md보다 최신)
 *
 * 목(`mock.ts`)과 같은 인터페이스(`PlayApi`·`ActivityApi`)를 구현한다. 화면 코드는
 * 어느 쪽이 주입됐는지 모른다. 판단·에러 매핑은 전부 `http.ts`가 맡는다.
 *
 * ⚠️ 여기에 **판단 로직을 넣지 않는다.** 진행 모드·정답 여부·재시도 한도는 서버가
 *    정한 값을 그대로 올려보내기만 한다. (screens.md §0-2)
 */

import { request } from "@/lib/api/http";
import type {
  ActivityApi,
  ActivitySnapshot,
  OrderResult,
  PlayApi,
  RetellingResult,
  SceneCompleteResponse,
  SessionSnapshot,
  UtteranceResponse,
} from "@/lib/api/types";

export const playApiClient: PlayApi = {
  /**
   * 세션 생성 / 이어하기 / 새로 시작 — api-spec 5.1
   *
   * `restart: false`면 진행 중 세션이 있어도 새로 만들지 않고 그걸 그대로 준다.
   * 같은 요청이 두 번 가도 세션이 둘 생기지 않는 안전장치다.
   * 동의 없는 아이면 403 `CONSENT_REQUIRED`가 온다 — B-3이 그 코드로 판단한다.
   */
  createSession(body) {
    return request<SessionSnapshot>("/sessions", { method: "POST", body });
  },

  getSession(sessionId) {
    return request<SessionSnapshot>(`/sessions/${sessionId}`);
  },

  /** 발화 제출 — api-spec 6.1. 빈 텍스트를 보내면 422다. 애초에 부르지 않는다. */
  submitUtterance(sessionId, body) {
    return request<UtteranceResponse>(`/sessions/${sessionId}/messages`, {
      method: "POST",
      body,
    });
  },

  /**
   * 장면 넘기기 — api-spec 5.3. **intro·narrative 전용이다.**
   * dialogue에 부르면 400이 온다. 호출부(`PlayScreen.advanceScene`)가 장면 유형을
   * 보고 이 요청을 건너뛴다.
   */
  completeScene(sessionId, sceneId) {
    return request<SceneCompleteResponse>(
      `/sessions/${sessionId}/scenes/${sceneId}/complete`,
      { method: "POST" }
    );
  },

  /** C-13 이야기 나가기. `status`는 `"stopped"` 고정이고 다른 값이면 400이다. */
  stopSession(sessionId) {
    return request<void>(`/sessions/${sessionId}`, {
      method: "PATCH",
      body: { status: "stopped" },
      expectEmpty: true,
    });
  },
};

export const activityApiClient: ActivityApi = {
  getActivity(sessionId) {
    return request<ActivitySnapshot>(`/sessions/${sessionId}/activity`);
  },

  /**
   * 순서 제출 — api-spec 8.2.
   *
   * 응답의 `correctOrder`·`retellingKeywords`는 **키 자체가 없을 수 있다.**
   * 여기서 기본값을 채워 넣지 않는다 — 채우면 "3회째인지"를 구분할 근거가 사라진다.
   */
  submitOrder(sessionId, submittedOrder) {
    return request<OrderResult>(`/sessions/${sessionId}/activity/order`, {
      method: "POST",
      body: { submittedOrder },
    });
  },

  /** 재구성 발화 제출 — 이 호출로 세션이 completed가 되고 리포트가 만들어진다. */
  submitRetelling(sessionId, body) {
    return request<RetellingResult>(`/sessions/${sessionId}/activity/retelling`, {
      method: "POST",
      body,
    });
  },
};
