/**
 * SlideSheet — docs/spec/screens.md §1-6
 * 사용처: C-8 힌트 시트 (폭 44%, 전체 높이)
 *
 * 닫으면 진행 상태를 유지한 채 원래 상태로 복귀한다. 상태를 리셋하지 않는다.
 */

"use client";

import { useEffect, type ReactNode } from "react";
import { rem } from "@/lib/rem";

type Props = {
  open: boolean;
  onClose: () => void;
  /** 시트 폭. 퍼센트 문자열 또는 px 숫자 */
  width?: string | number;
  title?: string;
  children: ReactNode;
};

export function SlideSheet({
  open,
  onClose,
  width = "44%",
  title,
  children,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-label={title}>
      <div aria-hidden onClick={onClose} className="absolute inset-0 bg-text/35" />
      <aside
        style={{ width: typeof width === "number" ? rem(width) : width }}
        className="absolute inset-y-0 right-0 flex flex-col overflow-y-auto bg-surface px-8 py-8 shadow-soft"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          {title ? (
            <h2 className="text-kid-button font-bold text-text">{title}</h2>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            aria-label="닫기"
            className="flex size-touch-kid shrink-0 items-center justify-center rounded-pill text-2xl text-muted hover:bg-primary-soft"
          >
            ✕
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}
