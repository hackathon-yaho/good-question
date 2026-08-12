/**
 * 백엔드 HTTP 클라이언트 — docs/spec/api.md
 *
 * ⚠️ **모든 요청에 `credentials: "include"`가 필요하다.**
 * JWT가 HttpOnly 쿠키에 담겨 오므로 이게 빠지면 로그인 직후에도 401이 난다.
 * (docs/request/frontend/kakao-login-flow.md)
 *
 * 백엔드는 `context-path: /api`를 쓴다. 그래서 base에 `/api`가 포함된다.
 * 성공 응답은 래퍼 없이 데이터를 그대로 주고, 실패는 `{ code, message }`다. (api.md 2.3)
 */

import { ApiError, type ApiErrorCode } from "@/lib/api/errors";

/** 백엔드 오리진. 배포에서는 Render 주소로 바꾼다. */
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

/** context-path 포함 base */
export const API_BASE = `${BACKEND_URL}/api`;

/**
 * 인증을 백엔드로 붙일지, 목으로 둘지.
 *
 * 기본값이 `mock`인 이유: 백엔드가 아직 인증 외 엔드포인트를 만들지 않았고,
 * 검증 스위트(`npm run verify`)가 백엔드 없이 돌아야 한다.
 * 실제 백엔드를 띄운 뒤에는 `.env.local`에 `NEXT_PUBLIC_AUTH_MODE=backend`를 둔다.
 */
export const AUTH_MODE: "mock" | "backend" =
  process.env.NEXT_PUBLIC_AUTH_MODE === "backend" ? "backend" : "mock";

/** 백엔드가 준 에러 코드를 프론트 코드로 옮긴다. 모르는 값은 UNKNOWN. */
function toErrorCode(status: number, code?: string): ApiErrorCode {
  if (status === 401) return "UNAUTHORIZED";
  switch (code) {
    case "CHILD_LIMIT_EXCEEDED":
    case "CONSENT_REQUIRED":
    case "UNAUTHORIZED":
      return code;
    default:
      return "UNKNOWN";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** JSON 본문. FormData를 보낼 때는 `form`을 쓴다. */
  body?: unknown;
  form?: FormData;
  /**
   * 응답 본문을 쓰지 않는 엔드포인트 (예: POST /auth/logout).
   * 본문이 와도 읽지 않고 버린다 — `dev-login`은 `parentId`를 주지만 필요 없다.
   */
  expectEmpty?: boolean;
};

/**
 * 백엔드 호출. 실패는 전부 ApiError로 바꿔 던진다.
 *
 * 네트워크 자체가 끊긴 경우도 ApiError("NETWORK")로 올린다. 화면 쪽에서
 * I-3(네트워크 오류)으로 올릴지 조용히 넘길지 판단할 수 있어야 한다.
 */
export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, form, expectEmpty = false } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      // 쿠키 인증의 핵심. 빼면 401이 난다.
      credentials: "include",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError("NETWORK", "백엔드에 연결할 수 없습니다");
  }

  if (!response.ok) {
    let code: string | undefined;
    let message: string | undefined;
    try {
      const parsed = (await response.json()) as { code?: string; message?: string };
      code = parsed.code;
      message = parsed.message;
    } catch {
      // 본문이 JSON이 아닐 수 있다. 상태 코드만으로 판단한다.
    }
    throw new ApiError(toErrorCode(response.status, code), message);
  }

  if (expectEmpty) return undefined as T;

  // 204나 빈 본문이면 undefined를 준다.
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
