/**
 * 목 콘텐츠 — 방귀 뀌는 며느리
 *
 * 값은 docs/product/prd.md 7장에서 그대로 가져왔다.
 * `scene_description`과 고정 대사는 자문위원 난이도 검수가 완료된 텍스트이므로
 * **수정하지 않는다.** (PRD 10.1)
 *
 * 서버가 붙으면 이 파일은 지운다. 지금은 프론트가 서버 없이 대화 1턴을
 * 완주할 수 있게 하는 용도다.
 */

import type { SceneType } from "@/lib/play-state";

export type MockScene = {
  id: string;
  sceneOrder: number;
  sceneType: SceneType;
  /** intro / narrative 전용 */
  sceneDescription: string | null;
  /** dialogue 전용 */
  characterName: string | null;
  characterDisplayName: string | null;
  characterOpening: string | null;
  characterClosing: string | null;
  requiredElements: string[];
  preferredTurns: number | null;
  maxTurns: number | null;
  /** 이 장면에 미션이 붙는지 */
  missionId: "mission_1" | "mission_2" | null;
};

export const STORY_ID = "s_banggui_daughter_in_law_001";
export const STORY_TITLE = "방귀 뀌는 며느리";

/** 이야기 기본 정보 — PRD 7.1 (주최측 제공값) */
export const STORY_META = {
  id: STORY_ID,
  title: STORY_TITLE,
  summary:
    "큰 방귀를 부끄러워하던 며느리가 자신의 다름을 장점으로 바꾸는 이야기",
  difficulty: "보통",
  topics: ["다름", "자기이해", "장점 발견"],
  estimatedMinutes: 20,
  // 표지 이미지 미수령. 규격은 assets.md §2, 폴백은 §3-1.
  coverImageUrl: null,
} as const;

