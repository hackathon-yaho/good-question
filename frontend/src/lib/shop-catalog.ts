/**
 * 아바타 상점 카탈로그 — 무료 6종 이후에 별가루로 구매하는 아바타 목록.
 * 실제 일러스트가 없으면 ChildAvatar가 이니셜+색상 폴백으로 보여준다.
 */

export type ShopAvatar = { id: string; label: string; price: number };

export const SHOP_AVATARS: ShopAvatar[] = [
  { id: "shop1", label: "판다", price: 150 },
  { id: "shop2", label: "사자", price: 200 },
  { id: "shop3", label: "부엉이", price: 250 },
  { id: "shop4", label: "알파카", price: 300 },
];
