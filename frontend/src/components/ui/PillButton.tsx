/**
 * PillButton — docs/spec/screens.md §1-6
 *
 * 클릭 타겟 최소 크기 (§1-4):
 *   size="kid" → 72×72px 이상. C·D 화면 전용
 *   size="md"  → 44px 이상. 그 외 전체
 */

"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "outlined" | "danger";
type Size = "md" | "kid" | "kid-lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-primary text-white hover:brightness-105 active:brightness-95",
  outlined:
    "border-2 border-border bg-surface text-text hover:bg-primary-soft",
  danger: "bg-danger text-white hover:brightness-105",
};

const SIZE: Record<Size, string> = {
  md: "min-h-touch px-6 text-parent-body font-bold",
  // 아이 화면 버튼 24~26px / 700 (§1-3)
  kid: "min-h-touch-kid px-8 text-kid-button font-bold",
  // C-1 "다음" h64, D-1 "시작하기" h76 처럼 더 큰 CTA
  "kid-lg": "min-h-cta-lg px-12 text-kid-button font-bold",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** 아이콘 등 텍스트 앞에 붙일 요소 */
  leading?: ReactNode;
  fullWidth?: boolean;
};

export function PillButton({
  variant = "primary",
  size = "md",
  leading,
  fullWidth = false,
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-pill transition-all",
        "disabled:bg-border disabled:text-muted disabled:brightness-100",
        VARIANT[variant],
        SIZE[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
    >
      {leading}
      {children}
    </button>
  );
}
