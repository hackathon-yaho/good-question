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
  /** CHARACTER_SPEAKING — 테두리가 점등한다. 두께·번짐이 함께 커진다 (§1-5) */
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
      {/* ⚠️ `animate-ping` 후광을 쓰지 않는다. 160px 초상에서 bg-info/35는 거의
          안 보이고, 정지된 `ring-4`는 "말하고 있다"를 알리지 못한다.
          대신 테두리 자체를 맥동시킨다 — `.animate-speaking-ring` (globals.css) */}
      <span
        style={{ width: rem(size), height: rem(size), fontSize: rem(size * 0.36) }}
        className={[
          "relative z-10 inline-flex items-center justify-center rounded-full font-bold select-none",
          silhouette
            ? "bg-border text-muted grayscale"
            : "bg-secondary-soft text-text",
          speaking ? "animate-speaking-ring" : "",
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
