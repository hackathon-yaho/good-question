/**
 * I-3 네트워크 오류 — docs/spec/screens.md §I
 *
 * 형태: 전체화면 · 전역. 레이아웃에 한 번 두고 `useNetworkError()`로 띄운다.
 *
 * 발생 조건 (명세): API 타임아웃(15초) / 네트워크 오프라인 / 5xx 응답
 *   - 오프라인은 `offline` 이벤트로 **자동** 감지한다
 *   - 타임아웃·5xx는 호출부가 `show({ retry })`로 올려보낸다
 *
 * ── 체크리스트 "저장했어요가 사실인지" ──────────────────────────────
 * 문구를 지키는 대신 **재시도가 실패한 요청을 그대로 다시 보내게** 했다.
 * retry를 받아 두고 그것만 다시 실행하므로 아이가 한 말이 사라지지 않는다.
 * retry가 없으면(오프라인 자동 감지 등) "다시 시도하기"는 화면만 닫는다.
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { PillButton } from "@/components/ui/PillButton";
import { rem } from "@/lib/rem";

type Pending = { retry?: () => void | Promise<void> };

type NetworkErrorContextValue = {
  /** I-3을 띄운다. retry를 주면 "다시 시도하기"가 그 요청을 다시 보낸다. */
  show: (pending?: Pending) => void;
  hide: () => void;
};

const NetworkErrorContext = createContext<NetworkErrorContextValue | null>(null);

/** API 응답 제한 시간 — 명세 I-3 발생 조건 */
export const API_TIMEOUT_MS = 15_000;

export function NetworkErrorHost({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);

  const show = useCallback((next?: Pending) => setPending(next ?? {}), []);
  const hide = useCallback(() => setPending(null), []);

  // 오프라인은 브라우저가 알려준다. 요청이 실패할 때까지 기다릴 이유가 없다.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOffline = () => setPending((prev) => prev ?? {});
    const onOnline = () => setPending((prev) => (prev?.retry ? prev : null));
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const value = useMemo(() => ({ show, hide }), [hide, show]);

  const retry = useCallback(() => {
    const run = pending?.retry;
    setPending(null);
    void run?.();
  }, [pending]);

  return (
    <NetworkErrorContext.Provider value={value}>
      {children}

      {pending ? (
        <div
          role="alertdialog"
          aria-label="네트워크 오류"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-bg px-6 py-10"
        >
          <div className="flex w-full max-w-shell-card flex-col items-center gap-6 text-center">
            {/* 일러스트 200px 미수령 (assets.md §3-1) */}
            <div
              aria-hidden
              style={{ width: rem(200), height: rem(200) }}
              className="flex items-center justify-center rounded-bubble bg-primary-soft text-7xl"
            >
              📞
            </div>

            <h1 className="text-headline font-bold text-text">
              잠깐 연결이 끊겼어요
            </h1>

            <p className="text-kid-body leading-relaxed text-text">
              지금까지 한 이야기는 저장했어요.
              <br />
              인터넷을 확인하고 다시 해볼까?
            </p>

            <PillButton size="kid" fullWidth onClick={retry}>
              다시 시도하기
            </PillButton>

            <PillButton
              variant="outlined"
              fullWidth
              onClick={() => {
                hide();
                router.push("/home");
              }}
            >
              홈으로 가기
            </PillButton>
          </div>
        </div>
      ) : null}
    </NetworkErrorContext.Provider>
  );
}

export function useNetworkError(): NetworkErrorContextValue {
  const ctx = useContext(NetworkErrorContext);
  if (!ctx) throw new Error("useNetworkError must be used inside <NetworkErrorHost>");
  return ctx;
}

/**
 * 15초 안에 안 오면 타임아웃으로 본다.
 *
 * ⚠️ 원래 요청을 취소하지는 않는다. 목 서버에는 취소가 없고, 실제 fetch로 바뀌면
 *    AbortController를 함께 넘기도록 고칠 자리다.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number = API_TIMEOUT_MS
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`요청이 ${ms}ms 안에 끝나지 않았습니다`)),
      ms
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
