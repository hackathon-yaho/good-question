/**
 * CenteredShell — docs/spec/screens.md §1-1
 *
 * 적용: A, G, H 전체. 사이드바 없음, 중앙 정렬 컬럼, 1440×900 기준.
 *
 * B-3(이야기 상세)은 B 그룹이지만 이 셸을 쓰지 않는다.
 * 표지 45% + 정보 55% 좌우 스플릿 단독 레이아웃이다.
 */

import type { ReactNode } from "react";

/** 화면별 콘텐츠 폭 — screens.md에 명시된 값 */
const WIDTH = {
  narrow: "max-w-shell-narrow", // A-1 스플래시
  card: "max-w-shell-card", // A-3, A-4
  column: "max-w-shell-column", // H-1 ~ H-4
  wide: "max-w-shell-wide", // A-6, G-1
  full: "max-w-shell-full", // H-5
} as const;

type Props = {
  children: ReactNode;
  width?: keyof typeof WIDTH;
  /** 세로 중앙 정렬. 스플래시·로그인처럼 콘텐츠가 짧은 화면에 쓴다. */
  centerY?: boolean;
};

export function CenteredShell({
  children,
  width = "column",
  centerY = false,
}: Props) {
  return (
    <div
      className={[
        "flex min-h-dvh w-full justify-center bg-bg px-6",
        centerY ? "items-center py-6" : "items-start py-12",
      ].join(" ")}
    >
      <div className={["w-full", WIDTH[width]].join(" ")}>{children}</div>
    </div>
  );
}
