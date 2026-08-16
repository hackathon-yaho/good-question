/**
 * 목 카탈로그 — 재생 없는 이야기 3편
 *
 * ── 왜 있나 ──────────────────────────────────────────────────────────
 * 목에 완성된 이야기는 `방귀 뀌는 며느리` 1편뿐이다. 그래서 이야기가 여러 편일 때의
 * 화면을 **아예 볼 수 없었다.**
 *
 *   B-1 추천 (계획 D3a)
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
 *    백엔드가 보내지 않으면 전부 재생 가능으로 취급된다. 실제 서비스에서 이
 *    이야기들을 보여주려면 `docs/request/backend/catalog-only-stories.md`대로
 *    백엔드가 이야기 자체와 `comingSoon` 필드를 내려줘야 한다.
 *
 * ⚠️ 세 편(해님과 달님·콩쥐와 팥쥐·흥부와 놀부) 모두 2026-08-16 AI 파트가 표지·
 *    캐릭터 일러스트를 실제로 넘겨줘서 story-images.ts에 연결했다
 *    (`public/story-assets/generated/folktales-v1/`). 에셋이 없던 플레이스홀더
 *    `story_horangi`(호랑이와 하나)는 2026-08-16 팀 결정으로 지웠다 — 필요 없다고
 *    판단.
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
  {
    id: "story_kongjwi",
    title: "콩쥐와 팥쥐",
    summary: "새어머니와 팥쥐에게 구박받던 콩쥐가 마음씨 고운 태도로 어려움을 이겨내는 이야기",
    coverImageUrl: null,
    estimatedMinutes: 20,
    difficulty: "보통",
    topics: ["성실함", "친절"],
    intro:
      "콩쥐는 새어머니와 팥쥐로부터 궂은 일을 도맡아 하라는 말을 들었습니다. 밑 빠진 항아리에 물을 채우라는 어려운 심부름까지 떨어졌습니다.",
    situation: "밑 빠진 항아리에 물을 채워야 하는 콩쥐가 방법을 몰라 난감해해요.",
    childRole: "콩쥐가 포기하지 않고 지혜롭게 방법을 찾도록 도와주세요.",
    characters: [
      { name: "kongjwi", displayName: "콩쥐" },
      { name: "patjwi", displayName: "팥쥐" },
    ],
  },
  {
    id: "story_heungbu",
    title: "흥부와 놀부",
    summary: "다친 제비를 정성껏 돌본 흥부가 착한 마음 덕분에 복을 받는 이야기",
    coverImageUrl: null,
    estimatedMinutes: 20,
    difficulty: "보통",
    topics: ["나눔", "정직"],
    intro:
      "흥부는 마당에서 다리를 다친 제비 한 마리를 발견했습니다. 형 놀부라면 그냥 지나쳤겠지만, 흥부는 제비를 그냥 둘 수 없었습니다.",
    situation: "다친 제비를 발견한 흥부가 어떻게 도와줄지 고민해요.",
    childRole: "흥부가 제비를 정성껏 돌보도록 도와주세요.",
    characters: [
      { name: "heungbu", displayName: "흥부" },
      { name: "nolbu", displayName: "놀부" },
    ],
  },
];

export const CATALOG_IDS = new Set(CATALOG_STORIES.map((s) => s.id));

export function findCatalogStory(storyId: string): CatalogStory | null {
  return CATALOG_STORIES.find((s) => s.id === storyId) ?? null;
}
