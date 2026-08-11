/**
 * ImmersiveShell — docs/spec/screens.md §1-1
 *
 * 적용: C, D 전체. 1280×800 기준, 네비게이션 없음.
 *   variant="split" → 좌 60% / 우 40%  (C-2 ~ C-7)
 *   variant="full"  → 풀브리드          (C-1, D 전체)
 *
 * 이 셸은 /play, /activity 페이지에서 계속 마운트된 채로 내부 상태만 바뀐다.
 * 언마운트되면 TTS가 끊기고 애니메이션이 튄다. (§0-1)
 *
 * ── 스케일 ────────────────────────────────────────────────────────
 * <html>에 data-shell="immersive"를 걸어 루트 font-size를 뷰포트 비례로 바꾼다.
 * rem은 언제나 <html> 기준이라 이 컴포넌트에 font-size를 줘도 소용이 없다.
 * 계산식은 globals.css에 있다.
 */

"use client";

import { useEffect, type ReactNode } from "react";
import { useIsPortrait } from "@/lib/useMediaQuery";

type Props = {
  /** 좌 60% 영역. variant="split"에서만 쓴다. */
  left?: ReactNode;
  /** 우 40% 대화 패널. variant="split"에서만 쓴다. */
  right?: ReactNode;
  /** 풀브리드 콘텐츠. variant="full"에서만 쓴다. */
  children?: ReactNode;
  variant?: "split" | "full";
  /** 상단 우측 고정 영역 — 일시정지, 도움말 버튼 */
  topRight?: ReactNode;
  /** 오버레이 레이어 — 힌트 시트, 단어 팝업, 미션, 일시정지 */
  overlay?: ReactNode;
  /** CHILD_TURN 상태에서 화면 전체 테두리 glow를 켠다. (§1-5) */
  glowing?: boolean;
  /** C-13 글씨 크기 배수. 1 = 설계값 */
  fontScale?: number;
};

export function ImmersiveShell({
  left,
  right,
  children,
  variant = "split",
  topRight,
  overlay,
  glowing = false,
  fontScale = 1,
}: Props) {
  const portrait = useIsPortrait();

  // 루트 스케일 전환. 문서형 화면으로 나갈 때 반드시 되돌린다.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.shell = "immersive";
    return () => {
      delete root.dataset.shell;
      root.style.removeProperty("--kid-font-scale");
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--kid-font-scale",
      String(fontScale)
    );
  }, [fontScale]);

  // 세로 모드는 스케일링으로 풀리지 않는다. 60/40 분할 자체가 성립하지 않는다.
  if (portrait) {
    return <RotatePrompt />;
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg">
      {variant === "split" ? (
        <div className="flex h-full w-full">
          <section className="relative h-full w-[60%] shrink-0 overflow-hidden">
            {left}
          </section>
          <section className="relative flex h-full w-[40%] shrink-0 flex-col overflow-hidden border-l border-border bg-surface">
            {right}
          </section>
        </div>
      ) : (
        <div className="relative h-full w-full overflow-hidden">{children}</div>
      )}

      {topRight ? (
        <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
          {topRight}
        </div>
      ) : null}

      {/* glow는 클릭을 막지 않아야 한다. 마이크와 보내기 버튼이 그 아래에 있다. */}
      {glowing ? (
        <div
          aria-hidden
          className="turn-glow pointer-events-none absolute inset-0 z-30"
        />
      ) : null}

      {/* 래퍼로 감싸지 않는다. Modal·SlideSheet가 이미 fixed inset-0 z-50이다.
          여기서 `absolute inset-0`으로 감싸면, 내부가 null을 반환해도 래퍼가 남아
          화면 전체의 클릭을 삼킨다. */}
      {overlay}
    </div>
  );
}

/** 세로 모드 안내. 아이가 읽을 수 있게 크고 짧게. */
function RotatePrompt() {
  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-6 bg-bg px-10 text-center">
      <span aria-hidden className="text-[4rem]">
        📱
      </span>
      <p className="text-intro leading-tight font-bold text-primary">
        화면을 옆으로 돌려줘
      </p>
      <p className="text-kid-body text-muted">
        이야기는 넓은 화면에서 볼 수 있어요
      </p>
    </div>
  );
}
