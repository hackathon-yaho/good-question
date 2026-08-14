/**
 * /play 상태머신 — docs/spec/screens.md §3-2
 *
 * 이 프로젝트에서 가장 위험한 부분이다. 페이지 이동 없이 상태만 순환한다.
 *
 *   INTRO → SCENE_NARRATION → CHARACTER_SPEAKING → CHILD_TURN
 *     → TRANSCRIBING → CONFIRM → THINKING
 *     → (NORMAL) CHARACTER_SPEAKING  |  (GUIDED) GUIDED  |  (CLOSING) SCENE_TRANSITION
 *
 * TRANSCRIBING(①·최대 8초)과 THINKING(②·최대 10초)은 **서로 다른 구간**이다.
 * 2안에서 발화 1회가 요청 3개로 나뉘기 때문이다.
 * (docs/request/frontend/stt-tts-integration.md)
 *
 * 원칙 (§0-2): 진행 모드는 서버가 확정해 내려준다. 여기서 발화 내용을 보고 판단하지 않는다.
 * 이 파일에 등장하는 판단은 "서버가 준 값을 어떤 화면 상태로 옮길지"뿐이다.
 */

import { splitSentences } from "@/lib/korean";
import type {
  HighlightWord,
  Message,
  MissionTrigger,
  SceneInfo,
  SessionSnapshot,
  UtteranceResponse,
} from "@/lib/api/types";
import { PlayState, toPlayState } from "@/lib/play-state";
import { isChoiceMission } from "@/features/play/mission2";

/**
 * 미션 체크리스트에서 **완료로 표시할 항목 수** — 순차 진행의 포인터다.
 *
 * ── 왜 `accumulatedElements`를 쓰지 않나 ────────────────────────────
 * 처음에는 `accumulatedElements.includes(item.element)`로 판정했다. 두 가지가 어긋난다.
 *
 *   1. **1·2번이 둘 다 `SOLUTION`이다.** 서버가 SOLUTION을 확정하는 순간 두 항목이
 *      동시에 완료된다. 누적 **집합**으로는 "SOLUTION을 두 번 채웠다"를 표현할 수 없다
 *   2. `accumulatedElements`는 **세션 전체** 누적이다. 미션이 뜨기 전 장면에서 이미
 *      모아둔 요소가 미션 1·2번을 미리 완료로 만들어, 아이가 1번을 말해볼 기회 없이
 *      **3번부터 시작**한다. 요구는 "1번부터 순차대로 하나씩"이다
 *
 * 그래서 포인터를 **미션 안에서의 발화 횟수**로만 센다. 미션이 뜨면 0에서 시작한다.
 *
 * ⚠️ 이건 채점이 아니다. 완료 표시의 뜻은 "맞았어요"가 아니라 **"말했어요"** 이고,
 *    아이가 그 항목에 대해 말한 것은 사실이다. 다만 **약한 답변도 넘어간다** —
 *    그게 서버 신호가 필요한 이유다.
 *    (docs/request/backend/mission-progress.md · `missionProgress.satisfiedIndexes`)
 */
export function missionDoneCount(
  mission: MissionTrigger,
  missionTurns: number
): number {
  return Math.min(mission.checklist.length, Math.max(0, missionTurns));
}

/**
 * 미션 2에서 아이가 다시 시도할 수 있는 최대 횟수.
 *
 * 무한 재시도는 아이를 미션에 갇히게 한다. 카드 순서(D-10)에서 3회로 끊은 것과
 * 같은 이유다. 2회면 "한 번 해보고, 힌트를 받고 한 번 더"가 된다.
 */
export const MISSION2_MAX_ATTEMPTS = 2;

/**
 * 브리프를 (다시) 열어야 하는가.
 *
 * 두 미션의 **끝나는 조건이 다르다.**
 *
 *   미션 1  4항목을 순차로 다 말하면 끝난다 → 발화 4회
 *   미션 2  4개 중 **하나**를 골라 말하면 끝난다 → 성공하면 1회로 끝
 *
 * ⚠️ 미션 2에 미션 1의 규칙을 쓰면 같은 미션을 **네 번** 물어본다. 게다가 서버가
 *    `mission_2`의 `checklist`를 빈 배열로 보내므로(api-spec 6.1) `checklist.length`로는
 *    구분할 수 없다 — 0이 되어 즉시 닫힌다. 그래서 `id`로 갈라야 한다.
 *
 * 미션 2는 실패하면 **힌트와 함께 다시 열린다.** 성공 판정은 아래 주석 참조.
 */
