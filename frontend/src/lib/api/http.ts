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
 * 데이터·인증을 실서버로 붙일지, 목으로 둘지.
 *
 * ── 왜 인증과 데이터를 한 스위치로 묶는가 ───────────────────────────
 * 섞으면 반드시 깨진다. 목 데이터는 `c_mock_1` 같은 자체 childId를 쓰는데 실서버는
 * 그런 아이를 모른다(403/404). 반대로 목 인증 + 실 데이터는 쿠키가 없어 전부 401이다.
 * **둘은 함께 켜지고 함께 꺼져야 한다.**
 *
 * 음성(`NEXT_PUBLIC_SPEECH_MODE`)만 따로 둔다. 브라우저 TTS + 실 데이터는 실제로
 * 동작하는 조합이라 섞을 이유가 있다.
 *
 * 기본값이 `mock`인 이유: 검증 스위트(`npm run verify`)가 백엔드 없이 돌아야 한다.
 * 실서버를 띄운 뒤에는 `.env.local`에 `NEXT_PUBLIC_API_MODE=backend`를 둔다.
 */
const BUILD_API_MODE: "mock" | "backend" =
  process.env.NEXT_PUBLIC_API_MODE === "backend" ? "backend" : "mock";

/**
 * 개발 중에만 동작하는 런타임 전환 — `/home?api=backend`
 *
 * `NEXT_PUBLIC_*`은 번들에 박히므로 모드를 바꾸려면 dev 서버를 재시작해야 한다.
 * 실서버 경로를 손으로 확인할 때마다 재시작하는 것은 비싸고, 검증 스위트가 두 경로를
 * 한 서버에서 확인할 방법도 필요하다. (`speech/mode.ts`와 같은 장치다)
 *
 * 프로덕션 빌드에서는 `process.env.NODE_ENV` 비교가 상수로 접혀 이 분기가 사라진다.
 *
 * ⚠️ 모듈 평가 시점에 한 번만 읽는다. 클라이언트 라우팅으로 주소가 바뀌어도
 *    모드는 그대로다 — 데이터 계층이 이동 중에 갈리면 더 위험하다.
 */
function overrideFromUrl(): "mock" | "backend" | null {
  if (process.env.NODE_ENV !== "development") return null;
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("api");
  return value === "backend" || value === "mock" ? value : null;
}

export const API_MODE: "mock" | "backend" =
  overrideFromUrl() ?? BUILD_API_MODE;

/**
 * 백엔드가 준 에러 코드를 프론트 코드로 옮긴다.
 *
 * 백엔드가 쓰는 코드 9종은 그대로 통과시킨다
 * (backend/docs/api-spec.md 0.4 · `common/global/ErrorCode.java`).
 * 문구가 아니라 코드로 분기하기 때문에 이름이 같으면 그대로 쓰는 게 맞다.
 *
 * `INSUFFICIENT_STAR_DUST`는 그 9종에 없는 팀 추가 코드다 — 아바타 상점 구매
 * 요청(docs/request/backend/avatar-shop-purchase.md)에서 백엔드가 이 문자열을
 * 그대로 내려주기로 했으므로 여기도 허용 목록에 추가해 둔다. 안 넣으면
 * ShopScreen의 "별가루가 부족해요" 분기가 실서버에서는 절대 타지 않는다.
 */
const BACKEND_CODES = new Set<ApiErrorCode>([
  "INVALID_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "CONSENT_REQUIRED",
  "NOT_FOUND",
  "CHILD_LIMIT_EXCEEDED",
  "SCENE_ALREADY_CLOSED",
  "STT_EMPTY",
  "INTERNAL_ERROR",
  "INSUFFICIENT_STAR_DUST",
]);

function toErrorCode(status: number, code?: string): ApiErrorCode {
  if (code && BACKEND_CODES.has(code as ApiErrorCode)) {
    return code as ApiErrorCode;
  }
  // 본문이 JSON이 아니거나 모르는 코드다. 상태 코드로만 판단한다.
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  // 5xx는 재시도가 통할 수 있다. I-3으로 올린다.
  if (status >= 500) return "NETWORK";
  return "UNKNOWN";
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
