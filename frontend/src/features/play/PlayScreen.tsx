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

import { WordPopup } from "@/features/play/WordPopup";
import { useNetworkError, withTimeout } from "@/features/system/NetworkErrorHost";
import { errorCodeOf } from "@/lib/api/errors";
import { mockPlayApi } from "@/lib/api/mock";
import { mockContentApi } from "@/lib/api/mock-content";
import type { ContentApi, HighlightWord, PlayApi } from "@/lib/api/types";
import { getSelectedChildId } from "@/lib/client-store";
import { STORY_ID } from "@/mocks/story-banggui";
import { PlayState, isCharacterTurn, type SceneType } from "@/lib/play-state";
import { playTurnChime } from "@/lib/sound";
import { RESPOND_TIMEOUT_MS } from "@/lib/api/speech";
import { useCharacterVoice, useChildSpeech } from "@/lib/speech";
import { TOTAL_SCREEN_SCENES, toScreenIndex } from "@/mocks/story-banggui";

/**
 * api는 **클라이언트 쪽에서 주입한다.** 서버 컴포넌트에서 메서드를 가진 객체를
 * prop으로 넘기면 "Functions cannot be passed directly to Client Components"로 터진다.
 * 실제 HTTP 클라이언트로 갈아탈 때도 여기 기본값만 바꾸면 된다.
 */