export const MOCK_SCENES: MockScene[] = [
  {
    id: "sc_banggui_01",
    sceneOrder: 1,
    sceneType: "intro",
    sceneDescription:
      "옛날 어느 마을에 방귀를 아주 크게 뀌는 며느리가 살았습니다. 며느리는 시집에 온 뒤로 늘 얌전하고 예의 바르게 보이고 싶었습니다. 시댁 식구들이 자신을 이상하게 볼까 봐 걱정했기 때문입니다.",
    characterName: null,
    characterDisplayName: null,
    characterOpening: null,
    characterClosing: null,
    requiredElements: [],
    preferredTurns: null,
    maxTurns: null,
    missionId: null,
  },
  {
    id: "sc_banggui_02",
    sceneOrder: 2,
    sceneType: "narrative",
    sceneDescription:
      "그래서 며느리는 방귀가 나오려고 할 때마다 꾹꾹 참았습니다. 하루도 참고, 이틀도 참고, 그렇게 오래 참다 보니 배는 점점 빵빵하게 부풀어 올랐고 얼굴은 노랗게 변했습니다. 몸도 마음도 너무 힘들었지만, 며느리는 차마 가족들에게 솔직하게 말하지 못했습니다.",
    characterName: null,
    characterDisplayName: null,
    characterOpening: null,
    characterClosing: null,
    requiredElements: [],
    preferredTurns: null,
    maxTurns: null,
    missionId: null,
  },
  {
    id: "sc_banggui_03",
    sceneOrder: 3,
    sceneType: "dialogue",
    sceneDescription: null,
    characterName: "ch_banggui_daughter_in_law",
    characterDisplayName: "방귀쟁이 며느리",
    characterOpening:
      "{childName}아, 내 방귀가 너무 크다는 걸 알면 가족들이 나를 이상하게 생각하지 않을까?",
    characterClosing: "그래도 아직은 못 말하겠어. 조금만 더 참아 볼게.",
    requiredElements: ["PERSPECTIVE", "EMOTION", "REASON", "SOLUTION"],
    preferredTurns: 2,
    maxTurns: 4,
    missionId: null,
  },
  {
    id: "sc_banggui_04",
    sceneOrder: 4,
    sceneType: "narrative",
    sceneDescription:
      "그러던 어느 날, 며느리는 더 이상 참을 수 없었습니다. 배가 너무 아프고 숨 쉬기도 힘들었습니다. 며느리는 조심스럽게 가족들에게 말했습니다. 며느리는 아주 살짝만 뀌려고 했습니다. 하지만 그동안 너무 오래 참았던 탓에 방귀는 생각보다 훨씬 크게 터져 나왔습니다. 마당의 먼지가 휘리릭 날아가고, 기왓장이 달그락거리고, 시아버지의 갓까지 휙 날아가 버렸습니다.",
    characterName: null,
    characterDisplayName: null,
    characterOpening: null,
    characterClosing: null,
    requiredElements: [],
    preferredTurns: null,
    maxTurns: null,
    missionId: null,
  },
  {
    id: "sc_banggui_05",
    sceneOrder: 5,
    sceneType: "dialogue",
    sceneDescription: null,
    characterName: "ch_banggui_father_in_law",
    characterDisplayName: "시아버지",
    characterOpening:
      "아이고 이게 무슨 일이냐! 우리 집안이 다 흔들리는구나! 이렇게 창피한 며느리와 함께 못살겠다! 그렇지 않니?",
    characterClosing:
      "흥, 그래도 도저히 이런 며느리와는 함께 살 수 없으니 친정으로 데려다줘야겠다.",
    requiredElements: ["PERSPECTIVE", "EMOTION", "REASON", "SOLUTION"],
    preferredTurns: 3,
    maxTurns: 5,
    missionId: null,
  },
  {
    id: "sc_banggui_06",
    sceneOrder: 6,
    sceneType: "narrative",
    sceneDescription:
      "한참 걷다 보니 아랫마을 길가에 아주 높은 배나무가 한 그루 서 있었습니다. 나무 꼭대기에는 노랗고 탐스러운 배들이 주렁주렁 매달려 있었습니다. 시아버지는 배를 보자 군침이 돌았습니다. 마침 아랫마을 사람들도 그 배를 먹고 싶어 했지만, 나무가 너무 높아 아무도 딸 수 없었습니다.",
    characterName: null,
    characterDisplayName: null,
    characterOpening: null,
    characterClosing: null,
    requiredElements: [],
    preferredTurns: null,
    maxTurns: null,
    missionId: null,
  },
  {
    id: "sc_banggui_07",
    sceneOrder: 7,
    sceneType: "dialogue",
    sceneDescription: null,
    characterName: "ch_banggui_village_chief",
    characterDisplayName: "마을 이장",
    characterOpening:
      "이 배나무는 해마다 탐스러운 배가 열리지만, 너무 높아서 아무도 딸 수가 없었소. 무슨 뾰족한 방법이 없겠는가?",
    characterClosing:
      "아이고, 방귀 뀌는 며느리 덕분에 온 마을이 배 잔치를 할 수 있겠구려, 고맙소!",
    requiredElements: ["SOLUTION", "REASON", "REQUEST", "RESULT"],
    preferredTurns: 3,
    maxTurns: 5,
    missionId: "mission_1",
  },
  {
    id: "sc_banggui_08",
    sceneOrder: 8,
    sceneType: "narrative",
    sceneDescription:
      "시아버지는 며느리의 방귀가 시끄럽고 별난 것이 아니라, 모두를 도울 수 있는 특별한 힘이라는 것을 깨닫습니다. 자신이 며느리를 구박했던 일을 후회하고 사과합니다.",
    characterName: null,
    characterDisplayName: null,
    characterOpening: null,
    characterClosing: null,
    requiredElements: [],
    preferredTurns: null,
    maxTurns: null,
    missionId: null,
  },
  {
    id: "sc_banggui_09",
    sceneOrder: 9,
    sceneType: "dialogue",
    sceneDescription: null,
    characterName: "ch_banggui_daughter_in_law",
    characterDisplayName: "방귀쟁이 며느리",
    characterOpening:
      "{childName}이 덕분에 내 방귀가 누군가에게 도움이 될 수 있다는 걸 처음 알았어. 이제는 방귀 소리가 큰 걸 부끄러워하지 않아도 될까?",
    characterClosing: "이제는 부끄러워하며 숨기지 않고, 조심해서 좋은 일에 써 볼게.",
    requiredElements: ["EMOTION", "PERSPECTIVE", "RESULT", "SOLUTION"],
    preferredTurns: 2,
    maxTurns: 4,
    missionId: "mission_2",
  },
];

