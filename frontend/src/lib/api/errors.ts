/**
 * 서버 에러 코드 — docs/spec/api.md
 *
 * 화면이 분기해야 하는 에러는 문구가 아니라 **코드**로 판단한다.
 * 메시지 문자열을 비교하면 서버가 문구만 고쳐도 화면이 깨진다.
 */

export type ApiErrorCode =
  /** A-4 — 아이는 최대 3명 (PRD I-09) */
  | "CHILD_LIMIT_EXCEEDED"
  /** POST /api/sessions — 동의 없는 아이는 세션을 시작할 수 없다 */
  | "CONSENT_REQUIRED"
  | "UNAUTHORIZED"
  | "UNKNOWN";

export class ApiError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message?: string) {
    super(message ?? code);
    this.name = "ApiError";
    this.code = code;
  }
}

export function errorCodeOf(error: unknown): ApiErrorCode {
  return error instanceof ApiError ? error.code : "UNKNOWN";
}
