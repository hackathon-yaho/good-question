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
  /**
   * 3회 시도 후 정답 순서를 보여주고 넘어온 경우. (D-10)
   * D-4를 "맞췄어!"가 아니라 "이런 순서였어"로 그린다. 실패를 지적하지는 않는다.
   */
  orderRevealed: boolean;
  /**
   * 직전 제출이 오답이었는지. D-2 슬롯에 테두리로 표시한다.
   * **카드를 다시 옮기면 꺼진다** — 고치는 중에도 계속 지적하면 위축된다.
   */
  orderMismatched: boolean;
  /**
   * 칸별 정오. 서버가 `slotResults`를 실어 보냈을 때만 값이 있다.
   *
   * 있으면 **틀린 칸만** 표시한다. 없으면 `orderMismatched`로 배치 전체를 표시한다 —
   * 서버가 어느 칸이 틀렸는지 알려주지 않으면 프론트는 알 방법이 없다.
   * 정답을 알아내려 하면 채점하는 셈이 된다. (§0-2)
   */
  slotResults: boolean[] | null;
  retellingKeywords: string[];
  /** D-5에서 아이가 실제로 말한 키워드 */
  spokenKeywords: string[];
  retellingText: string;
  interimText: string;
  recording: boolean;
  /** ① 변환 중 — 오디오를 올리고 텍스트를 기다린다 (최대 8초) */
  transcribing: boolean;
  result: RetellingResult | null;
  errorCode: string | null;
};

