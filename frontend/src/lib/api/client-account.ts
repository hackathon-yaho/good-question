/**
 * 실서버 클라이언트 — 아이 프로필(§2) · 홈(§3)
 * 기준: backend/docs/api-spec.md
 */

import { request } from "@/lib/api/http";
import type {
  AccountApi,
  Child,
  ChildListResult,
  HomeSnapshot,
} from "@/lib/api/types";

export const accountApiClient: AccountApi = {
  /** 아이 0명이어도 200 + 빈 배열. `limit`은 서버가 준다(프론트가 3을 박지 않는다). */
  listChildren() {
    return request<ChildListResult>("/children");
  },

  /**
   * 아이 등록 — api-spec 2.2. **동의를 같은 요청에 함께 보낸다.**
   * 별도 동의 API가 없다. 필수 3종 중 하나라도 false면 403 `CONSENT_REQUIRED`,
   * 이미 3명이면 409 `CHILD_LIMIT_EXCEEDED`.
   */
  createChild(body) {
    return request<Child>("/children", { method: "POST", body });
  },

  getHome(childId) {
    return request<HomeSnapshot>(
      `/home?${new URLSearchParams({ childId }).toString()}`
    );
  },
};
