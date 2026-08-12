/**
 * 인증 — docs/request/frontend/kakao-login-flow.md (백엔드 D-18)
 *
 * ── 원안이 폐기됐다 ─────────────────────────────────────────────────
 * api.md 3.1의 `POST /api/auth/{provider}`(프론트가 카카오 SDK로 인가 코드를 받아
 * 백엔드에 전달)는 폐기됐다. 백엔드가 로그인 전 과정을 처리하는 **리다이렉트 방식**이다.
 *
 *   1. 프론트: window.location.href = loginStartUrl()
 *   2. 카카오: 로그인·동의 (프론트는 관여하지 않음)
 *   3. 백엔드: JWT를 HttpOnly 쿠키로 설정
 *   4. 백엔드: 302 → {프론트}/auth/callback?hasCompletedOnboarding=false
 *
 * **카카오 SDK를 쓰지 않는다.** 프론트가 만드는 것은 URL 이동 한 곳과 콜백 페이지 하나다.
 * **토큰을 직접 다루지 않는다.** HttpOnly라 JS에서 읽을 수 없고, 읽을 필요도 없다.
 */

import { ApiError } from "@/lib/api/errors";
import { API_BASE, AUTH_MODE, request } from "@/lib/api/http";

/** GET /api/auth/me */
export type AuthMe = {
  id: string;
  name: string;
  /** 카카오 이메일 동의가 선택이라 null일 수 있다. 서비스 이용에 영향 없다. */
  email: string | null;
  /** false → /onboarding/consent, true → /profiles */
  hasCompletedOnboarding: boolean;
};

export type AuthApi = {
  /** 로그인 여부 확인. 인증 안 되면 ApiError("UNAUTHORIZED") */
  me(): Promise<AuthMe>;
  logout(): Promise<void>;
  /** 카카오 앱 등록 전 개발용. 시연 배포 전 백엔드에서 제거된다. */
  devLogin(): Promise<void>;
};

/**
 * 로그인 시작 URL. **fetch가 아니라 `window.location.href`로 이동한다.**
 * 카카오 동의 화면으로 넘어가야 하므로 XHR로는 동작하지 않는다.
 */
export function loginStartUrl(): string {
  return `${API_BASE}/oauth2/authorization/kakao`;
}

/* ── 백엔드 연동 ──────────────────────────────────────────────────── */

const backendAuthApi: AuthApi = {
  me() {
    return request<AuthMe>("/auth/me");
  },
  logout() {
    return request<void>("/auth/logout", { method: "POST", expectEmpty: true });
  },
  devLogin() {
    return request<void>("/auth/dev-login", {
      method: "POST",
      expectEmpty: true,
    });
  },
};

/* ── 목 ───────────────────────────────────────────────────────────── */

/**
 * 목에서 "로그인됨"을 나타내는 표시.
 *
 * 백엔드 모드에서는 쿠키가 그 역할을 하므로 프론트가 아무것도 저장하지 않는다.
 * 이 키는 **목 전용**이고, 검증 스위트가 이미 이 값을 심어 로그인 상태를 만든다.
 * 키를 바꾸면 스위트 10개가 전부 깨지므로 그대로 둔다.
 */
const MOCK_SESSION_KEY = "gq.accessToken";

function mockSignedIn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MOCK_SESSION_KEY) !== null;
  } catch {
    return false;
  }
}

function mockSetSignedIn(on: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (on) window.localStorage.setItem(MOCK_SESSION_KEY, "mock.kakao");
    else window.localStorage.removeItem(MOCK_SESSION_KEY);
  } catch {
    // 무시
  }
}

/** 목에서 온보딩 완료 여부는 등록된 아이 수로 판단한다. 백엔드도 같은 기준이다. */
function mockHasChildren(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem("gq.mock.account");
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { children?: unknown[] };
    return (parsed.children?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

const mockAuthApi: AuthApi = {
  async me() {
    await new Promise((resolve) => setTimeout(resolve, 120));
    if (!mockSignedIn()) throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다");
    return {
      id: "p_mock_0001",
      name: "보호자",
      email: "parent@example.com",
      hasCompletedOnboarding: mockHasChildren(),
    };
  },
  async logout() {
    await new Promise((resolve) => setTimeout(resolve, 80));
    mockSetSignedIn(false);
  },
  async devLogin() {
    await new Promise((resolve) => setTimeout(resolve, 120));
    mockSetSignedIn(true);
  },
};

export const authApi: AuthApi =
  AUTH_MODE === "backend" ? backendAuthApi : mockAuthApi;

/**
 * 목 모드에서 로그인 버튼이 하는 일.
 *
 * 백엔드가 없으니 카카오로 갈 수 없다. 대신 **백엔드가 만들 콜백 URL과 똑같은 주소로
 * 이동**해서 콜백 페이지의 분기 로직을 실제로 태운다. 목이라고 다른 길을 타면
 * 정작 백엔드를 붙일 때 처음 실행되는 코드가 생긴다.
 */
export function mockLoginRedirectPath(): string {
  mockSetSignedIn(true);
  return `/auth/callback?hasCompletedOnboarding=${mockHasChildren()}`;
}

/** 데모 초기화용 — 목 로그인 상태를 지운다. */
export function clearMockSession() {
  mockSetSignedIn(false);
}