export function shouldOpenMissionBrief(
  mission: MissionTrigger,
  missionTurns: number,
  satisfied: boolean
): boolean {
  if (isChoiceMission(mission.id)) {
    if (satisfied) return false;
    return missionTurns < MISSION2_MAX_ATTEMPTS;
  }
  return missionDoneCount(mission, missionTurns) < mission.checklist.length;
}

/**
 * 미션 2를 해냈는가 — **이번 턴에 관점 요소가 새로 확정됐는지**로 본다.
 *
 * 미션 2의 목적은 "특징을 **다른 관점에서** 바라보고 장점으로 바꾸어 말한다"이고
 * (PRD 7.6), 그에 해당하는 사고 요소가 `PERSPECTIVE`다. 판정은 서버가 한다 —
 * 프론트는 서버가 확정한 요소 집합을 읽을 뿐이다. (§0-2)
 *
 * ⚠️ **"새로"가 중요하다.** `accumulatedElements`는 세션 전체 누적이라, 미션이 뜨기 전
 *    장면에서 이미 PERSPECTIVE가 들어와 있으면 발화와 무관하게 늘 참이 된다.
 *    그래서 직전 값과 비교해 **이번 턴에 늘어났는지**만 본다.
 *
 * ⚠️ 그래도 한계가 남는다. 이미 있던 경우에는 성공을 감지할 수 없어 재시도로 흐르고,
 *    `MISSION2_MAX_ATTEMPTS`에서 멈춘다. 서버가 미션 성공 여부를 직접 주면
 *    이 계산이 사라진다. (docs/request/backend/mission-progress.md)
 */
export function mission2Satisfied(
  before: readonly string[],
  after: readonly string[]
): boolean {
  const PERSPECTIVE = "PERSPECTIVE";
  return !before.includes(PERSPECTIVE) && after.includes(PERSPECTIVE);
}

export type PlayMachineState = {
  status: PlayState;
  scene: SceneInfo | null;
  messages: Message[];

  /** 도입·전개 자막. 한 번에 한 문장만 보여준다. */
  sentences: string[];
  sentenceIndex: number;

  /** 현재 캐릭터 대사 (말풍선 + TTS 대상) */
  characterText: string;
  /**
   * 그 대사의 메시지 id. `GET /api/tts?messageId=`로 음성을 받는 열쇠다.
   * 도입·전개 자막에는 없다(메시지가 아니다) — 그때는 텍스트로 음성을 요청한다.
   */
  characterMessageId: string | null;
  /** C-5에서 아이가 확인·수정하는 텍스트 */
  draftText: string;
  /** STT 최초 변환 결과. 편집해도 원문을 보존한다. (PRD 8.9) */
  sttRawText: string;
  /** 녹음 중 부분 전사 */
  interimText: string;

  turnCount: number;
  maxTurns: number;
  accumulatedElements: string[];

  mission: MissionTrigger | null;
  /**
   * 브리프 카드가 열려 있는지. **미션 자체와 별개다.**
   *
   * 미션은 4항목을 한 번에 다 말하는 게 아니라 한 항목씩 순차로 진행한다. 그래서
   * 카드가 [브리프 → 발화 → 브리프 → …]로 **네 번 돌아와야** 한다.
   * 예전에는 `MISSION_DISMISS`가 `mission: null`로 카드를 영구 제거해 다시 못 봤다.
   */
  missionBriefOpen: boolean;
  /**
   * 미션이 뜬 뒤 아이가 발화를 제출한 횟수. 순차 진행 포인터다.
   *
   * ⚠️ 이건 **채점이 아니다.** 어느 항목이 충족됐는지는 서버만 안다. 다만
   *    `accumulatedElements`는 누적 **집합**이라 같은 요소를 요구하는 항목이 둘 이상일 때
   *    (미션 1의 1·2번이 둘 다 SOLUTION) "두 번 채웠다"를 표현하지 못한다.
   *    그래서 진행 순서만 이 카운터로 옮긴다. 완료 표시의 뜻은 "맞았어요"가 아니라
   *    **"말했어요"** 이고, 아이가 그 항목에 대해 말한 것은 사실이다.
   *
   * 서버가 `missionProgress.satisfiedIndexes`를 실어주면 그 값을 우선한다.
   * (docs/request/backend/mission-progress.md)
   */
  missionTurns: number;
  /**
   * 미션 2에서 아이가 고른 친구의 index. 안 골랐으면 null.
   *
   * 미션 2는 4개 중 **하나를 골라** 말하는 방식이라 순차 포인터(`missionTurns`)와
   * 개념이 다르다 (화면 명세 C-11). 고른 것은 채점이 아니라 **아이의 선택**이므로
   * 프론트가 들고 있어도 §0-2에 어긋나지 않는다.
   */
  mission2Choice: number | null;
  highlightWords: HighlightWord[];

  /** 마지막 장면이 끝나 /activity로 넘어가야 하는지 */
  postActivityReady: boolean;
  nextSceneId: string | null;

  /** 녹음 중인지. status는 CHILD_TURN 그대로 두고 이 플래그로 마이크 표시를 바꾼다. */
  recording: boolean;
  errorCode: string | null;
};

