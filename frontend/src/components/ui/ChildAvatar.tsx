/**
 * ChildAvatar — docs/spec/screens.md §1-6
 * 사용처: A-4 캐릭터 선택, A-5 프로필 선택, F-1 헤더, H-2 목록
 *
 * ── avatarId는 `color1`~`color6`을 그대로 둔다 ──────────────────────
 * 일러스트를 받았지만 저장 값은 바꾸지 않는다. [assets.md §3-3](../../../docs/spec/assets.md)이
 * "색상 키를 저장해 두면 나중에 일러스트로 교체할 때 매핑만 바꾸면 된다"고 정해 둔 대로
 * **여기 매핑만 바꿨다.** 백엔드는 이 값을 검증하지 않고 그대로 저장·반환하므로
 * (backend/docs/api-spec.md 2.1) 이미 등록된 아이의 아바타가 깨지지 않는다.
 *
 * ── 투명 배경이 아니다 ──────────────────────────────────────────────
 * 원본이 크림색 수채 종이 위에 그려진 원이다. 배경을 빼면 질감이 사라지고 테두리만
 * 떠 보여서, **원형 마스크(`rounded-full`)만 씌우고 이미지는 그대로** 쓴다.
 *
 * 이미지를 못 불러오면 이전 방식(이니셜 + 색상 원)으로 돌아간다. 아이 화면에서
 * 빈 사각형이 보이는 것보다 낫다.
 */

"use client";

import { useState } from "react";

import { rem } from "@/lib/rem";
import { SHOP_AVATARS } from "@/lib/shop-catalog";

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

/**
 * 무료 6종 + 상점에서 구매하는 아바타 전체. 상점 아바타는 아직 일러스트가 없어
 * `AVATAR_IMAGE`가 존재하지 않는 경로를 가리키고, 아래 실패 폴백(이니셜+색상 원)이
 * 그대로 그려준다.
 */
export const ALL_AVATAR_IDS: readonly string[] = [
  ...AVATAR_IDS,
  ...SHOP_AVATARS.map((a) => a.id),
];

/**
 * 파일은 `public/avatars/`에 256×256 WebP로 있다.
 * 원본 1024px은 `public/characters/`에 두고 커밋하지 않는다.
 */
const AVATAR_IMAGE: Record<string, string> = {
  color1: "/avatars/chick.webp",
  color2: "/avatars/fox.webp",
  color3: "/avatars/bear.webp",
  color4: "/avatars/rabbit.webp",
  color5: "/avatars/turtle.webp",
  color6: "/avatars/cat.webp",
  // 상점 아바타 — 실제 일러스트가 준비되기 전까지는 존재하지 않는 경로를 가리켜
  // 아래 실패 폴백(이니셜+색상 원)으로 대체한다.
  ...Object.fromEntries(SHOP_AVATARS.map((a) => [a.id, `/avatars/${a.id}.webp`])),
};

/** 아이가 고를 때 읽어 줄 이름. 스크린리더와 A-4 라벨에 쓴다. */
export const AVATAR_LABEL: Record<string, string> = {
  color1: "병아리",
  color2: "여우",
  color3: "곰",
  color4: "토끼",
  color5: "거북이",
  color6: "고양이",
  ...Object.fromEntries(SHOP_AVATARS.map((a) => [a.id, a.label])),
};

const PALETTE_CYCLE = [
  "bg-primary text-white",
  "bg-secondary text-white",
  "bg-info text-white",
  "bg-accent text-text",
  "bg-primary-soft text-text",
  "bg-secondary-soft text-text",
];

/** 이미지 로드 실패 시 폴백 */
const PALETTE: Record<string, string> = {
  color1: PALETTE_CYCLE[0],
  color2: PALETTE_CYCLE[1],
  color3: PALETTE_CYCLE[2],
  color4: PALETTE_CYCLE[3],
  color5: PALETTE_CYCLE[4],
  color6: PALETTE_CYCLE[5],
  // 상점 아바타 — 실제 배색이 정해지기 전까지 6색을 순서대로 재사용한다.
  ...Object.fromEntries(
    SHOP_AVATARS.map((a, i) => [a.id, PALETTE_CYCLE[i % PALETTE_CYCLE.length]])
  ),
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
  const key = ALL_AVATAR_IDS.includes(avatarId ?? "") ? (avatarId as string) : "color1";

  /**
   * 실패 여부를 어떤 key에서 실패했는지로 기억한다 — 단순 boolean이면 아바타를
   * 바꿔도(같은 컴포넌트 인스턴스가 재사용되므로) 이전 실패가 그대로 남아
   * 배경색만 바뀌고 새 이미지는 영영 안 뜨는 버그가 생긴다.
   */
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const failed = failedKey === key;

  const frame = [
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold select-none",
    selected ? "ring-4 ring-primary ring-offset-2 ring-offset-bg" : "",
  ];

  if (failed) {
    return (
      <span
        style={{ width: rem(size), height: rem(size), fontSize: rem(size * 0.42) }}
        className={[...frame, PALETTE[key]].join(" ")}
        aria-hidden
      >
        {name.trim().charAt(0) || "?"}
      </span>
    );
  }

  return (
    <span
      style={{ width: rem(size), height: rem(size) }}
      className={[...frame, "bg-surface"].join(" ")}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- public 정적 파일. 도메인 최적화가 필요 없다 */}
      <img
        src={AVATAR_IMAGE[key]}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailedKey(key)}
        className="size-full object-cover"
      />
    </span>
  );
}
