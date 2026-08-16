/**
 * 아바타 상점 카탈로그 — 무료 6종 이후에 별가루로 구매하는 아바타 목록.
 *
 * 일러스트는 `public/avatars/shop/<id>.webp`(256×256)에 실제로 있다
 * (2026-08-16, 실 에셋 수령). `id`가 곧 파일명이다 — `ChildAvatar.tsx`가
 * `/avatars/shop/${id}.webp`로 그대로 읽는다.
 */

export type ShopAvatar = { id: string; label: string; price: number };

export const SHOP_AVATARS: ShopAvatar[] = [
  { id: "wolf", label: "늑대", price: 150 },
  { id: "hamster", label: "햄스터", price: 175 },
  { id: "penguin", label: "펭귄", price: 200 },
  { id: "koala", label: "코알라", price: 225 },
  { id: "fox-forest", label: "숲여우", price: 250 },
  { id: "rabbit-fairy", label: "요정토끼", price: 275 },
  { id: "panda", label: "판다", price: 300 },
  { id: "cat-unicorn", label: "유니콘고양이", price: 325 },
  { id: "cat-angel", label: "천사고양이", price: 350 },
];
