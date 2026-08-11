/**
 * SidebarShell — docs/spec/screens.md §1-1
 *
 * 적용: B-1 홈, B-2 이야기 목록, E-1 단어장, F-1 마이페이지.
 * 좌측 고정 사이드바 240px + 메인 영역, 1440×900 기준.
 *
 * 하단 탭바가 아니라 좌측 사이드바다. (B-1 체크리스트)
 * 단어장은 선택 기능이지만 탭 자리는 필수다. (작업 분장 2.1)
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV = [
  { href: "/home", label: "홈" },
  { href: "/stories", label: "이야기" },
  { href: "/wordbook", label: "단어장" },
  { href: "/mypage", label: "마이페이지" },
] as const;

type Props = {
  children: ReactNode;
  /** 상단 우측 — 아바타 + 이름 등 */
  header?: ReactNode;
};

export function SidebarShell({ children, header }: Props) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh w-full bg-bg">
      <nav className="flex w-60 shrink-0 flex-col gap-2 border-r border-border bg-sidebar-bg px-4 py-8">
        <Link
          href="/home"
          className="mb-6 px-3 text-2xl font-bold text-primary"
        >
          굿퀘스천
        </Link>

        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "flex min-h-touch items-center rounded-pill px-4 text-lg font-bold transition-colors",
                active
                  ? "bg-primary text-white"
                  : "text-muted hover:bg-primary-soft hover:text-text",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        {header ? (
          <header className="flex items-center justify-end gap-4 px-10 pt-8">
            {header}
          </header>
        ) : null}
        <main className="min-w-0 flex-1 px-10 py-8">{children}</main>
      </div>
    </div>
  );
}
