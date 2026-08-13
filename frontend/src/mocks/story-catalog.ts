/**
 * 목 카탈로그 — 재생 없는 이야기 2편
 *
 * ── 왜 있나 ──────────────────────────────────────────────────────────
 * 목에 완성된 이야기는 `방귀 뀌는 며느리` 1편뿐이다. 그래서 이야기가 여러 편일 때의
 * 화면을 **아예 볼 수 없었다.**
 *
 *   B-1 추천 3개 (계획 D3a)
 *   B-2 목록의 태블릿 3열 (요구 4) — 카드가 1장이면 열 수를 확인할 방법이 없다
 *   B-2 주제 필터 — 주제가 1편 것뿐이면 걸러질 게 없다
 *
 * ── 어디까지 동작하나 ────────────────────────────────────────────────
 * B-1 추천 · B-2 목록 · B-3 상세까지 **정상 동작한다.** 재생만 막는다.
 *
 * 장면 데이터가 없으므로 `이야기 시작하기`를 살려두면 `/play`에서 깨진다.
 * 그래서 `comingSoon: true`를 실어 B-3이 버튼을 비활성으로 두게 한다.
 * "준비 중"은 거짓이 아니다 — 실제로 콘텐츠가 아직 없다.
 *
 * ⚠️ 실서버에는 이 파일이 관여하지 않는다. `comingSoon`은 **선택 필드**이므로
 *    백엔드가 보내지 않으면 전부 재생 가능으로 취급된다.
 */

export type CatalogStory = {
  id: string;
  title: string;
  summary: string;
  coverImageUrl: string | null;
  estimatedMinutes: number;
  difficulty: string;
  topics: readonly string[];
  /** B-3 도입 블록 */
  intro: string;
  situation: string;
  childRole: string;
  characters: readonly { name: string; displayName: string }[];
};

export const CATALOG_STORIES: readonly CatalogStory[] = [
  {
    id: "story_horangi",
    title: "호랑이와 하나",
    summary: "무서운 호랑이를 만난 하나가 꾀를 내어 위기를 넘기는 이야기",
    coverImageUrl: null,
    estimatedMinutes: 20,
    difficulty: "보통",
    topics: ["용기", "지혜"],
    intro:
      "깊은 산길을 혼자 걸어가던 하나 앞에 커다란 호랑이가 나타났습니다. 하나는 도망칠 수도, 소리칠 수도 없었습니다.",
    situation: "산길에서 호랑이와 마주친 하나가 도망칠 곳이 없어요.",
    childRole: "하나가 힘이 아니라 꾀로 위기를 넘기도록 도와주세요.",
    characters: [
      { name: "hana", displayName: "하나" },
      { name: "tiger", displayName: "호랑이" },
    ],
  },
  {
    id: "story_haenim",
    title: "해님과 달님",
    summary: "쫓기던 오누이가 서로를 지키며 해와 달이 되는 이야기",
    coverImageUrl: null,
    estimatedMinutes: 20,
    difficulty: "보통",
    topics: ["가족", "용기"],
    intro:
      "어머니를 기다리던 오누이는 문 밖에서 낯선 목소리를 들었습니다. 어머니의 목소리와 비슷했지만 어딘가 달랐습니다.",
    situation: "오누이가 어머니를 흉내 낸 목소리에 문을 열지 말지 고민해요.",
    childRole: "오누이가 서로를 지킬 방법을 찾도록 도와주세요.",
    characters: [
      { name: "sister", displayName: "누이" },
      { name: "brother", displayName: "오빠" },
    ],
  },
];

export const CATALOG_IDS = new Set(CATALOG_STORIES.map((s) => s.id));

export function findCatalogStory(storyId: string): CatalogStory | null {
  return CATALOG_STORIES.find((s) => s.id === storyId) ?? null;
}