export const initialPlayState: PlayMachineState = {
  status: PlayState.INTRO,
  scene: null,
  messages: [],
  sentences: [],
  sentenceIndex: 0,
  characterText: "",
  characterMessageId: null,
  draftText: "",
  sttRawText: "",
  interimText: "",
  turnCount: 0,
  maxTurns: 0,
  accumulatedElements: [],
  mission: null,
  missionBriefOpen: false,
  missionTurns: 0,
  mission2Choice: null,
  highlightWords: [],
  postActivityReady: false,
  nextSceneId: null,
  recording: false,
  errorCode: null,
};

export type PlayAction =
  | { type: "HYDRATE"; snapshot: SessionSnapshot }
  | { type: "SENTENCE_NEXT" }
  | { type: "NARRATION_DONE" }
  /** 장면이 넘어갔다. 서버를 다시 읽은 스냅샷으로 갈아탄다. */
  | { type: "SCENE_LOADED"; snapshot: SessionSnapshot }
  | { type: "POST_ACTIVITY_READY" }
  | { type: "CHARACTER_TTS_DONE" }
  | { type: "RECORDING_START" }
  | { type: "INTERIM"; text: string }
  | { type: "TRANSCRIBING" }
  | { type: "TRANSCRIBED"; text: string }
  | { type: "DRAFT_CHANGE"; text: string }
  | { type: "RETRY_SPEAKING" }
  | { type: "SUBMIT" }
  | { type: "SERVER_RESULT"; result: UtteranceResponse }
  | { type: "MISSION_DISMISS" }
  | { type: "MISSION2_SELECT"; index: number }
  | { type: "STT_FAILED"; code: string }
  | { type: "SCENE_CONTINUE" };

function sentencesOf(scene: SceneInfo | null): string[] {
  return scene?.sceneDescription ? splitSentences(scene.sceneDescription) : [];
}

/** 장면 유형에 따른 최초 상태. intro는 전체화면(C-1), narrative는 좌측 자막(C-2). */
function entryStatus(scene: SceneInfo): PlayState {
  if (scene.sceneType === "intro") return PlayState.INTRO;
  if (scene.sceneType === "narrative") return PlayState.SCENE_NARRATION;
  return PlayState.CHARACTER_SPEAKING;
}

/**
 * 세션 스냅샷을 화면 상태로 옮긴다. 최초 진입과 장면 전환이 **같은 코드를 탄다.**
 *
 * 장면 전환도 스냅샷으로 처리하는 이유:
 *   - 대화 장면이 끝나면 서버가 이미 다음 장면으로 옮겨 놨다. `.../complete`는
 *     dialogue에 쓸 수 없고(400), 그 응답에는 자막(`sceneDescription`)도 없다
 *   - 그래서 두 경로 모두 `GET /sessions/{id}`를 다시 읽는다
 *     (backend/docs/api-spec.md 5.3 · 6.1)
 *
 * 장면별 값은 여기서 전부 초기화한다. 안 하면 지난 장면의 미션이 새 장면에 남고,
 * turnCount가 이어져 다음 장면이 첫 턴에 즉시 종료된다. (PRD 8.8)
 */
