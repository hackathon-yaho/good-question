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
  /** 400 — 필수 파라미터 누락·형식 오류 */
  | "INVALID_REQUEST"
  /**
   * 403 — 다른 보호자의 아이·세션에 접근
   *
   * 정상 흐름에서는 나오지 않아야 한다. 나오면 버그다.
   * (backend/docs/api-spec.md 0.5)
   */
  | "FORBIDDEN"
  /** 404 — 삭제됐거나 잘못된 id. 목록으로 되돌린다 */
  | "NOT_FOUND"
  /**
   * 409 — 이미 지나간 장면을 다시 넘기려 했다
   *
   * 대화 장면이 끝나면 **서버가 알아서 다음 장면으로 옮긴다.** 그 뒤에 프론트가
   * `.../complete`를 부르면 이 코드가 온다. 화면을 다시 불러오면 해소된다.
   */
  | "SCENE_ALREADY_CLOSED"
  /**
   * 422 — 빈 발화를 보냈다
   *
   * 애초에 부르지 않는 것이 정상 흐름이다. STT 결과가 비면 I-2로 간다. (PRD 8.9)
   * 이 코드를 받았다면 프론트에 빈 발화가 새는 경로가 있다는 뜻이다.
   */
  | "STT_EMPTY"
  /** 500 */
  | "INTERNAL_ERROR"
  /** 오프라인·5xx — I-3 전체화면으로 올린다 */
  | "NETWORK"
  /** POST /children/{id}/avatar-purchases — 별가루 잔액이 가격보다 적다 */
  | "INSUFFICIENT_STAR_DUST"
  /**
   * 구간 예산을 넘겼다 — 변환 8초 / 응답 10초
   * (docs/request/frontend/stt-tts-integration.md)
   *
   * NETWORK과 화면 처리는 같지만(I-3) 원인이 다르다. 배포 후 실측해서
   * 예산을 다시 정할 때 이 구분이 있어야 어느 구간이 늦는지 안다. (Q-14)
   */
  | "TIMEOUT"
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
