/**
 * /activity 단계 전이 — docs/spec/screens.md §3-3
 *
 *   INTRO → CARD_ORDERING ⇄ FEEDBACK → KEYWORDS → RETELLING ⇄ REVIEW → COMPLETE
 *
 * /play와 마찬가지로 페이지 이동이 없다. 단일 페이지의 단계 전환이다.
 * 정답 판정은 서버가 한다. 여기서 카드 순서를 채점하지 않는다. (§0-2)
 */

import { ActivityStep } from "@/lib/play-state";
import type {
  ActivityCard,
  OrderResult,
  RetellingResult,
} from "@/lib/api/types";

export type ActivityState = {
  step: ActivityStep;
  /** 트레이에 남은 카드 (서버가 준 셔플 순서) */
  tray: ActivityCard[];
  /** 슬롯 4칸. null은 빈 칸 */
  slots: (ActivityCard | null)[];
  attemptCount: number;
  /** D-3에서 강조할 카드. 서버가 알려준다 */
  hintCardId: string | null;
  retellingKeywords: string[];
  /** D-5에서 아이가 실제로 말한 키워드 */
  spokenKeywords: string[];
  retellingText: string;
  interimText: string;
  recording: boolean;
  result: RetellingResult | null;
  errorCode: string | null;
};

export const initialActivityState: ActivityState = {
  step: ActivityStep.INTRO,
  tray: [],
  slots: [null, null, null, null],
  attemptCount: 0,
  hintCardId: null,
  retellingKeywords: [],
  spokenKeywords: [],
  retellingText: "",
  interimText: "",
  recording: false,
  result: null,
  errorCode: null,
};

export type ActivityAction =
  | { type: "HYDRATE"; cards: ActivityCard[]; attemptCount: number }
  | { type: "START" }
  | { type: "PLACE"; cardId: string; slotIndex: number }
  | { type: "REMOVE"; slotIndex: number }
  | { type: "SUBMIT_ORDER" }
  | { type: "ORDER_RESULT"; result: OrderResult }
  | { type: "RETRY_ORDER" }
  | { type: "GO_RETELLING" }
  | { type: "RECORDING_START" }
  | { type: "INTERIM"; text: string }
  | { type: "TRANSCRIBED"; text: string }
  | { type: "RETELL_AGAIN" }
  | { type: "SUBMIT_RETELLING" }
  | { type: "RETELLING_RESULT"; result: RetellingResult }
  | { type: "STT_FAILED"; code: string };

/** 부분 전사에서 아직 안 나온 키워드를 찾아 점등 목록에 더한다. */
function detectKeywords(
  transcript: string,
  keywords: readonly string[],
  already: readonly string[]
): string[] {
  const found = keywords.filter(
    (kw) => transcript.includes(kw) && !already.includes(kw)
  );
  return found.length ? [...already, ...found] : [...already];
}

export function activityReducer(
  state: ActivityState,
  action: ActivityAction
): ActivityState {
  switch (action.type) {
    case "HYDRATE":
      return {
        ...state,
        tray: action.cards,
        slots: [null, null, null, null],
        attemptCount: action.attemptCount,
      };

    case "START":
      return { ...state, step: ActivityStep.CARD_ORDERING };

    case "PLACE": {
      const card =
        state.tray.find((c) => c.id === action.cardId) ??
        state.slots.find((c) => c?.id === action.cardId) ??
        null;
      if (!card) return state;

      const slots = [...state.slots];
      // 이미 다른 칸에 있던 카드면 그 칸을 비운다.
      const from = slots.findIndex((c) => c?.id === card.id);
      if (from >= 0) slots[from] = null;

      // 목표 칸에 카드가 있으면 교체하고, 밀려난 카드는 원래 칸이나 트레이로 보낸다.
      const displaced = slots[action.slotIndex];
      slots[action.slotIndex] = card;

      let tray = state.tray.filter((c) => c.id !== card.id);
      if (displaced) {
        if (from >= 0) slots[from] = displaced;
        else tray = [...tray, displaced];
      }

      return { ...state, slots, tray, hintCardId: null };
    }

    case "REMOVE": {
      const card = state.slots[action.slotIndex];
      if (!card) return state;
      const slots = [...state.slots];
      slots[action.slotIndex] = null;
      return { ...state, slots, tray: [...state.tray, card] };
    }

    case "SUBMIT_ORDER":
      return { ...state, hintCardId: null };

    case "ORDER_RESULT": {
      const { result } = action;
      if (result.isCorrect) {
        return {
          ...state,
          step: ActivityStep.KEYWORDS,
          attemptCount: result.attemptCount,
          retellingKeywords: result.retellingKeywords ?? [],
          hintCardId: null,
        };
      }
      return {
        ...state,
        step: ActivityStep.FEEDBACK,
        attemptCount: result.attemptCount,
        hintCardId: result.hintCardId,
      };
    }

    case "RETRY_ORDER":
      return { ...state, step: ActivityStep.CARD_ORDERING };

    case "GO_RETELLING":
      return {
        ...state,
        step: ActivityStep.RETELLING,
        spokenKeywords: [],
        retellingText: "",
        interimText: "",
      };

    case "RECORDING_START":
      return { ...state, recording: true, interimText: "", errorCode: null };

    case "INTERIM":
      return {
        ...state,
        interimText: action.text,
        // 실시간 점등 — Web Speech API의 interimResults가 있어서 가능하다. (D-5)
        spokenKeywords: detectKeywords(
          action.text,
          state.retellingKeywords,
          state.spokenKeywords
        ),
      };

    case "TRANSCRIBED": {
      const text = action.text.trim();
      if (!text) {
        return { ...state, recording: false, errorCode: "no-speech" };
      }
      return {
        ...state,
        recording: false,
        step: ActivityStep.REVIEW,
        retellingText: text,
        interimText: "",
        // 최종 결과로 한 번 더 훑는다. 부분 전사에서 놓친 키워드를 보정한다.
        spokenKeywords: detectKeywords(
          text,
          state.retellingKeywords,
          state.spokenKeywords
        ),
      };
    }

    case "RETELL_AGAIN":
      return {
        ...state,
        step: ActivityStep.RETELLING,
        recording: false,
        retellingText: "",
        interimText: "",
        spokenKeywords: [],
      };

    case "SUBMIT_RETELLING":
      return state;

    case "RETELLING_RESULT":
      return {
        ...state,
        step: ActivityStep.COMPLETE,
        result: action.result,
      };

    case "STT_FAILED":
      return { ...state, recording: false, errorCode: action.code };

    default:
      return state;
  }
}

/** 슬롯이 모두 채워졌는지. "확인하기" 활성 조건 */
export function isOrderComplete(state: ActivityState): boolean {
  return state.slots.every((slot) => slot !== null);
}

export function submittedOrder(state: ActivityState): string[] {
  return state.slots.filter((s): s is ActivityCard => s !== null).map((s) => s.id);
}
