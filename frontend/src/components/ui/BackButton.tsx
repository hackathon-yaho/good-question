/**
 * BackButton — 뒤로 가기
 *
 * `← 보호자 홈` 같은 **텍스트 링크를 대체한다.** 같은 모양이 6곳에 흩어져 있어서
 * 한 곳만 고치면 화면마다 다르게 생기므로 컴포넌트로 뽑았다.
 *
 * 아이 화면(B-3)은 아이콘만 보여준다 — 글자를 읽기 전에 "돌아간다"가 전달되어야 한다.
 * 보호자 화면은 어디로 가는지가 중요해서 아이콘 + 텍스트를 함께 둔다.
 *
 * 접근성: 아이콘만 있는 경우에도 `aria-label`이 항상 붙는다. 클릭 타겟은
 * §1-4의 44px 하한(`min-h-touch`)을 지킨다.
 */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const ARROW = (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-6"
  >
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

type Props = {
  /** 있으면 링크, 없으면 브라우저 뒤로 가기 */
  href?: string;
  /** 함께 보여줄 문구. 생략하면 아이콘만 (B-3) */
  label?: string;
  /** 스크린리더용. label이 없을 때 필수적으로 쓰인다 */
  ariaLabel?: string;
  className?: string;
};

export function BackButton({
  href,
  label,
  ariaLabel = "돌아가기",
  className = "",
}: Props) {
  const router = useRouter();

  const shape = [
    "inline-flex min-h-touch items-center gap-1.5 rounded-pill text-parent-body font-bold text-text transition-colors",
    // 아이콘만일 때는 원형 버튼, 문구가 붙으면 알약 모양
    label ? "px-4 text-muted hover:text-text" : "size-11 justify-center",
    label ? "" : "border border-border bg-surface/90 shadow-soft hover:bg-primary-soft",
    className,
  ].join(" ");

  const inner = (
    <>
      {ARROW}
      {label ? <span>{label}</span> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} aria-label={label ? undefined : ariaLabel} className={shape}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label={label ? undefined : ariaLabel}
      className={shape}
    >
      {inner}
    </button>
  );
}