/** 미션 정의는 별도 테이블 없이 코드 상수로 관리한다. (PRD 7.6) */
export const MOCK_MISSIONS = {
  mission_1: {
    id: "mission_1",
    title: "높은 배를 어떻게 딸까?",
    checklist: [
      { label: "무엇을 사용할까?", element: "SOLUTION" },
      { label: "사람들은 어디로 피할까?", element: "SOLUTION" },
      { label: "며느리에게 어떻게 부탁할까?", element: "REQUEST" },
      { label: "그러면 어떤 일이 생길까?", element: "RESULT" },
    ],
  },
  mission_2: {
    id: "mission_2",
    title: "단점을 장점으로 바꿔 볼까?",
    checklist: [
      { label: "목소리가 큰 친구", element: "PERSPECTIVE" },
      { label: "질문이 많은 친구", element: "PERSPECTIVE" },
      { label: "힘이 센 친구", element: "SOLUTION" },
      { label: "조용한 친구", element: "RESULT" },
    ],
  },
} as const;

/**
 * 말하기 후 활동 설정 — PRD 7.8 post_activity_config
 *
 * 카드는 전개1~4에 각각 대응한다. 카드 이미지는 해당 전개 이미지에서 크롭하므로
 * 별도 수령이 필요 없다. (assets.md §2-5)
 *
 * 카드 4개 · 키워드 4개는 MVP 요건 기준이다. 주최측 Q&A는 "장면당 키워드 3~4개
 * (총 12~16개)"였으나 7세~초2에게 12개는 과하고 "한 화면에 정보가 많지 않도록"
 * 이라는 인터뷰 요구와 충돌해 요건 기준을 채택했다. (PRD I-18)
 */
export const MOCK_POST_ACTIVITY = {
  cards: [
    { id: "card_1", text: "며느리는 방귀를 꾹 참고 또 참았어요.", correctOrder: 1 },
    { id: "card_2", text: "며느리의 큰 방귀에 시아버지의 갓이 날아갔어요.", correctOrder: 2 },
    { id: "card_3", text: "며느리의 방귀로 높은 배나무의 배가 우수수 떨어졌어요.", correctOrder: 3 },
    { id: "card_4", text: "시아버지가 며느리에게 미안하다고 말했어요.", correctOrder: 4 },
  ],
  retellingKeywords: ["며느리", "방귀", "배나무", "시아버지"],
} as const;

/** 화면 단위 진행바 분모 — 장면 화면 4개 (C-2 진행바 4구간) */
export const TOTAL_SCREEN_SCENES = 4;

/** DB scene_order(1~9) → 화면 단위 인덱스(1~4). Q-10 대응 */
export function toScreenIndex(sceneOrder: number): number {
  return Math.max(1, Math.ceil((sceneOrder - 1) / 2));
}

export function findScene(sceneId: string): MockScene | undefined {
  return MOCK_SCENES.find((scene) => scene.id === sceneId);
}

export function nextSceneOf(sceneId: string): MockScene | undefined {
  const index = MOCK_SCENES.findIndex((scene) => scene.id === sceneId);
  return index >= 0 ? MOCK_SCENES[index + 1] : undefined;
}
