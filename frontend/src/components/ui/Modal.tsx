/**
 * Modal — docs/spec/screens.md §1-6
 * 사용처: B-4, C-9, C-10, C-11, C-13, D-3, H-6, H-7, I-1
 *
 * dismissible={false} 인 경우:
 *   - 바깥 클릭·ESC로 닫히지 않는다
 *   - B-4(이어하기 확인)와 I-1(마이크 권한)이 선택을 강제해야 해서 필요하다
 */

"use client";

import { useEffect, type ReactNode } from "react";
import { rem } from "@/lib/rem";

type Props = {
  open: boolean;
  onClose?: () => void;
  /** 바깥 클릭·ESC로 닫히게 할지. 기본 true */
  dismissible?: boolean;
  /** 카드 폭. screens.md의 설계 px를 그대로 넣는다. 내부에서 rem으로 변환한다. */
  width?: number;
  children: ReactNode;
  /** 스크린리더용 제목 */
  label?: string;
};

export function Modal({
  open,
  onClose,
  dismissible = true,
  width = 560,
  children,
  label,
}: Props) {
  useEffect(() => {
    if (!open || !dismissible) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, dismissible, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
    >
      <div
        aria-hidden
        onClick={dismissible ? onClose : undefined}
        className="absolute inset-0 bg-text/45"
      />
      <div
        style={{ width: rem(width) }}
        className="relative max-h-[88dvh] w-full overflow-y-auto rounded-sheet bg-surface p-8 shadow-soft"
      >
        {children}
      </div>
    </div>
  );
}
