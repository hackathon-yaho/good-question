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
import { useCallback, useState, type ReactNode } from "react";

const NAV = [
  { href: "/home", label: "홈" },
  { href: "/stories", label: "이야기" },
  { href: "/wordbook", label: "단어장" },
  { href: "/mypage", label: "마이페이지" },
] as const;

/** 접힌 사이드바 메뉴 아이콘 — SVG 라인 아이콘 */
function NavIcon({ href, active }: { href: string; active: boolean }) {
  const c = active ? "text-primary" : "text-muted";
  const s = "w-6 h-6 shrink-0";
  switch (href) {
    case "/home":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`${s} ${c}`}>
          <path d="M3 12l9-9 9 9" />
          <path d="M5 10v9a1 1 0 001 1h3v-5h6v5h3a1 1 0 001-1v-9" />
        </svg>
      );
    case "/stories":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`${s} ${c}`}>
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          <path d="M8 7h8M8 11h6" />
        </svg>
      );
    case "/wordbook":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`${s} ${c}`}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="13" y2="17" />
        </svg>
      );
    case "/mypage":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`${s} ${c}`}>
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    default:
      return null;
  }
}

type Props = {
  children: ReactNode;
  /** 상단 우측 — 아바타 + 이름 등 */
  header?: ReactNode;
};


/** 모듈 레벨 상태 — 페이지 이동 시에도 사이드바 상태를 유지한다 */
let _sidebarCollapsed = false;

export function SidebarShell({ children, header }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(_sidebarCollapsed);
  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      _sidebarCollapsed = !prev;
      return !prev;
    });
  }, []);

  return (
    <div className="flex min-h-dvh w-full bg-bg">
      <nav
        className={[
          "flex shrink-0 flex-col gap-2 border-r border-border bg-sidebar-bg px-4 py-8 transition-all duration-200",
          collapsed ? "w-20" : "w-60",
        ].join(" ")}
      >
        {/* 토글 버튼 — 사각형 안의 선이 좌우로 움직인다 */}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "사이드바 열기" : "사이드바 닫기"}
          className={[
            "mb-4 flex items-center justify-center text-muted hover:text-text transition-colors",
            collapsed ? "self-center" : "self-end",
          ].join(" ")}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line
              x1={collapsed ? 15 : 9}
              y1="3"
              x2={collapsed ? 15 : 9}
              y2="21"
              className="transition-all duration-200"
            />
          </svg>
        </button>

        {/* 로고 — 접히면 숨김 */}
        <Link
          href="/home"
          aria-label="굿퀘스천 홈"
          className={collapsed ? "hidden" : "mb-6 block px-3"}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- public 정적 파일 */}
          <img
            src="/logo-wordmark.webp"
            alt="굿퀘스천"
            width={160}
            height={57}
            className="h-auto w-40"
          />
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
                collapsed ? "justify-center px-0" : "",
                active
                  ? collapsed
                    ? "text-primary"
                    : "bg-primary text-white"
                  : collapsed
                    ? "text-muted hover:text-primary"
                    : "text-muted hover:bg-primary-soft hover:text-text",
              ].join(" ")}
              title={collapsed ? item.label : undefined}
            >
              {collapsed ? (
                <NavIcon href={item.href} active={active} />
              ) : (
                item.label
              )}
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
