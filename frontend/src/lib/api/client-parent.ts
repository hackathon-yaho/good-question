/**
 * 실서버 클라이언트 — 보호자 화면(§10) · 아이 프로필 수정·삭제(§2.3·2.4)
 * 기준: backend/docs/api-spec.md
 *
 * ── 엔드포인트가 없는 것 3개 ────────────────────────────────────────
 * H-1 계정 정보 · H-3 공지사항 · H-7 회원 탈퇴는 **백엔드에 컨트롤러가 없다.**
 * 목에서는 화면이 그려지지만 실서버 모드에서는 채울 값이 없다.
 *
 * 여기서 목 데이터를 섞어 넣지 않는다. 실서버 모드에서 가짜 값을 보여 주면
 * "연동됐다"는 화면이 거짓이 된다. 대신
 *   - 계정 정보: `GET /auth/me`로 채울 수 있는 것만 채운다
 *   - 공지: 빈 목록. 화면이 "아직 공지가 없어요"를 보여준다
 *   - 탈퇴: 명시적으로 실패시킨다. 되돌릴 수 없는 동작을 조용히 성공시키면 안 된다
 */

import { ApiError } from "@/lib/api/errors";
import { request } from "@/lib/api/http";
import type { AuthMe } from "@/lib/api/auth";
import type {
  Child,
  NoticeItem,
  ParentAccount,
  ParentApi,
  ParentSummary,
  ReportDetail,
  ReportListResult,
} from "@/lib/api/types";

export const parentApiClient: ParentApi = {
  getSummary(childId) {
    return request<ParentSummary>(
      `/parent/summary?${new URLSearchParams({ childId }).toString()}`
    );
  },

  /**
   * 리포트 목록 — api-spec 10.2.
   *
   * 필터 기준이 "완료 여부"가 아니라 **"아이 발화가 1건이라도 있는지"** 라서
   * 진행 중·중단된 세션도 함께 온다. 상세는 완료된 세션에만 있으므로
   * G-1이 `status`로 열 수 있는 행을 가린다.
   */
  listReports(childId) {
    return request<ReportListResult>(
      `/parent/reports?${new URLSearchParams({ childId }).toString()}`
    );
  },

  /** 완료되지 않은 세션 id로 부르면 404다. G-1에서 그 행을 막아 두었다. */
  getReport(sessionId) {
    return request<ReportDetail>(`/parent/reports/${sessionId}`);
  },

  /**
   * H-1 계정 정보. **전용 엔드포인트가 없어 `/auth/me`로 대신한다.**
   *
   * `provider`는 응답에 없지만 MVP 소셜 로그인이 카카오 단독이라(PRD M-01) 상수로
   * 둔다 — 추측이 아니라 요건이다. `createdAt`은 어디서도 오지 않아 비워 둔다.
   */
  async getParent() {
    const me = await request<AuthMe>("/auth/me");
    const account: ParentAccount = {
      id: me.id,
      name: me.name,
      email: me.email,
      provider: "kakao",
    };
    return account;
  },

  updateChild(childId, body) {
    return request<Child>(`/children/${childId}`, { method: "PATCH", body });
  },

  /** 연관 데이터가 전부 캐스케이드 삭제된다. 되돌릴 수 없다. H-6이 확인을 받는다. */
  deleteChild(childId) {
    return request<void>(`/children/${childId}`, {
      method: "DELETE",
      expectEmpty: true,
    });
  },

  /** 엔드포인트 없음. 빈 목록을 준다 — 화면이 "아직 공지가 없어요"를 보여준다. */
  async listNotices() {
    const empty: NoticeItem[] = [];
    return empty;
  },

  /**
   * 엔드포인트 없음. **조용히 성공시키지 않는다.**
   * 탈퇴는 되돌릴 수 없어서, 실제로 지워지지 않았는데 지워진 것처럼 보이면
   * 보호자가 개인정보가 삭제됐다고 오해한다.
   */
  async withdraw() {
    throw new ApiError(
      "NOT_FOUND",
      "회원 탈퇴는 아직 준비되지 않았어요. 고객센터로 문의해 주세요."
    );
  },
};
