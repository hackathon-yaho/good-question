/**
 * matchMedia 구독 — SSR 안전
 *
 * useEffect + setState로 하면 React 19의 set-state-in-effect 규칙에 걸리고
 * 첫 렌더에서 값이 한 번 튄다. useSyncExternalStore가 이 용도로 만들어진 API다.
 */

"use client";

import { useCallback, useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined") return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    // 서버에서는 false. 세로 가드가 SSR에서 잘못 떠서 깜빡이는 것을 막는다.
    () => false
  );
}

/**
 * 이야기 진행 화면은 가로 전용이다.
 * screens.md가 "패드 전체 화면", "좌 60% / 우 40%"를 전제하므로 세로는 지원 대상이 아니다.
 */
export function useIsPortrait(): boolean {
  return useMediaQuery("(orientation: portrait)");
}
