/**
 * /play/{sessionId} 오케스트레이션 — docs/spec/screens.md §C
 *
 * 이 컴포넌트가 상태머신·TTS·STT·서버 호출을 잇는다.
 * 상태 전이 규칙은 machine.ts에, 서버 판단은 api에, 화면은 panels에 있다.
 * 여기서 발화 내용을 보고 진행을 판단하지 않는다. (§0-2)
 */

"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ImmersiveShell } from "@/components/shells/ImmersiveShell";
import { PillButton } from "@/components/ui/PillButton";
import { useToast } from "@/components/ui/Toast";

import {
  currentSentence,
  initialPlayState,
  isLastSentence,
  playReducer,
  visibleMessages,
} from "@/features/play/machine";
import { IntroFullscreen } from "@/features/play/IntroFullscreen";
import { MissionCard } from "@/features/play/MissionCard";
import {
  DEFAULT_PLAY_SETTINGS,
  PauseSheet,
  type PlaySettings,
} from "@/features/play/PauseSheet";
import { SceneStage } from "@/features/play/SceneStage";
import { SceneTransition } from "@/features/play/SceneTransition";
import {
  CharacterPanel,
  ChildTurnPanel,
  ConfirmPanel,
  MicErrorPanel,
  ThinkingPanel,
  WaitingPanel,
} from "@/features/play/panels";

import { mockPlayApi } from "@/lib/api/mock";
import type { PlayApi } from "@/lib/api/types";
import { PlayState, isCharacterTurn } from "@/lib/play-state";
import { playTurnChime } from "@/lib/sound";
import { useSpeechRecognition } from "@/lib/speech/useSpeechRecognition";
import { useSpeechSynthesis } from "@/lib/speech/useSpeechSynthesis";
import { TOTAL_SCREEN_SCENES, toScreenIndex } from "@/mocks/story-banggui";

/**
 * api는 **클라이언트 쪽에서 주입한다.** 서버 컴포넌트에서 메서드를 가진 객체를
 * prop으로 넘기면 "Functions cannot be passed directly to Client Components"로 터진다.
 * 실제 HTTP 클라이언트로 갈아탈 때도 여기 기본값만 바꾸면 된다.
 */
