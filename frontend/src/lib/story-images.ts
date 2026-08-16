/**
 * 방귀쟁이 며느리 스토리 이미지 매핑
 * public/story-assets/banggui/ 디렉토리의 이미지들을 스토리 요소에 매핑
 */

/**
 * 장면 순서(sceneOrder)로 배경 이미지 URL을 찾는다.
 * 백엔드는 sceneId로 UUID를 사용하므로, 순서 기반 매핑이 더 안정적이다.
 *
 * @param sceneOrder 장면 순서 (1~9). 배경이 없는 장면(3,5,7,9)은 null 반환
 */
export function getSceneBackgroundImageByOrder(sceneOrder: number): string | null {
  const mapping: Record<number, string> = {
    1: "/story-assets/banggui/sc_banggui_01.webp",
    2: "/story-assets/banggui/sc_banggui_02.webp",
    4: "/story-assets/banggui/sc_banggui_04.webp",
    6: "/story-assets/banggui/sc_banggui_06.webp",
    8: "/story-assets/banggui/sc_banggui_08.webp",
  };
  return mapping[sceneOrder] ?? null;
}

/**
 * 활동 카드(장면1~4) 이미지. D-2 카드 순서 배열과 D-5 리텔링에서 사용한다.
 * 장면1=sc_02, 장면2=sc_04, 장면3=sc_06, 장면4=sc_08
 */
export const ACTIVITY_CARD_IMAGES = [
  "/story-assets/banggui/sc_banggui_02.webp",
  "/story-assets/banggui/sc_banggui_04.webp",
  "/story-assets/banggui/sc_banggui_06.webp",
  "/story-assets/banggui/sc_banggui_08.webp",
] as const;

/**
 * 활동 카드(card_1~card_4)의 ID를 장면 이미지 URL로 매핑한다.
 * card_1→장면1(sc_02), card_2→장면2(sc_04), card_3→장면3(sc_06), card_4→장면4(sc_08)
 */
export function getActivityCardImage(cardId: string): string {
  const match = /card_(\d+)/.exec(cardId);
  const index = match ? Number(match[1]) - 1 : 0;
  return ACTIVITY_CARD_IMAGES[Math.min(Math.max(index, 0), ACTIVITY_CARD_IMAGES.length - 1)];
}

/**
 * 캐릭터 이름과 감정을 캐릭터 이미지 URL로 매핑
 */
export function getCharacterImage(
  characterName: string,
  emotion: string = "NEUTRAL"
): string | null {
  /**
   * 파일이 있는 표정만 통과시킨다. 그 외에는 NEUTRAL로 떨어뜨린다 —
   * 서버가 새 값을 보내도 깨진 이미지가 뜨지 않는다. (api-spec 6.1 `characterState`)
   */
  const EMOTIONS = ["NEUTRAL", "HAPPY", "WORRIED", "SURPRISED", "MOVED"];
  const upper = emotion.toUpperCase();
  const emotionKey = EMOTIONS.includes(upper) ? upper : "NEUTRAL";

  const mapping: Record<string, string> = {
    "ch_banggui_daughter_in_law": `/story-assets/banggui/ch_banggui_daughter_in_law_${emotionKey}.png`,
    "ch_banggui_father_in_law": `/story-assets/banggui/ch_banggui_father_in_law_${emotionKey}.png`,
    "ch_banggui_village_chief": `/story-assets/banggui/ch_banggui_village_chief_${emotionKey}.png`,
    // 카탈로그 전용 편(story-catalog.ts) — 재생이 없어 표정 변형 없이 NEUTRAL
    // 한 장뿐이다. 2026-08-16 AI 파트 수령(generated/folktales-v1).
    sister: "/story-assets/generated/folktales-v1/ch-sun-moon-sister-neutral.png",
    brother: "/story-assets/generated/folktales-v1/ch-sun-moon-brother-neutral.png",
    kongjwi: "/story-assets/generated/folktales-v1/ch-kongjwi-neutral.png",
    patjwi: "/story-assets/generated/folktales-v1/ch-patjwi-neutral.png",
    heungbu: "/story-assets/generated/folktales-v1/ch-heungbu-neutral.png",
    nolbu: "/story-assets/generated/folktales-v1/ch-nolbu-neutral.png",
  };

  return mapping[characterName] || null;
}

/**
 * 미션 2 옵션 레이블을 이미지 URL로 매핑
 */
export function getMission2OptionImage(label: string): string {
  const mapping: Record<string, string> = {
    "목소리가 큰 친구": "/story-assets/banggui/mission_banggui_02_loud-friend.webp",
    "질문이 많은 친구": "/story-assets/banggui/mission_banggui_02_curious-friend.webp",
    "힘이 센 친구": "/story-assets/banggui/mission_banggui_02_strong-friend.webp",
    "조용한 친구": "/story-assets/banggui/mission_banggui_02_quiet-friend.webp",
  };
  return mapping[label] || "/story-assets/banggui/mission_banggui_02_curious-friend.webp";
}

/**
 * 스토리 커버 이미지
 */
export const STORY_COVER_IMAGE = "/story-assets/banggui/cover_banggui.webp";

/**
 * 스토리 ID 또는 제목 → 표지 이미지 URL 매핑.
 *
 * 실서버가 `coverImageUrl`을 내려주지 않아도(현재 계약에 표지가 없다) 프론트에 있는
 * 정적 에셋을 보여준다. 표지가 없는 이야기(카탈로그 편)는 서버 값을 그대로 쓴다.
 *
 * 백엔드는 UUID를 스토리 ID로 사용하므로, mock ID(`s_banggui_daughter_in_law_001`)와
 * 제목("방귀 뀌는 며느리")을 함께 매핑해 어느 쪽이든 매칭되게 한다.
 */
const STORY_COVER_IMAGES: Record<string, string> = {
  "s_banggui_daughter_in_law_001": STORY_COVER_IMAGE,
  "방귀 뀌는 며느리": STORY_COVER_IMAGE,
  // 카탈로그 전용 편 — 2026-08-16 AI 파트 수령(generated/folktales-v1).
  story_haenim: "/story-assets/generated/folktales-v1/cover-sun-moon.webp",
  "해님과 달님": "/story-assets/generated/folktales-v1/cover-sun-moon.webp",
  story_kongjwi: "/story-assets/generated/folktales-v1/cover-kongjwi-patjwi.webp",
  "콩쥐와 팥쥐": "/story-assets/generated/folktales-v1/cover-kongjwi-patjwi.webp",
  story_heungbu: "/story-assets/generated/folktales-v1/cover-heungbu-nolbu.webp",
  "흥부와 놀부": "/story-assets/generated/folktales-v1/cover-heungbu-nolbu.webp",
};

/**
 * 스토리 ID와 제목으로 표지 이미지를 찾는다.
 * - `storyId`가 매핑에 있으면 해당 이미지 반환
 * - `title`이 매핑에 있으면 해당 이미지 반환
 * - 둘 다 없으면 서버가 준 `fallback`을 그대로 반환
 *
 * 표지가 없는 이야기는 null이 되어 기존 플레이스홀더 동작을 유지한다.
 */
export function getStoryCoverImage(
  storyId: string,
  title: string,
  fallback: string | null | undefined
): string | null {
  return STORY_COVER_IMAGES[storyId] ?? STORY_COVER_IMAGES[title] ?? fallback ?? null;
}

/**
 * 미션 1 안전 계획 이미지
 */
export const MISSION1_SAFE_PLAN_IMAGE = "/story-assets/banggui/mission_banggui_01_safe-plan.webp";