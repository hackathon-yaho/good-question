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
    mission: null,
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
      // 빈 발화는 메시지를 만들지 않는다. (PRD 8.9) I-2로 보낸다.
      if (!text) {
        return { ...state, status: PlayState.MIC_ERROR, errorCode: "no-speech" };
      }
      return {
        ...state,
        status: PlayState.CONFIRM,
        draftText: text,
        sttRawText: text,
        interimText: "",
      };
    }

    case "DRAFT_CHANGE":
      return { ...state, draftText: action.text };

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
      return {
        ...state,
        // 서버가 확정한 모드를 화면 상태로 옮기는 것이 전부다.
        status: toPlayState(result.responseMode),
        characterText: result.characterMessage,
        characterMessageId: result.messageId,
        turnCount: result.turnCount,
        // dialogue 장면이면 값이 있다. 없으면 턴 표시(n/m)를 그리지 않는다.
        maxTurns: result.maxTurns ?? state.maxTurns,
        accumulatedElements: result.accumulatedElements,
        mission: result.missionTriggered ?? state.mission,
        highlightWords: result.highlightWords,
        nextSceneId: result.nextSceneId,
        draftText: "",
        sttRawText: "",
      };
    }

    case "MISSION_DISMISS":
      return { ...state, mission: null };

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