function applySnapshot(
  state: PlayMachineState,
  snapshot: SessionSnapshot
): PlayMachineState {
  const scene = snapshot.currentScene;
  // 이 장면의 마지막 캐릭터 대사. 다른 장면 것을 끌어오면 말풍선이 어긋난다.
  const opening = [...snapshot.messages]
    .reverse()
    .find(
      (m) => m.speakerType === "character" && m.sceneId === scene.sceneId
    );
  const isDialogue = scene.sceneType === "dialogue";

  return {
    ...state,
    scene,
    messages: snapshot.messages,
    sentences: sentencesOf(scene),
    sentenceIndex: 0,
    status: entryStatus(scene),
    characterText: isDialogue ? (opening?.text ?? "") : "",
    characterMessageId: isDialogue ? (opening?.id ?? null) : null,
    turnCount: snapshot.turnCount,
    maxTurns: snapshot.maxTurns ?? 0,
    accumulatedElements: snapshot.accumulatedElements,
    /**
     * 미션 상태는 **세 값을 함께** 지운다.
     *
     * ⚠️ `mission`만 null로 두면 아이가 영구히 멈춘다. 장면이 미션을 다 끝내기 전에
     *    닫히면(턴 한도가 먼저 차는 경우) `missionBriefOpen`이 true로 남는데,
     *    다음 장면에서 `CHARACTER_TTS_DONE`이 그 값을 보고 아이 차례로 넘기지 않는다.
     *    우측은 `mission`이 null이라 브리프 대신 대화 패널을 그리므로 화면은 정상처럼
     *    보이고, **말할 차례만 영원히 오지 않는다.** (handoff 스위트가 잡았다)
     */
    mission: null,
    missionBriefOpen: false,
    missionTurns: 0,
    mission2Choice: null,
    /**
     * 밑줄 단어는 서버가 `POST /messages` 응답에만 실어 준다. 세션 조회에는 없다.
     * 그래서 장면 첫 대사에는 밑줄이 없고, C-9는 두 번째 턴부터 열린다.
     * (백엔드 D-22 — 후보 단어가 대사에 실제로 등장한 턴에만 채워진다)
     */
    highlightWords: [],
    draftText: "",
    sttRawText: "",
    interimText: "",
    recording: false,
    nextSceneId: null,
    errorCode: null,
  };
}

