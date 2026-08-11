/**
 * PillButton — docs/spec/screens.md §1-6
 *
 * 클릭 타겟 최소 크기 (§1-4):
 *   size="kid" → 72×72px 이상. C·D 화면 전용
 *   size="md"  → 44px 이상. 그 외 전체
 *
 * ── 좌우 패딩을 줄인 이유 ───────────────────────────────────────────
 * C-5의 "다시 말하기"가 태블릿에서 2줄로 깨졌다. 원인은 폰트가 아니라 패딩이었다.
 * 그 버튼은 우측 패널(화면의 40%)의 40%를 쓰는데(명세 C-5가 정한 비율),
 * 1133×744에서 글자 105px + 좌우 패딩 57px = 161px 이 박스 160px을 **1px** 넘겼다.
 * 설계 기준 1280×800에서도 182px vs 181px로 똑같이 넘쳤다.
 *
 * 폰트를 줄이는 쪽은 택하지 않았다. 1133×744에서 아이 버튼은 이미 22.1px로
 * §1-3이 정한 24~26px보다 작다. 더 줄이면 명세에서 더 멀어진다.
 *
 * ── 줄바꿈을 금지한다 ───────────────────────────────────────────────
 * 아이 화면 버튼이 2줄이 되면 고장난 화면으로 보인다. `whitespace-nowrap`으로
 * 구조적으로 막고, 라벨이 길어져 넘치면 검증(scripts/verify/layout.mjs)이 잡는다.
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
  md: "min-h-touch px-5 text-parent-body font-bold",
  // 아이 화면 버튼 24~26px / 700 (§1-3)
  kid: "min-h-touch-kid px-6 text-kid-button font-bold",
  // C-1 "다음" h64, D-1 "시작하기" h76 처럼 더 큰 CTA
  "kid-lg": "min-h-cta-lg px-10 text-kid-button font-bold",
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
        // 버튼 라벨은 절대 두 줄이 되지 않는다. 위 주석 참조.
        "whitespace-nowrap",
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