export const initialActivityState: ActivityState = {
  step: ActivityStep.INTRO,
  tray: [],
  slots: [null, null, null, null],
  attemptCount: 0,
  orderRevealed: false,
  orderMismatched: false,
  slotResults: null,
  retellingKeywords: [],
  spokenKeywords: [],
  retellingText: "",
  interimText: "",
  recording: false,
  transcribing: false,
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
  | { type: "TRANSCRIBING" }
  | { type: "INTERIM"; text: string }
  | { type: "TRANSCRIBED"; text: string }
  | { type: "RETELL_AGAIN" }
  | { type: "SUBMIT_RETELLING" }
  | { type: "RETELLING_RESULT"; result: RetellingResult }
  | { type: "STT_FAILED"; code: string };

/**
 * 전사에서 아직 안 나온 키워드를 찾아 점등 목록에 더한다.
 *
 * 부분 전사(브라우저 모드)에서도, 최종 결과(백엔드 모드)에서도 같은 함수를 쓴다.
 * 이미 점등된 것은 다시 넣지 않으므로 **몇 번 불려도 결과가 같다.**
 * 그래서 2안의 일괄 점등이 별도 코드 없이 성립한다.
 */
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

/**
 * 카드 id 순서를 슬롯 배열로 바꾼다. 하나라도 못 찾으면 null을 준다 —
 * 반쯤 채워진 슬롯을 보여주는 것보다 제출한 그대로 두는 게 낫다.
 */
function arrangeBy(
  order: readonly string[],
  state: ActivityState
): (ActivityCard | null)[] | null {
  const byId = new Map<string, ActivityCard>();
  for (const card of [...state.tray, ...state.slots]) {
    if (card) byId.set(card.id, card);
  }
  const arranged = order.map((id) => byId.get(id) ?? null);
  if (arranged.length !== state.slots.length) return null;
  return arranged.some((card) => card === null) ? null : arranged;
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

      // 다시 놓기 시작하면 오답 표시를 끈다.
      return { ...state, slots, tray, orderMismatched: false, slotResults: null };
    }

    case "REMOVE": {
      const card = state.slots[action.slotIndex];
      if (!card) return state;
      const slots = [...state.slots];
      slots[action.slotIndex] = null;
      return { ...state, slots, tray: [...state.tray, card], orderMismatched: false, slotResults: null };
    }

    case "SUBMIT_ORDER":
      return { ...state, orderMismatched: false, slotResults: null };

    case "ORDER_RESULT": {
      const { result } = action;
      if (result.isCorrect) {
        return {
          ...state,
          step: ActivityStep.KEYWORDS,
          attemptCount: result.attemptCount,
          retellingKeywords: result.retellingKeywords ?? [],
          orderRevealed: false,
          orderMismatched: false,
          slotResults: null,
        };
      }

      /**
       * 서버가 정답 순서를 실어 보냈다 = 재시도 한도에 닿았다. (D-10 · 3회)
       *
       * ⚠️ **횟수를 세서 판단하지 않는다.** `attemptCount >= 3`으로 분기하면 서버가
       *    한도를 바꿀 때 화면이 어긋난다. 이 필드의 유무가 서버의 통보다.
       *
       * D-3(오답 피드백)으로 보내지 않는다. 거기에는 "다시 해보기"가 있는데
       * 다음 시도가 없다. 정답 순서를 보여주고 곧바로 다음 단계로 넘긴다 —
       * 실패를 지적하지 않으면서 아이를 활동에 갇히게 두지도 않는 길이다.
       */
      if (result.correctOrder) {
        return {
          ...state,
          step: ActivityStep.KEYWORDS,
          attemptCount: result.attemptCount,
          retellingKeywords: result.retellingKeywords ?? [],
          orderRevealed: true,
          // 3회째에는 표시하지 않는다. 정답을 보여주며 넘어가는 판이다.
          // 다음 시도가 없는데 지적만 남기는 게 되므로 칸별 표시도 끈다.
          orderMismatched: false,
          slotResults: null,
          // 화면에 보여줄 순서를 정답으로 바꾼다. 돌아갈 길이 없으므로
          // 슬롯을 덮어써도 안전하고, 화면이 실제로 그 순서를 그린다.
          slots: arrangeBy(result.correctOrder, state) ?? state.slots,
          tray: [],
        };
      }

      return {
        ...state,
        step: ActivityStep.FEEDBACK,
        attemptCount: result.attemptCount,
        orderMismatched: true,
        // 서버가 칸별 정오를 줬으면 그걸 쓴다. 없으면 null로 두고
        // `orderMismatched`가 배치 전체를 표시한다.
        slotResults: result.slotResults ?? null,
      };
    }

    case "RETRY_ORDER":
      return {
        ...state,
        step: ActivityStep.CARD_ORDERING,
        orderRevealed: false,
      };

    case "GO_RETELLING":
      return {
        ...state,
        step: ActivityStep.RETELLING,
        spokenKeywords: [],
        retellingText: "",
        interimText: "",
        transcribing: false,
      };

    case "RECORDING_START":
      return {
        ...state,
        recording: true,
        transcribing: false,
        interimText: "",
        errorCode: null,
      };

    /**
     * 변환 중(①). D-5도 대화와 같은 구간을 갖는다.
     * 마이크를 끄고 문구를 바꾼다. 단계는 RETELLING 그대로다.
     */
    case "TRANSCRIBING":
      return { ...state, recording: false, transcribing: true };

    /**
     * 부분 전사. **브라우저 모드에서만 온다.** 백엔드 모드(2안)에는 interim result가
     * 없어서 실시간 점등이 불가능하고, 최종 결과 일괄 점등으로 폴백한다.
     * (docs/request/frontend/stt-tts-integration.md "D-5 키워드 실시간 점등")
     */
    case "INTERIM":
      return {
        ...state,
        interimText: action.text,
        spokenKeywords: detectKeywords(
          action.text,
          state.retellingKeywords,
          state.spokenKeywords
        ),
      };

    case "TRANSCRIBED": {
      const text = action.text.trim();
      if (!text) {
        return {
          ...state,
          recording: false,
          transcribing: false,
          errorCode: "no-speech",
        };
      }
      return {
        ...state,
        recording: false,
        transcribing: false,
        step: ActivityStep.REVIEW,
        retellingText: text,
        interimText: "",
        // 최종 결과로 훑는다. 백엔드 모드에서는 점등이 **여기서 처음** 일어나고,
        // 브라우저 모드에서는 부분 전사에서 놓친 것을 보정한다.
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
        transcribing: false,
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
      return {
        ...state,
        recording: false,
        transcribing: false,
        errorCode: action.code,
      };

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