export function PlayScreen({
  sessionId,
  api = mockPlayApi,
}: {
  sessionId: string;
  api?: PlayApi;
}) {
  const router = useRouter();
  const toast = useToast();
  const [state, dispatch] = useReducer(playReducer, initialPlayState);

  const [paused, setPaused] = useState(false);
  const [settings, setSettings] = useState<PlaySettings>(DEFAULT_PLAY_SETTINGS);
  const [thinkingElapsed, setThinkingElapsed] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  /** 장면 전환 중 버튼을 잠그기 위한 표시용 상태. 중복 실행 방지는 ref가 맡는다. */
  const [advancing, setAdvancing] = useState(false);
  /**
   * 사용자 제스처가 한 번이라도 있었는지.
   * 브라우저 자동재생 정책 때문에 이게 false면 speechSynthesis가 조용히 차단된다.
   * 이야기 상세(B-3)에서 넘어오면 제스처가 이어지지만 주소 직접 입력은 아니다.
   */
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const { speak, cancel: cancelTts, speaking } = useSpeechSynthesis();

  // 이미 읽은 문장을 다시 읽지 않기 위한 키. 리렌더마다 speak가 재실행되면 소리가 겹친다.
  const spokenKeyRef = useRef<string | null>(null);
  const advancingRef = useRef(false);
  /** 발화 제출이 떠 있는 동안 두 번째 제출을 막는다. */
  const submittingRef = useRef(false);

  const scene = state.scene;
  const displayName = scene?.characterDisplayName ?? "";

  /**
   * 지금 화면에 떠 있는 장면. 응답이 늦게 도착했을 때 "아직 같은 장면인가"를
   * 판단하는 데 쓴다. 클로저에 갇힌 값이 아니라 최신 값이어야 한다.
   */
  const currentSceneIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentSceneIdRef.current = scene?.sceneId ?? null;
  }, [scene?.sceneId]);

  // --- 세션 로드 --------------------------------------------------------
  useEffect(() => {
    let alive = true;
    api
      .getSession(sessionId)
      .then((snapshot) => {
        if (alive) dispatch({ type: "HYDRATE", snapshot });
      })
      .catch(() => toast.show("이야기를 불러오지 못했어요", "danger"));
    return () => {
      alive = false;
    };
  }, [api, sessionId, toast]);

  // --- STT --------------------------------------------------------------
  const stt = useSpeechRecognition({
    maxDurationMs: 30_000,
    onInterim: (text) => dispatch({ type: "INTERIM", text }),
    onFinal: (text) => dispatch({ type: "TRANSCRIBED", text }),
    onError: (code) => dispatch({ type: "STT_FAILED", code }),
  });

  const startRecording = useCallback(() => {
    dispatch({ type: "RECORDING_START" });
    stt.start();
  }, [stt]);

  // 녹음 중 웨이브폼용 값. Web Speech API는 오디오 레벨을 주지 않으므로
  // 실제 음량이 아니라 "움직이고 있다"는 신호다. 원본 음성을 다루지 않아
  // 요건(PRD 10.3)에도 어긋나지 않는다.
  //
  // 녹음이 끝나면 state를 되돌리지 않고 렌더에서 0으로 덮는다.
  // 이펙트 본문에서 setState를 호출하면 연쇄 렌더가 난다.
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

  // --- 다음 장면으로 진행 ------------------------------------------------
  const advanceScene = useCallback(
    async (sceneId: string) => {
      if (advancingRef.current) return;
      advancingRef.current = true;
      setAdvancing(true);
      try {
        const result = await api.completeScene(sessionId, sceneId);
        if (result.postActivityReady || !result.nextScene) {
          dispatch({ type: "POST_ACTIVITY_READY" });
          router.push(`/activity/${sessionId}`);
          return;
        }
        const { openingMessage, ...nextScene } = result.nextScene;
        dispatch({ type: "SCENE_LOADED", scene: nextScene, openingMessage });
      } catch (error) {
        console.error("[play] 장면 전환 실패", error);
        toast.show("다음 장면을 불러오지 못했어요", "danger");
      } finally {
        advancingRef.current = false;
        setAdvancing(false);
      }
    },
    [api, router, sessionId, toast]
  );

  // --- 자막·대사 TTS ----------------------------------------------------
  useEffect(() => {
    if (paused || !scene) return;

    // 도입(C-1)은 아이가 "다음"으로 넘긴다. 자동 진행하지 않는다.
    if (state.status === PlayState.INTRO) {
      // 제스처 전에 speak를 부르면 조용히 차단되고 spokenKey만 소모된다.
      if (!audioUnlocked) return;
      const key = `intro:${scene.sceneId}:${state.sentenceIndex}`;
      if (spokenKeyRef.current === key) return;
      spokenKeyRef.current = key;
      speak(currentSentence(state), {
        rate: settings.rate,
        volume: settings.volume,
      });
      return;
    }

    // 전개(C-2)는 자막이 끝나면 자동으로 캐릭터 발화로 넘어간다.
    if (state.status === PlayState.SCENE_NARRATION) {
      const key = `narr:${scene.sceneId}:${state.sentenceIndex}`;
      if (spokenKeyRef.current === key) return;
      spokenKeyRef.current = key;

      speak(currentSentence(state), {
        rate: settings.rate,
        volume: settings.volume,
        onDone: () => {
          if (isLastSentence(state)) void advanceScene(scene.sceneId);
          else dispatch({ type: "SENTENCE_NEXT" });
        },
      });
      return;
    }

    // 캐릭터 발화(C-3 / C-7). TTS가 끝나면 아이 차례로 넘긴다.
    if (isCharacterTurn(state.status) && state.characterText) {
      const key = `char:${scene.sceneId}:${state.turnCount}:${state.characterText}`;
      if (spokenKeyRef.current === key) return;
      spokenKeyRef.current = key;

      speak(state.characterText, {
        rate: settings.rate,
        volume: settings.volume,
        onDone: () => {
          playTurnChime(settings.volume);
          dispatch({ type: "CHARACTER_TTS_DONE" });
        },
      });
      return;
    }

    // C-12는 고정 마지막 대사를 읽고 멈춘다. "계속하기"를 아이가 누른다.
    if (state.status === PlayState.SCENE_TRANSITION && state.characterText) {
      const key = `close:${scene.sceneId}:${state.characterText}`;
      if (spokenKeyRef.current === key) return;
      spokenKeyRef.current = key;
      speak(state.characterText, {
        rate: settings.rate,
        volume: settings.volume,
      });
    }
  }, [advanceScene, audioUnlocked, paused, scene, settings, speak, state]);

  // CHILD_TURN에 들어오면 마이크를 자동 활성화한다.
  // 캐릭터 발화가 끝난 뒤여야 한다. 발화 중 켜면 캐릭터 음성이 녹음된다. (작업 분장 2.3)
  useEffect(() => {
    if (paused) return;
    if (state.status !== PlayState.CHILD_TURN) return;
    if (state.recording || state.draftText) return;
    startRecording();
    // startRecording은 매 렌더 새로 만들어지지 않으므로 안전하다.
  }, [paused, startRecording, state.draftText, state.recording, state.status]);

  // C-6 경과 시간. 8초를 넘기면 문구를 바꾼다.
  // 여기서도 리셋은 렌더에서 덮는다.
  useEffect(() => {
    if (state.status !== PlayState.THINKING) return;
    const started = performance.now();
    const timer = setInterval(
      () => setThinkingElapsed(performance.now() - started),
      500
    );
    return () => clearInterval(timer);
  }, [state.status]);
  const displayedThinkingElapsed =
    state.status === PlayState.THINKING ? thinkingElapsed : 0;

  // --- 발화 제출 --------------------------------------------------------
  const submit = useCallback(async () => {
    // 중복 제출을 막는다. 이게 없으면 같은 발화가 두 번 올라가고,
    // 늦게 온 두 번째 응답이 이미 넘어간 장면을 덮어 아이가 갇힌다.
    if (submittingRef.current) return;

    const text = state.draftText.trim();
    if (!text) return;

    // 제출 당시의 장면. 응답이 돌아왔을 때 아직 이 장면인지 확인하는 기준이다.
    const submittedSceneId = scene?.sceneId ?? null;
    submittingRef.current = true;

    stt.stop();
    dispatch({ type: "SUBMIT" });

    try {
      const result = await api.submitUtterance(sessionId, {
        text,
        sttRawText: state.sttRawText || undefined,
      });
      // 기다리는 동안 장면이 바뀌었으면 이 응답은 지난 장면의 것이다. 버린다.
      if (currentSceneIdRef.current !== submittedSceneId) return;
      dispatch({ type: "SERVER_RESULT", result });
    } catch (error) {
      // 조용히 삼키면 원인을 못 찾는다. 아이 화면에는 부드러운 문구만 보여주고
      // 개발자용 정보는 콘솔에 남긴다.
      console.error("[play] 발화 제출 실패", error);
      // 지난 장면의 실패로 지금 장면의 상태를 되돌리지 않는다.
      if (currentSceneIdRef.current !== submittedSceneId) return;
      toast.show("잠깐 연결이 끊겼어요. 다시 해볼까?", "danger");
      dispatch({ type: "RETRY_SPEAKING" });
    } finally {
      submittingRef.current = false;
    }
  }, [api, scene?.sceneId, sessionId, state.draftText, state.sttRawText, stt, toast]);

  const replay = useCallback(() => {
    if (!state.characterText) return;
    speak(state.characterText, {
      rate: settings.rate,
      volume: settings.volume,
      onDone: () => dispatch({ type: "CHARACTER_TTS_DONE" }),
    });
  }, [settings, speak, state.characterText]);

  const exit = useCallback(() => {
    cancelTts();
    stt.stop();
    router.push("/home");
  }, [cancelTts, router, stt]);

  const openPause = useCallback(() => {
    cancelTts();
    stt.stop();
    setPaused(true);
  }, [cancelTts, stt]);

  const resume = useCallback(() => {
    // 멈춘 문장을 다시 읽게 하려면 키를 비워야 한다.
    spokenKeyRef.current = null;
    setPaused(false);
  }, []);

  const messages = useMemo(() => visibleMessages(state), [state]);
  const progress = scene
    ? { current: toScreenIndex(scene.sceneOrder), total: TOTAL_SCREEN_SCENES }
    : undefined;

  if (!scene) {
    return (
      <ImmersiveShell variant="full" fontScale={settings.fontScale}>
        <div className="flex size-full items-center justify-center">
          <p className="text-kid-body text-muted">이야기를 불러오고 있어요…</p>
        </div>
      </ImmersiveShell>
    );
  }

  const topRight = (
    <PillButton variant="outlined" onClick={openPause}>
      잠시 멈춤
    </PillButton>
  );

  const overlay = (
    <PauseSheet
      open={paused}
      settings={settings}
      onChange={setSettings}
      onResume={resume}
      onExit={exit}
    />
  );

  // C-1 도입 — 풀브리드
  if (state.status === PlayState.INTRO) {
    return (
      <ImmersiveShell
        variant="full"
        overlay={overlay}
        fontScale={settings.fontScale}
      >
        <IntroFullscreen
          sentence={currentSentence(state)}
          index={state.sentenceIndex}
          total={state.sentences.length}
          backgroundImageUrl={scene.backgroundImageUrl}
          onNext={() => {
            // 게이트를 건너뛰고 바로 넘긴 경우에도 이후 문장은 소리가 나야 한다.
            setAudioUnlocked(true);
            if (isLastSentence(state)) void advanceScene(scene.sceneId);
            else dispatch({ type: "SENTENCE_NEXT" });
          }}
          onExit={exit}
          needsStart={!audioUnlocked}
          onStart={() => setAudioUnlocked(true)}
          onReplay={() => {
            setAudioUnlocked(true);
            speak(currentSentence(state), {
              rate: settings.rate,
              volume: settings.volume,
            });
          }}
        />
      </ImmersiveShell>
    );
  }

  // C-12 장면 전환 — 풀브리드
  if (state.status === PlayState.SCENE_TRANSITION) {
    const nextIndex = state.nextSceneId
      ? toScreenIndex(scene.sceneOrder + 1)
      : null;
    return (
      <ImmersiveShell
        variant="full"
        topRight={topRight}
        overlay={overlay}
        fontScale={settings.fontScale}
      >
        <SceneTransition
          displayName={displayName}
          closingText={state.characterText}
          accumulatedElements={state.accumulatedElements}
          nextScreenIndex={nextIndex}
          onContinue={() => void advanceScene(scene.sceneId)}
          continueDisabled={advancing}
        />
      </ImmersiveShell>
    );
  }

  const dimmed = state.status === PlayState.CHILD_TURN;
  const warm = state.status === PlayState.GUIDED;

  return (
    <ImmersiveShell
      topRight={topRight}
      overlay={overlay}
      glowing={state.status === PlayState.CHILD_TURN}
      fontScale={settings.fontScale}
      left={
        <SceneStage
          progress={progress}
          sceneLabel={`장면 ${progress?.current ?? 1}`}
          chip={
            state.status === PlayState.SCENE_NARRATION
              ? "이야기 듣는 중"
              : undefined
          }
          backgroundImageUrl={scene.backgroundImageUrl}
          subtitle={
            state.status === PlayState.SCENE_NARRATION
              ? currentSentence(state)
              : undefined
          }
          dimmed={dimmed}
          warm={warm}
        />
      }
      right={
        <>
          {state.mission ? (
            <div className="border-b border-border pt-4">
              <MissionCard
                mission={state.mission}
                onDismiss={() => dispatch({ type: "MISSION_DISMISS" })}
              />
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col">
            {state.status === PlayState.SCENE_NARRATION ? (
              <WaitingPanel displayName={scene.characterDisplayName} />
            ) : null}

            {isCharacterTurn(state.status) ? (
              <CharacterPanel
                displayName={displayName}
                text={state.characterText}
                turnCount={state.turnCount}
                maxTurns={state.maxTurns}
                messages={messages}
                accumulatedElements={state.accumulatedElements}
                guided={state.status === PlayState.GUIDED}
                onReplay={replay}
                replayDisabled={speaking}
              />
            ) : null}

            {state.status === PlayState.CHILD_TURN ||
            state.status === PlayState.TRANSCRIBING ? (
              <ChildTurnPanel
                displayName={displayName}
                previousText={state.characterText}
                recording={state.recording}
                interimText={state.interimText}
                micLevel={displayedMicLevel}
                onMicClick={startRecording}
                onSubmit={() => stt.stop()}
                submitDisabled={
                  !state.recording && !state.interimText.trim()
                }
              />
            ) : null}

            {state.status === PlayState.CONFIRM ? (
              <ConfirmPanel
                draftText={state.draftText}
                onChange={(text) => dispatch({ type: "DRAFT_CHANGE", text })}
                onRetry={() => dispatch({ type: "RETRY_SPEAKING" })}
                onSubmit={() => void submit()}
              />
            ) : null}

            {state.status === PlayState.THINKING ? (
              <ThinkingPanel
                displayName={displayName}
                childText={messages.at(-1)?.text ?? ""}
                elapsedMs={displayedThinkingElapsed}
              />
            ) : null}

            {state.status === PlayState.MIC_ERROR ? (
              <MicErrorPanel
                displayName={displayName}
                onRetry={() => dispatch({ type: "RETRY_SPEAKING" })}
                // "건너뛰기"로 빈 발화를 서버에 보내지 않는다. (PRD 8.9, Q-09)
                // 메시지를 만들지 않고 아이 차례로 되돌린다.
                onSkip={() => dispatch({ type: "RETRY_SPEAKING" })}
              />
            ) : null}
          </div>
        </>
      }
    />
  );
}
