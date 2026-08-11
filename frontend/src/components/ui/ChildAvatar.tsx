/**
 * ChildAvatar — docs/spec/screens.md §1-6
 * 사용처: A-4 캐릭터 선택, A-5 프로필 선택, F-1 헤더, H-2 목록
 *
 * 아바타 일러스트 6종은 아직 없고 제작 주체도 미정이다.
 * (docs/open-questions.md Q-20) 그래서 지금은 이름 첫 글자 + 색상 6종으로 그린다.
 * (assets.md §3-3) avatarId에 색상 키를 저장해 두면 나중에 일러스트로 교체할 때
 * 매핑만 바꾸면 된다.
 */

import { rem } from "@/lib/rem";

/** avatarId 허용 값. A-4 그리드가 이 순서로 6종을 보여준다. */
export const AVATAR_IDS = [
  "color1",
  "color2",
  "color3",
  "color4",
  "color5",
  "color6",
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

const PALETTE: Record<AvatarId, string> = {
  color1: "bg-primary text-white",
  color2: "bg-secondary text-white",
  color3: "bg-info text-white",
  color4: "bg-accent text-text",
  color5: "bg-primary-soft text-text",
  color6: "bg-secondary-soft text-text",
};

type Props = {
  name: string;
  avatarId?: string | null;
  /** 지름. screens.md 설계 px (F-1 120, H-2 56). 내부에서 rem으로 변환한다. */
  size?: number;
  /** 선택 링 표시 — A-4, A-5 */
  selected?: boolean;
};

export function ChildAvatar({
  name,
  avatarId,
  size = 96,
  selected = false,
}: Props) {
  const key = (AVATAR_IDS as readonly string[]).includes(avatarId ?? "")
    ? (avatarId as AvatarId)
    : "color1";

  return (
    <span
      style={{ width: rem(size), height: rem(size), fontSize: rem(size * 0.42) }}
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold select-none",
        PALETTE[key],
        selected ? "ring-4 ring-primary ring-offset-2 ring-offset-bg" : "",
      ].join(" ")}
      aria-hidden
    >
      {name.trim().charAt(0) || "?"}
    </span>
  );
}