export function PlayScreen({
  sessionId,
  api = mockPlayApi,
  contentApi = mockContentApi,
}: {
  sessionId: string;
  api?: PlayApi;
  /** C-9 "단어장에 담기"용. 단어장이 선택 요건이라 대화 계약과 분리해 둔다. */
  contentApi?: ContentApi;
}) {
  const router = useRouter();
  const toast = useToast();
  const network = useNetworkError();
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
  /** C-9 단어 뜻 팝업. 열려 있는 동안 TTS·마이크는 그대로 둔다. */
  const [openWord, setOpenWord] = useState<HighlightWord | null>(null);
  const [savedWords, setSavedWords] = useState<readonly string[]>([]);

  const { speak, cancel: cancelTts, unlock: unlockAudio } = useCharacterVoice();

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
      .catch((error) => {
        console.error("[play] 세션 로드 실패", error);
        toast.show("이야기를 불러오지 못했어요", "danger");
      });
    return () => {
      alive = false;
    };
  }, [api, sessionId, toast]);

  // --- STT ① -----------------------------------------------------------
  // 2안에서는 녹음 종료(stop) → 업로드 → 텍스트가 별개 구간이다. onTranscribeStart가
  // 그 시작을 알린다. (docs/request/frontend/stt-tts-integration.md)
  const stt = useChildSpeech({
    maxDurationMs: 30_000,
    onTranscribeStart: () => dispatch({ type: "TRANSCRIBING" }),
    // 백엔드 모드에서는 오지 않는다. 여기에 기능을 의존하면 안 된다.
    onInterim: (text) => dispatch({ type: "INTERIM", text }),
    onFinal: (text) => dispatch({ type: "TRANSCRIBED", text }),
    onError: (code) => {
      // 변환 자체가 실패·타임아웃한 경우는 아이 잘못이 아니다. I-2("잘 안 들렸어")로
      // 보내면 원인을 아이에게 떠넘기는 문구가 된다. I-3을 띄우고 같은 발화를
      // 다시 녹음할 수 있게 되돌린다. (요청 문서 "상태별 처리" — 에러는 I-3)
      if (code === "stt-timeout" || code === "stt-failed") {
        network.show({ retry: () => dispatch({ type: "RETRY_SPEAKING" }) });
        return;
      }
      dispatch({ type: "STT_FAILED", code });
    },
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
  // 이름 있는 함수 표현식으로 둔다. 실패 시 재시도가 자기 자신을 다시 불러야 하는데,
  // ref에 담아 두면 React 19 린트가 "훅에 넘긴 값을 다시 대입한다"고 막는다.
  /**
   * 장면 전환. 두 경로가 하나로 합쳐져 있다.
   *
   *   서술 장면(intro·narrative) — `POST .../complete`로 넘긴 뒤 세션을 다시 읽는다
   *   대화 장면(dialogue)        — 서버가 이미 넘겨 놨다. **다시 읽기만** 한다
   *
   * dialogue에 `.../complete`를 부르면 400이 온다. 대화 종료 판단은 서버가
   * `POST .../messages` 안에서 하고 `session.advanceToScene()`까지 이미 실행한다.
   * (backend/docs/api-spec.md 5.3 · 6.1)
   *
   * 후속 활동 진입은 `status === "post_activity"`로 판단한다. 서버가 마지막 대화
   * 장면을 닫을 때 세션 상태를 그렇게 바꾼다 — 프론트가 장면 수를 세지 않는다.
   */
  const advanceScene = useCallback(
    async function advance(
      sceneId: string,
      sceneType: SceneType
    ): Promise<void> {
      if (advancingRef.current) return;
      advancingRef.current = true;
      setAdvancing(true);
      try {
        if (sceneType !== "dialogue") {
          await withTimeout(api.completeScene(sessionId, sceneId));
        }
        // 자막(sceneDescription)이 complete 응답에 없어서 어느 경로든 다시 읽는다.
        const snapshot = await withTimeout(api.getSession(sessionId));

        if (snapshot.status === "post_activity") {
          dispatch({ type: "POST_ACTIVITY_READY" });
          router.push(`/activity/${sessionId}`);
          return;
        }
        dispatch({ type: "SCENE_LOADED", snapshot });
      } catch (error) {
        console.error("[play] 장면 전환 실패", error);
        // 이미 넘어간 장면을 다시 넘기려 한 경우(409)는 재시도해도 같다.
        // 세션을 다시 읽어 화면을 최신으로 맞추는 것이 해소 방법이다.
        if (errorCodeOf(error) === "SCENE_ALREADY_CLOSED") {
          try {
            const snapshot = await api.getSession(sessionId);
            if (snapshot.status === "post_activity") {
              router.push(`/activity/${sessionId}`);
            } else {
              dispatch({ type: "SCENE_LOADED", snapshot });
            }
            return;
          } catch {
            // 재조회도 실패했다. 아래 I-3으로 넘긴다.
          }
        }
        // 장면 전환이 막히면 이야기가 더 진행되지 않는다. 토스트로는 부족하다.
        // I-3을 띄우고 같은 요청을 그대로 다시 보낼 수 있게 한다. (명세 I-3)
        network.show({ retry: () => advance(sceneId, sceneType) });
      } finally {
        advancingRef.current = false;
        setAdvancing(false);
      }
    },
    [api, network, router, sessionId]
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
      // 자막은 메시지가 아니라 messageId가 없다. 텍스트로 음성을 요청한다.
      speak(
        { text: currentSentence(state) },
        { rate: settings.rate, volume: settings.volume }
      );
      return;
    }

    // 전개(C-2)는 자막이 끝나면 자동으로 캐릭터 발화로 넘어간다.
    if (state.status === PlayState.SCENE_NARRATION) {
      const key = `narr:${scene.sceneId}:${state.sentenceIndex}`;
      if (spokenKeyRef.current === key) return;
      spokenKeyRef.current = key;

      speak(
        { text: currentSentence(state) },
        {
          rate: settings.rate,
          volume: settings.volume,
          onDone: () => {
            if (isLastSentence(state)) void advanceScene(scene.sceneId, scene.sceneType);
            else dispatch({ type: "SENTENCE_NEXT" });
          },
        }
      );
      return;
    }

    // 캐릭터 발화(C-3 / C-7). TTS가 끝나면 아이 차례로 넘긴다.
    if (isCharacterTurn(state.status) && state.characterText) {
      const key = `char:${scene.sceneId}:${state.turnCount}:${state.characterText}`;
      if (spokenKeyRef.current === key) return;
      spokenKeyRef.current = key;

      // messageId가 있으면 백엔드 캐시를 탄다. 고정 대사는 프리워밍되어 즉시 온다.
      speak(
        { text: state.characterText, messageId: state.characterMessageId },
        {
          rate: settings.rate,
          volume: settings.volume,
          onDone: () => {
            playTurnChime(settings.volume);
            dispatch({ type: "CHARACTER_TTS_DONE" });
          },
        }
      );
      return;
    }

    // C-12는 고정 마지막 대사를 읽고 멈춘다. "계속하기"를 아이가 누른다.
    if (state.status === PlayState.SCENE_TRANSITION && state.characterText) {
      const key = `close:${scene.sceneId}:${state.characterText}`;
      if (spokenKeyRef.current === key) return;
      spokenKeyRef.current = key;
      speak(
        { text: state.characterText, messageId: state.characterMessageId },
        { rate: settings.rate, volume: settings.volume }
      );
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
      const result = await withTimeout(
        api.submitUtterance(sessionId, {
          text,
          sttRawText: state.sttRawText || undefined,
        }),
        // ②의 예산은 10초다. 요청이 셋으로 갈리면서 구간별 예산이 나뉘었다.
        // (docs/request/frontend/stt-tts-integration.md · Q-14)
        RESPOND_TIMEOUT_MS
      );
      // 기다리는 동안 장면이 바뀌었으면 이 응답은 지난 장면의 것이다. 버린다.
      if (currentSceneIdRef.current !== submittedSceneId) return;
      dispatch({ type: "SERVER_RESULT", result });
    } catch (error) {
      // 조용히 삼키면 원인을 못 찾는다. 아이 화면에는 부드러운 문구만 보여주고
      // 개발자용 정보는 콘솔에 남긴다.
      console.error("[play] 발화 제출 실패", error);
      // 지난 장면의 실패로 지금 장면의 상태를 되돌리지 않는다.
      if (currentSceneIdRef.current !== submittedSceneId) return;
      // 아이가 한 말이 사라지지 않게, 같은 발화를 그대로 다시 보내는 재시도를 준다.
      network.show({
        retry: async () => {
          dispatch({ type: "TRANSCRIBED", text });
          submittingRef.current = false;
        },
      });
    } finally {
      submittingRef.current = false;
    }
  }, [api, network, scene?.sceneId, sessionId, state.draftText, state.sttRawText, stt]);

  /**
   * C-9 "단어장에 담기". 단어장은 선택 요건이라 실패해도 대화는 계속되어야 한다.
   * 그래서 여기서 던지지 않고 WordPopup이 토스트만 띄운다.
   */
  const saveWord = useCallback(
    async (word: HighlightWord) => {
      const childId = getSelectedChildId();
      if (!childId) throw new Error("선택된 아이가 없습니다");
      await contentApi.saveWord(childId, {
        word: word.word,
        meaning: word.meaning,
        storyId: STORY_ID,
        sourceSceneId: scene?.sceneId ?? "",
        contextSentence: state.characterText || null,
      });
      setSavedWords((prev) => [...prev, word.word]);
    },
    [contentApi, scene?.sceneId, state.characterText]
  );

  /** C-3 "다시 듣기". 같은 오디오를 다시 재생한다 — 재요청하지 않는다. */
  const replay = useCallback(() => {
    if (!state.characterText) return;
    speak(
      { text: state.characterText, messageId: state.characterMessageId },
      {
        rate: settings.rate,
        volume: settings.volume,
        onDone: () => dispatch({ type: "CHARACTER_TTS_DONE" }),
      }
    );
  }, [settings, speak, state.characterMessageId, state.characterText]);

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
    <>
      <PauseSheet
        open={paused}
        settings={settings}
        onChange={setSettings}
        onResume={resume}
        onExit={exit}
      />
      <WordPopup
        word={openWord}
        contextSentence={state.characterText || null}
        saved={openWord ? savedWords.includes(openWord.word) : false}
        // 단어 발음은 메시지가 아니라 messageId가 없다. 텍스트로 요청한다.
        onSpeak={(text, opts) =>
          speak(
            { text },
            { rate: opts?.rate ?? settings.rate, volume: settings.volume }
          )
        }
        onSave={saveWord}
        onClose={() => setOpenWord(null)}
      />
    </>
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
            unlockAudio();
            setAudioUnlocked(true);
            if (isLastSentence(state)) void advanceScene(scene.sceneId, scene.sceneType);
            else dispatch({ type: "SENTENCE_NEXT" });
          }}
          onExit={exit}
          needsStart={!audioUnlocked}
          onStart={() => {
            // iOS는 이 탭 안에서 오디오를 열어야 이후 자동 재생이 통한다.
            unlockAudio();
            setAudioUnlocked(true);
          }}
          onReplay={() => {
            unlockAudio();
            setAudioUnlocked(true);
            speak(
              { text: currentSentence(state) },
              { rate: settings.rate, volume: settings.volume }
            );
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
          onContinue={() => void advanceScene(scene.sceneId, scene.sceneType)}
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
          {/* 높이를 묶어 둔다. shrink-0가 없으면 flex가 이 상자를 눌러버리고,
              안쪽 카드는 고유 높이를 유지해 아래 패널로 넘친다.
              50%는 실측으로 정했다. 4단계 체크리스트를 2×2로 다 보여주는 데
              48%가 필요하고, 남은 절반으로 마이크가 120px 넘게 확보된다.
              더 키우면 마이크가 §1-4의 72px 하한에 가까워진다. */}
          {state.mission ? (
            <div className="flex max-h-[50%] shrink-0 flex-col overflow-hidden pt-4">
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
                highlightWords={state.highlightWords}
                onWordClick={setOpenWord}
                // 미션이 함께 떠 있으면 지난 기록과 비활성 마이크를 접는다.
                compact={state.mission !== null}
              />
            ) : null}

            {state.status === PlayState.CHILD_TURN ||
            state.status === PlayState.TRANSCRIBING ? (
              <ChildTurnPanel
                displayName={displayName}
                previousText={state.characterText}
                recording={state.recording}
                transcribing={state.status === PlayState.TRANSCRIBING}
                interimText={state.interimText}
                micLevel={displayedMicLevel}
                onMicClick={startRecording}
                onSubmit={() => stt.stop()}
                // 변환 중에는 누를 수 없다. 백엔드 모드에는 interimText가 없어
                // 녹음 여부만으로 판단해야 한다.
                submitDisabled={
                  state.status === PlayState.TRANSCRIBING ||
                  (!state.recording && !state.interimText.trim())
                }
                // 미션이 함께 떠 있으면 지난 대사 줄을 접어 마이크 자리를 낸다.
                compact={state.mission !== null}
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
