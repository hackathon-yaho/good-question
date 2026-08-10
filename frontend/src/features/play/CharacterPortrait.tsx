/**
 * 캐릭터 초상 — docs/spec/screens.md C-3, C-4, C-6, C-12
 *
 * 크기: C-3 96px, C-12 120px, C-2 실루엣 140px, I-1 160px.
 * 이미지 미수령이라 이니셜 원형으로 대체한다. (assets.md §2-2, §3-1)
 * 규격이 320×320 정사각이므로 도착하면 img로 바꾸기만 하면 된다.
 */

import { rem } from "@/lib/rem";

type Props = {
  displayName: string;
  imageUrl?: string | null;
  /** screens.md의 설계 px. 내부에서 rem으로 바꿔 비례 스케일한다. */
  size?: number;
  /** CHARACTER_SPEAKING — 파란 링 맥동 (§1-5) */
  speaking?: boolean;
  /** C-2 대기 상태 — 그레이스케일 실루엣 */
  silhouette?: boolean;
  /** C-6 — 부드러운 호흡 glow */
  thinking?: boolean;
};

export function CharacterPortrait({
  displayName,
  imageUrl,
  size = 96,
  speaking = false,
  silhouette = false,
  thinking = false,
}: Props) {
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center">
      {speaking ? (
        <span
          aria-hidden
          style={{ width: rem(size * 1.22), height: rem(size * 1.22) }}
          className="absolute animate-ping rounded-full bg-info/35"
        />
      ) : null}

      <span
        style={{ width: rem(size), height: rem(size), fontSize: rem(size * 0.36) }}
        className={[
          "relative z-10 inline-flex items-center justify-center rounded-full font-bold select-none",
          silhouette
            ? "bg-border text-muted grayscale"
            : "bg-secondary-soft text-text",
          speaking ? "ring-4 ring-info" : "",
          thinking ? "animate-pulse" : "",
        ].join(" ")}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 이미지 도메인 미확정
          <img
            src={imageUrl}
            alt=""
            className="size-full rounded-full object-cover"
          />
        ) : (
          displayName.trim().charAt(0) || "?"
        )}
      </span>
    </span>
  );
}
