/**
 * Toast — docs/spec/screens.md §1-6
 * 사용처: 단어 저장("단어장에 담았어요!"), 아이 3명 초과, I-4 권한 재확인 실패
 *
 * useToast()로 띄우고 ToastHost를 레이아웃에 한 번 둔다.
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastItem = { id: number; message: string; tone: "default" | "danger" };

type ToastContextValue = {
  show: (message: string, tone?: ToastItem["tone"]) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastHost({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback(
    (message: string, tone: ToastItem["tone"] = "default") => {
      // Date.now()는 동시 호출 시 충돌할 수 있어 카운터를 쓴다.
      setItems((prev) => {
        const id = (prev.at(-1)?.id ?? 0) + 1;
        setTimeout(() => {
          setItems((cur) => cur.filter((item) => item.id !== id));
        }, 2600);
        return [...prev, { id, message, tone }];
      });
    },
    []
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-10 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={[
              "rounded-pill px-6 py-3 text-parent-body font-bold shadow-soft",
              item.tone === "danger"
                ? "bg-danger text-white"
                : "bg-text text-white",
            ].join(" ")}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastHost>");
  return ctx;
}
