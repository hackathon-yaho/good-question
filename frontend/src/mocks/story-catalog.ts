/**
 * 목 카탈로그 — 재생 없는 이야기 5편
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
 * ⚠️ `story_ori`·`story_yeowu`·`story_dokki` 3편은 **플레이스홀더 콘텐츠**다
 *    (2026-08-16 팀 결정 — 실제 제목·줄거리·에셋이 정해지기 전에 화면부터
 *    준비해 두기로 함). 잘 알려진 옛이야기로 자리만 채워 뒀으니, 실제 콘텐츠가
 *    정해지면 이 배열의 해당 항목만 교체하면 된다. 표지·캐릭터 이미지가 없어도
 *    `coverImageUrl: null` + 미매핑 캐릭터 이름이 각각 "표지 준비 중" 텍스트와
 *    이니셜 원으로 이미 자연스럽게 대체된다(story-images.ts).
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
  // ── 아래 3편은 플레이스홀더다. 위 파일 상단 주석 참조. ──────────────────
  {
    id: "story_ori",
    title: "미운 아기 오리",
    summary: "생김새가 다르다고 놀림받던 아기 오리가 자기다움을 찾아가는 이야기",
    coverImageUrl: null,
    estimatedMinutes: 20,
    difficulty: "보통",
    topics: ["다름", "자기이해"],
    intro:
      "연못가에서 태어난 아기 오리는 다른 형제들과 생김새가 많이 달랐습니다. 친구들은 아기 오리를 보고 자꾸만 이상하다고 놀렸습니다.",
    situation: "생김새가 다르다는 이유로 친구들에게 놀림받은 아기 오리가 속상해해요.",
    childRole: "아기 오리가 자기만의 좋은 점을 찾아가도록 도와주세요.",
    characters: [
      { name: "agi_ori", displayName: "아기 오리" },
      { name: "omma_ori", displayName: "엄마 오리" },
    ],
  },
  {
    id: "story_yeowu",
    title: "여우와 두루미",
    summary: "서로 다른 방식으로 대접하다 오해가 쌓인 여우와 두루미가 화해하는 이야기",
    coverImageUrl: null,
    estimatedMinutes: 20,
    difficulty: "보통",
    topics: ["배려", "입장 바꿔 생각하기"],
    intro:
      "여우는 두루미를 저녁 식사에 초대했습니다. 그런데 납작한 접시에 수프를 담아 내놓는 바람에 두루미는 하나도 먹지 못했습니다.",
    situation: "여우의 초대에서 서운했던 두루미가 여우에게 마음이 상했어요.",
    childRole: "여우와 두루미가 서로의 입장을 이해하고 화해하도록 도와주세요.",
    characters: [
      { name: "yeowu", displayName: "여우" },
      { name: "durumi", displayName: "두루미" },
    ],
  },
  {
    id: "story_dokki",
    title: "금도끼 은도끼",
    summary: "연못에 도끼를 빠뜨린 나무꾼이 정직하게 답해 산신령의 선물을 받는 이야기",
    coverImageUrl: null,
    estimatedMinutes: 20,
    difficulty: "보통",
    topics: ["정직"],
    intro:
      "나무를 하던 나무꾼이 그만 도끼를 연못에 빠뜨리고 말았습니다. 나무꾼이 울고 있자 연못에서 산신령이 나타났습니다.",
    situation: "도끼를 잃어버려 속상한 나무꾼 앞에 산신령이 나타나요.",
    childRole: "나무꾼이 정직하게 답할 수 있도록 도와주세요.",
    characters: [
      { name: "namukun", displayName: "나무꾼" },
      { name: "sansillyeong", displayName: "산신령" },
    ],
  },
];

export const CATALOG_IDS = new Set(CATALOG_STORIES.map((s) => s.id));

export function findCatalogStory(storyId: string): CatalogStory | null {
  return CATALOG_STORIES.find((s) => s.id === storyId) ?? null;
}
