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
  | {
      type: "SCENE_LOADED";
      scene: SceneInfo;
      openingMessage: Message | null;
      highlightWords?: HighlightWord[];
    }
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

export function playReducer(
  state: PlayMachineState,
  action: PlayAction
): PlayMachineState {
  switch (action.type) {
    case "HYDRATE": {
      const { snapshot } = action;
      const scene = snapshot.currentScene;
      const opening = [...snapshot.messages]
        .reverse()
        .find((m) => m.speakerType === "character");

      return {
        ...state,
        scene,
        messages: snapshot.messages,
        sentences: sentencesOf(scene),
        sentenceIndex: 0,
        status: entryStatus(scene),
        characterText:
          scene.sceneType === "dialogue" ? (opening?.text ?? "") : "",
        characterMessageId:
          scene.sceneType === "dialogue" ? (opening?.id ?? null) : null,
        turnCount: snapshot.turnCount,
        maxTurns: snapshot.maxTurns,
        accumulatedElements: snapshot.accumulatedElements,
      };
    }

    case "SENTENCE_NEXT": {
      const last = state.sentenceIndex >= state.sentences.length - 1;
      if (last) return state;
      return { ...state, sentenceIndex: state.sentenceIndex + 1 };
    }

    // 자막이 끝났다. 다음 장면을 서버에 요청하는 동안 상태는 그대로 둔다.
    case "NARRATION_DONE":
      return state;

    case "SCENE_LOADED": {
      const { scene, openingMessage } = action;
      return {
        ...state,
        scene,
        sentences: sentencesOf(scene),
        sentenceIndex: 0,
        status: entryStatus(scene),
        characterText: openingMessage?.text ?? "",
        characterMessageId: openingMessage?.id ?? null,
        messages: openingMessage
          ? [...state.messages, openingMessage]
          : state.messages,
        // 장면 전환 시 초기화 (PRD 8.8). 안 하면 다음 장면이 첫 턴에 즉시 종료된다.
        turnCount: 0,
        maxTurns: scene.maxTurns ?? 0,
        accumulatedElements: [],
        mission: null,
        // 첫 대사의 밑줄 단어는 유지한다. 여기서 비우면 C-9로 갈 통로가 닫힌다.
        highlightWords: action.highlightWords ?? [],
        draftText: "",
        sttRawText: "",
        interimText: "",
        nextSceneId: null,
      };
    }

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
        maxTurns: result.maxTurns,
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
