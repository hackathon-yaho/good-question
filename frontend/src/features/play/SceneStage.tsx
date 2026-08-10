/**
 * 좌측 영역 — docs/spec/screens.md C-2, C-3, C-4
 *
 * 장면 일러스트 + 자막 밴드 + 장면 진행바.
 * 일러스트는 아직 미수령이라 규격(768×800)에 맞춘 플레이스홀더를 그린다.
 * (assets.md §2-1, §3-1) 파일이 도착하면 backgroundImageUrl만 채우면 된다.
 */

import type { ReactNode } from "react";

type Props = {
  /** 좌측 상단 진행바 — 화면 단위 4구간 (Q-10) */
  progress?: { current: number; total: number };
  sceneLabel?: string;
  /** "이야기 듣는 중" 같은 상태 칩 */
  chip?: string;
  backgroundImageUrl?: string | null;
  /** 하단 자막. 한 문장만 넣는다. */
  subtitle?: string;
  /** CHILD_TURN에서 시선을 우측으로 보내기 위해 어둡게 한다. */
  dimmed?: boolean;
  /** GUIDED에서 색감을 따뜻하게 보정한다. (C-7) */
  warm?: boolean;
  children?: ReactNode;
};

export function SceneStage({
  progress,
  sceneLabel,
  chip,
  backgroundImageUrl,
  subtitle,
  dimmed = false,
  warm = false,
  children,
}: Props) {
  return (
    <div className="relative size-full overflow-hidden bg-primary-soft">
      {backgroundImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- 이미지 도메인 미확정
        <img
          src={backgroundImageUrl}
          alt=""
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center">
          <p className="text-kid-body font-bold text-muted">
            장면 이미지 준비 중
          </p>
        </div>
      )}

      {/* 밝기·색감 보정 레이어 */}
      <div
        aria-hidden
        className={[
          "pointer-events-none absolute inset-0 transition-all duration-500",
          dimmed ? "bg-text/30" : "bg-text/15",
          warm ? "bg-accent/10" : "",
        ].join(" ")}
      />

      <div className="absolute top-6 left-6 flex items-center gap-3">
        {progress ? (
          <div className="flex items-center gap-2">
            {Array.from({ length: progress.total }, (_, i) => (
              <span
                key={i}
                className={[
                  "h-2 w-10 rounded-pill transition-colors",
                  i < progress.current ? "bg-primary" : "bg-surface/70",
                ].join(" ")}
              />
            ))}
          </div>
        ) : null}

        {sceneLabel ? (
          <span className="rounded-pill bg-surface/90 px-3 py-1 text-sm font-bold text-text">
            {sceneLabel}
          </span>
        ) : null}

        {chip ? (
          <span className="rounded-pill bg-info px-3 py-1 text-sm font-bold text-white">
            {chip}
          </span>
        ) : null}
      </div>

      {subtitle ? (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-text/85 to-transparent px-10 pt-24 pb-12">
          <p className="mx-auto max-w-[22ch] text-center text-narration leading-relaxed font-medium text-white">
            {subtitle}
          </p>
        </div>
      ) : null}

      {children}
    </div>
  );
}
