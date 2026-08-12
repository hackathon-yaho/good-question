/**
 * "이 브라우저가 지원하는가"를 렌더 중에 안전하게 읽는다.
 *
 * `typeof window !== "undefined"`를 렌더 본문에서 그냥 쓰면 서버는 false,
 * 클라이언트 첫 렌더는 true가 되어 하이드레이션이 어긋난다.
 * useSyncExternalStore는 서버 스냅샷과 클라이언트 스냅샷을 나눠 주므로 안전하다.
 *
 * 지원 여부는 세션 중에 바뀌지 않으므로 구독할 것이 없다.
 */

"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};
const serverSnapshot = () => false;

export function useBrowserCapability(check: () => boolean): boolean {
  return useSyncExternalStore(noopSubscribe, check, serverSnapshot);
}
