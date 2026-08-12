/**
 * /activity/{sessionId} 오케스트레이션 — docs/spec/screens.md §D
 *
 * D-1 ~ D-7은 이 한 페이지의 단계다. 라우트를 더 만들지 않는다.
 * 진입 시 서버가 세션을 post_activity로 바꾼다.
 */

"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ImmersiveShell } from "@/components/shells/ImmersiveShell";
import { useToast } from "@/components/ui/Toast";

import {
  activityReducer,
  initialActivityState,
  isOrderComplete,
  submittedOrder,
} from "@/features/activity/machine";
import { CardOrdering } from "@/features/activity/CardOrdering";
import {
  ActivityComplete,
  ActivityIntro,
  FeedbackModal,
  KeywordReveal,
  Retelling,
  ReviewPanel,
} from "@/features/activity/steps";

import { mockActivityApi } from "@/lib/api/mock";
import type { ActivityApi } from "@/lib/api/types";
import { ActivityStep } from "@/lib/play-state";
import { useCharacterVoice, useChildSpeech } from "@/lib/speech";

export function ActivityScreen({
  sessionId,
  api = mockActivityApi,
}: {
  sessionId: string;
  api?: ActivityApi;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, dispatch] = useReducer(activityReducer, initialActivityState);
  const [submitting, setSubmitting] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  const { speak, cancel: cancelTts, speaking } = useCharacterVoice();
  const submittingRef = useRef(false);

  // --- 활동 데이터 로드 --------------------------------------------------
  useEffect(() => {
    let alive = true;
    api
      .getActivity(sessionId)
      .then((snapshot) => {
        if (alive)
          dispatch({
            type: "HYDRATE",
            cards: snapshot.cards,
            attemptCount: snapshot.attemptCount,
          });
      })
      .catch(() => toast.show("활동을 불러오지 못했어요", "danger"));
    return () => {
      alive = false;
    };
  }, [api, sessionId, toast]);

  // --- STT — D-5 재구성 발화 --------------------------------------------
  // 60초까지 허용한다. C-4는 30초였지만 여기는 이야기 전체를 말한다. (D-5 체크리스트)
  const stt = useChildSpeech({
    maxDurationMs: 60_000,
    onTranscribeStart: () => dispatch({ type: "TRANSCRIBING" }),
    // 백엔드 모드에서는 오지 않는다. 실시간 점등은 브라우저 모드 전용이다.
    onInterim: (text) => dispatch({ type: "INTERIM", text }),
    onFinal: (text) => dispatch({ type: "TRANSCRIBED", text }),
    onError: (code) => dispatch({ type: "STT_FAILED", code }),
  });

  const startRecording = useCallback(() => {
    dispatch({ type: "RECORDING_START" });
    stt.start();
  }, [stt]);

  useEffect(() => {
    if (!state.recording) return;
    let frame = 0;
    const timer = setInterval(() => {
      frame += 1;
      setMicLevel(0.45 + 0.4 * Math.abs(Math.sin(frame / 3)));
    }, 90);
    return () => clearInterval(timer);
  }, [state.recording]);
  const displayedMicLevel = state.recording ? micLevel : 0;

  // --- 카드 순서 제출 ---------------------------------------------------
  const submitOrder = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    dispatch({ type: "SUBMIT_ORDER" });

    try {
      // 정답 판정은 서버가 한다. 프론트는 순서만 보내고 결과를 받는다.
      const result = await api.submitOrder(sessionId, submittedOrder(state));
      dispatch({ type: "ORDER_RESULT", result });
    } catch {
      toast.show("잠깐 연결이 끊겼어요", "danger");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [api, sessionId, state, toast]);

  // --- 재구성 발화 제출 -------------------------------------------------
  const submitRetelling = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    try {
      const result = await api.submitRetelling(sessionId, {
        retellingText: state.retellingText,
      });
      dispatch({ type: "RETELLING_RESULT", result });
    } catch {
      toast.show("잠깐 연결이 끊겼어요", "danger");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [api, sessionId, state.retellingText, toast]);

  const exit = useCallback(
    (path: string) => {
      cancelTts();
      stt.stop();
      router.push(path);
    },
    [cancelTts, router, stt]
  );

  const orderedSlots = state.slots;

  return (
    <ImmersiveShell variant="full">
      {state.step === ActivityStep.INTRO ? (
        <ActivityIntro onStart={() => dispatch({ type: "START" })} />
      ) : null}

      {state.step === ActivityStep.CARD_ORDERING ||
      state.step === ActivityStep.FEEDBACK ? (
        <>
          <CardOrdering
            tray={state.tray}
            slots={orderedSlots}
            attemptCount={state.attemptCount}
            hintCardId={state.hintCardId}
            submitting={submitting}
            canSubmit={isOrderComplete(state)}
            onPlace={(cardId, slotIndex) =>
              dispatch({ type: "PLACE", cardId, slotIndex })
            }
            onRemove={(slotIndex) => dispatch({ type: "REMOVE", slotIndex })}
            onSubmit={() => void submitOrder()}
          />

          {/* D-3은 D-2 위에 얹히는 모달이다. 뒤 화면이 유지된다. */}
          <FeedbackModal
            open={state.step === ActivityStep.FEEDBACK}
            onRetry={() => dispatch({ type: "RETRY_ORDER" })}
            onHint={() => dispatch({ type: "RETRY_ORDER" })}
          />
        </>
      ) : null}

      {state.step === ActivityStep.KEYWORDS ? (
        <KeywordReveal
          slots={orderedSlots}
          keywords={state.retellingKeywords}
          onNext={() => dispatch({ type: "GO_RETELLING" })}
        />
      ) : null}

      {state.step === ActivityStep.RETELLING ? (
        <Retelling
          cards={orderedSlots}
          keywords={state.retellingKeywords}
          spokenKeywords={state.spokenKeywords}
          recording={state.recording}
          transcribing={state.transcribing}
          interimText={state.interimText}
          micLevel={displayedMicLevel}
          errorCode={state.errorCode}
          onMicClick={startRecording}
          onDone={() => stt.stop()}
        />
      ) : null}

      {state.step === ActivityStep.REVIEW ? (
        <ReviewPanel
          text={state.retellingText}
          keywords={state.retellingKeywords}
          speaking={speaking}
          // 원본 음성을 저장하지 않으므로 TTS로 읽어준다. (Q-07)
          // 아이가 방금 말한 문장이라 메시지가 아니다 — 텍스트로 음성을 요청한다.
          onListen={() => speak({ text: state.retellingText })}
          onRetell={() => dispatch({ type: "RETELL_AGAIN" })}
          onComplete={() => void submitRetelling()}
          submitting={submitting}
        />
      ) : null}

      {state.step === ActivityStep.COMPLETE && state.result ? (
        <ActivityComplete
          result={state.result}
          onHome={() => exit("/home")}
          onWordbook={() => exit("/wordbook")}
        />
      ) : null}
    </ImmersiveShell>
  );
}