export function playReducer(
  state: PlayMachineState,
  action: PlayAction
): PlayMachineState {
  switch (action.type) {
    // 최초 진입과 장면 전환이 같다. 둘 다 서버 스냅샷이 정본이다.
    case "HYDRATE":
    case "SCENE_LOADED":
      return applySnapshot(state, action.snapshot);

    case "SENTENCE_NEXT": {
      const last = state.sentenceIndex >= state.sentences.length - 1;
      if (last) return state;
      return { ...state, sentenceIndex: state.sentenceIndex + 1 };
    }

    // 자막이 끝났다. 다음 장면을 서버에 요청하는 동안 상태는 그대로 둔다.
    case "NARRATION_DONE":
      return state;

    case "POST_ACTIVITY_READY":
      return { ...state, postActivityReady: true };

    // TTS가 끝나면 아이 차례로 넘긴다. 이 전환이 실패하면 아이가 영원히 기다린다.
    case "CHARACTER_TTS_DONE": {
      if (state.status === PlayState.SCENE_TRANSITION) return state;
      /**
       * 미션 브리프가 열려 있으면 **넘기지 않는다.** 아이가 미션을 읽고
       * 생각한 뒤 "말해볼래요"를 눌러 스스로 시작한다.
       * 여기서 넘기면 미션을 읽는 중에 이미 말할 차례가 된다.
       *
       * ⚠️ `mission`도 함께 본다. 이 전환을 막는 것은 **화면에 눌 버튼이 있을 때만**
       *    안전하다. 미션이 없는데 플래그만 남아 있으면 아이가 영구히 멈춘다.
       */
      if (state.missionBriefOpen && state.mission !== null) return state;
      return { ...state, status: PlayState.CHILD_TURN, recording: false };
    }

    case "RECORDING_START":
      return {
        ...state,
        status: PlayState.CHILD_TURN,
        recording: true,
        interimText: "",
        errorCode: null,
      };

    case "INTERIM":
      return { ...state, interimText: action.text };

    /**
     * 녹음이 끝나고 텍스트를 기다리는 구간(①). 2안으로 넘어오면서 **실제 구간이
     * 되었다** — 오디오를 올리고 최대 8초를 기다린다. 1안에서는 사실상 0이었다.
     *
     * 화면은 C-4 틀을 유지하고 마이크만 끈다. 여기서 레이아웃을 바꾸면 브라우저
     * 모드(구간이 짧다)에서 화면이 번쩍인다.
     * (docs/request/frontend/stt-tts-integration.md "상태별 처리")
     */
    case "TRANSCRIBING":
      return { ...state, status: PlayState.TRANSCRIBING, recording: false };

    case "TRANSCRIBED": {
      const text = action.text.trim();
      if (!text) {
        return { ...state, errorCode: "no-speech" };
      }
      return {
        ...state,
        // status를 CONFIRM이나 다른 상태로 강제 전환하지 않고,
        // draftText만 업데이트하며 CHILD_TURN 상태를 유지합니다.
        draftText: text,
        sttRawText: state.sttRawText || text,
        interimText: "",
      };
    }

    // DRAFT_CHANGE 액션 처리 (텍스트 입력/수정 시)
  case "DRAFT_CHANGE":
    return {
      ...state,
      draftText: action.text,
      // 만약 STT 원본이 비어있다면 최초 수신 텍스트로 보존
      sttRawText: state.sttRawText || action.text,
    };

    case "RETRY_SPEAKING":
      return {
        ...state,
        status: PlayState.CHILD_TURN,
        recording: false,
        draftText: "",
        interimText: "",
        errorCode: null,
      };

    case "SUBMIT":
      return { ...state, status: PlayState.THINKING };

    case "SERVER_RESULT": {
      const { result } = action;
      const mission = result.missionTriggered ?? state.mission;

      const wasRunning = state.mission !== null;
      const missionTurns = wasRunning ? state.missionTurns + 1 : 0;

      const satisfied =
        wasRunning &&
        mission2Satisfied(state.accumulatedElements, result.accumulatedElements);
      const briefOpen =
        mission !== null &&
        shouldOpenMissionBrief(mission, missionTurns, satisfied);

      const currentSceneId = state.scene?.sceneId ?? "";
      const currentTurn = result.turnCount ?? state.turnCount;

      // 1. 아이의 발화 메시지 객체 (turnOrder 추가)
      const childMessage: Message = {
        id: `child-${Date.now()}`,
        speakerType: "child",
        text: state.draftText,
        sceneId: currentSceneId,
        turnOrder: currentTurn, // 👈 turnOrder 추가
        createdAt: new Date().toISOString(),
      };
    
      // 2. 캐릭터의 응답 메시지 객체 (turnOrder 추가)
      const characterMessage: Message = {
        id: result.messageId ?? `char-${Date.now()}`,
        speakerType: "character",
        text: result.characterMessage,
        sceneId: currentSceneId,
        turnOrder: currentTurn, // 👈 turnOrder 추가
        createdAt: new Date().toISOString(),
      };
    
      return {
        ...state,
        status: toPlayState(result.responseMode),
        // draftText가 있을 때만 아이 메시지 추가
        messages: [
          ...state.messages,
          ...(state.draftText.trim() ? [childMessage] : []),
          characterMessage,
        ],
        characterText: result.characterMessage,
        characterMessageId: result.messageId,
        turnCount: result.turnCount,
        maxTurns: result.maxTurns ?? state.maxTurns,
        accumulatedElements: result.accumulatedElements,
        mission,
        missionBriefOpen: briefOpen,
        missionTurns,
        highlightWords: result.highlightWords,
        nextSceneId: result.nextSceneId,
        draftText: "",
        sttRawText: "",
      };
    }

    /**
     * "말해볼래요" — 브리프를 닫고 **그때** 아이 차례를 시작한다.
     * `mission`은 지우지 않는다. 다음 항목에서 카드가 돌아와야 한다.
     */
    case "MISSION_DISMISS":
      return {
        ...state,
        missionBriefOpen: false,
        status: PlayState.CHILD_TURN,
        recording: false,
      };

    /** 미션 2 — 친구 고르기. 아이의 선택이지 채점이 아니다 (화면 명세 C-11) */
    case "MISSION2_SELECT":
      return { ...state, mission2Choice: action.index };

    case "STT_FAILED":
      return {
        ...state,
        status: PlayState.MIC_ERROR,
        recording: false,
        errorCode: action.code,
      };

    // C-12 "계속하기". 다음 장면 로딩은 호출부가 SCENE_LOADED로 알려준다.
    case "SCENE_CONTINUE":
      return state;

    default:
      return state;
  }
}

/** 현재 자막 문장. 없으면 빈 문자열 */
export function currentSentence(state: PlayMachineState): string {
  return state.sentences[state.sentenceIndex] ?? "";
}

export function isLastSentence(state: PlayMachineState): boolean {
  return state.sentenceIndex >= state.sentences.length - 1;
}

/** 대화 히스토리에 표시할 메시지. system은 미션 노출 기록이라 제외한다. (PRD 7.6) */
export function visibleMessages(state: PlayMachineState): Message[] {
  return state.messages.filter((m) => m.speakerType !== "system");
}
