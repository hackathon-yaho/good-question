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
  missionDoneCount,
  playReducer,
  visibleMessages,
} from "@/features/play/machine";
import { IntroFullscreen } from "@/features/play/IntroFullscreen";
import { MissionCard } from "@/features/play/MissionCard";
import { Mission2Card } from "@/features/play/Mission2Card";
import { isChoiceMission } from "@/features/play/mission2";
import {
  DEFAULT_PLAY_SETTINGS,
  PauseSheet,
  type PlaySettings,
} from "@/features/play/PauseSheet";
import { CharacterStage } from "@/features/play/CharacterStage";
import { SceneStage } from "@/features/play/SceneStage";
import { SceneTransition } from "@/features/play/SceneTransition";
import {
  ChildTurnPanel,
  ConversationPanel,
  ConfirmPanel,
  MicErrorPanel,
  ThinkingPanel,
  WaitingPanel,
} from "@/features/play/panels";

import { WordPopup } from "@/features/play/WordPopup";
import { useNetworkError, withTimeout } from "@/features/system/NetworkErrorHost";
import { errorCodeOf } from "@/lib/api/errors";
import { playApi } from "@/lib/api";
import { contentApi as defaultContentApi } from "@/lib/api";
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
  api = playApi,
  contentApi = defaultContentApi,
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
   * 장면 id → 캐릭터 표시명. "이 캐릭터와 나눈 이야기 전체"를 모으는 데 쓴다.
   *
   * ── 왜 프론트가 모으나 ──────────────────────────────────────────
   * 서버가 주는 `messages[]`는 세션 전체지만 각 메시지에 **캐릭터 정보가 없다.**
   * `sceneId`만 있고, 캐릭터는 `currentScene`에만 실려 온다
   * (backend/docs/api-spec.md 6.1·5.2). 그래서 지난 장면의 대사가 누구 것인지
   * 응답만으로는 알 수 없다.
   *
   * 이야기를 이어서 진행하는 동안에는 장면이 로드될 때마다 그 짝을 볼 수 있으므로
   * 여기서 누적해 둔다. 같은 캐릭터가 여러 장면에 나오기 때문에(PRD I-13)
   * 이 매핑이 있어야 "며느리와 나눈 이야기"를 장면 3·9에서 함께 모을 수 있다.
   *
   * ⚠️ **이어하기로 중간 진입하면 지난 장면의 짝을 모른다.** 그때는 모르는 장면을
   *    **빼고** 보여준다 — 다른 캐릭터 대사를 섞는 것보다 덜 보여주는 쪽이 안전하다.
   *    서버가 `messages[].characterName`을 실어주면 이 한계가 사라진다.
   *    (docs/request/backend/message-character.md)
   */
  const sceneCharacterRef = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    if (scene?.sceneId && scene.characterDisplayName) {
      sceneCharacterRef.current.set(scene.sceneId, scene.characterDisplayName);
    }
  }, [scene?.sceneId, scene?.characterDisplayName]);

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

  /**
   * C-13 "이야기 나가기" · 도입에서 나가기.
   *
   * **세션을 `stopped`로 저장한 뒤** 홈으로 보낸다. 이 호출이 없으면 세션이
   * `in_progress`로 남아 홈의 이어하기 카드가 계속 떠 있고, 아이가 나갔다는
   * 사실이 서버에 남지 않는다. (api-spec 5.4)
   *
   * 실패해도 화면은 홈으로 보낸다 — 나가려는 아이를 붙잡아 둘 이유가 없다.
   */
  const exit = useCallback(() => {
    cancelTts();
    stt.stop();
    void api.stopSession(sessionId).catch((error) => {
      console.error("[play] 이야기 나가기 저장 실패", error);
    });
    router.push("/home");
  }, [api, cancelTts, router, sessionId, stt]);

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

  /**
   * 좌측에 장면 이미지를 보여줄지, 캐릭터 무대를 보여줄지.
   *
   * ⚠️ 기준이 `mission !== null`이 아니라 **`missionBriefOpen`** 이다. 미션은 4항목을
   *    도는 동안 계속 살아 있으므로, mission으로 판단하면 아이가 말하는 동안에도
   *    캐릭터 얼굴이 안 보인다. 브리프를 읽을 때만 장면 이미지를 보여준다.
   */
  const showScene =
    state.status === PlayState.SCENE_NARRATION || state.missionBriefOpen;

  /** 미션 체크리스트에서 완료로 표시할 항목 수 (machine.ts 주석 참조) */
  const missionDone = state.mission
    ? missionDoneCount(state.mission, state.missionTurns)
    : 0;

  /**
   * 미션 2는 **택 1** 방식이라 카드가 다르다 (화면 명세 C-11).
   * 판단 근거는 서버가 주는 `id`다 — `mission_2`는 계약에 박힌 고정 문자열이다.
   */
  const isMission2 = state.mission ? isChoiceMission(state.mission.id) : false;

  /**
   * 미션이 살아 있고 브리프가 닫혀 있으면 — 아이가 말하는 중이다.
   * 카드는 감추되 **지금 말할 항목은 한 줄로 남긴다.** 카드를 통째로 없애면
   * 방금 읽은 항목을 잊는다. (계획 D17)
   */
  const missionNowItem =
    state.mission && !state.missionBriefOpen
      ? (state.mission.checklist[missionDone]?.label ?? null)
      : null;

  /**
   * 이 장면에서 주고받은 대화만. 세션 전체를 보여주면 지난 장면의 다른 캐릭터
   * 대사가 섞여 누가 말했는지 알 수 없다.
   */
  /**
   * **이 캐릭터와 나눈 이야기 전체.** 지금 장면 것만이 아니다.
   *
   * 같은 캐릭터가 여러 장면에 나오므로(PRD I-13 · 방귀쟁이 며느리는 장면 1과 4에
   * 모두 등장) 그 캐릭터와의 대화를 모아 보여준다. 아이가 "이 친구와 무슨 이야기를
   * 했었지?"를 그 자리에서 확인할 수 있다.
   *
   * ⚠️ 다른 캐릭터 대사는 섞지 않는다. 누가 말했는지 알 수 없어진다.
   *    짝을 모르는 장면(이어하기로 중간 진입한 경우)도 뺀다 — 위 `sceneCharacterRef`
   *    주석 참조. 지금 장면은 매핑과 무관하게 언제나 포함한다.
   */
  const npcMessages = messages.filter((m) => {
    if (m.sceneId === scene.sceneId) return true;
    if (!displayName) return false;
    return sceneCharacterRef.current.get(m.sceneId) === displayName;
  });

  return (
    <ImmersiveShell
      topRight={topRight}
      overlay={overlay}
      glowing={state.status === PlayState.CHILD_TURN}
      fontScale={settings.fontScale}
      left={
        /**
         * 좌측은 두 가지다.
         *   서술 중(C-2) · 미션 노출 — 장면 이미지 + 자막
         *   그 외(C-3~C-6)          — 배경을 흐리고 캐릭터 얼굴·이름·대사
         *
         * 미션이 떠 있으면 대사를 좌측에 겹치지 않는다. 아이가 볼 것은 미션 내용이고,
         * 장면 이미지는 맥락으로 남긴다.
         */
        showScene ? (
          <SceneStage
            progress={progress}
            sceneLabel={`장면 ${progress?.current ?? 1}`}
            backgroundImageUrl={scene.backgroundImageUrl}
            subtitle={
              state.status === PlayState.SCENE_NARRATION
                ? currentSentence(state)
                : undefined
            }
            dimmed={dimmed}
            warm={warm}
          />
        ) : (
          <CharacterStage
            displayName={displayName}
            characterImageUrl={scene.characterImageUrl}
            backgroundImageUrl={scene.backgroundImageUrl}
            text={state.characterText}
            speaking={isCharacterTurn(state.status)}
            progress={progress}
            sceneLabel={`장면 ${progress?.current ?? 1}`}
            turnCount={state.turnCount}
            maxTurns={state.maxTurns}
            highlightWords={state.highlightWords}
            onWordClick={setOpenWord}
            onReplay={isCharacterTurn(state.status) ? replay : undefined}
            // 아이 차례가 되면 대사를 흐리게 해 시선을 우측 마이크로 보낸다
            dimmed={dimmed}
          />
        )
      }
      right={
        /**
         * 미션 브리프가 열려 있으면 우측은 **브리프 전용 화면**이다.
         *
         *   위 — 비어 있다 (셸의 "잠시 멈춤" 버튼이 숨 쉰다)
         *   중 — 미션 카드. `flex-1` + `items-center`로 **세로 중앙**
         *   아래 — [말해볼래요]. 카드 밖이다
         *
         * 마이크를 그리지 않는다. 보이면 "지금 말해도 되나?"를 아이가 판단해야 한다.
         * 카드가 중앙에 있으므로 잠시 멈춤 버튼(y=76px에서 끝)과 겹치지 않아
         * 예전의 회피용 `pr-28`이 필요 없다.
         */
        state.missionBriefOpen && state.mission ? (
          <div className="flex size-full min-h-0 flex-col">
            {/* `pt-20`(80px) — 셸의 "잠시 멈춤" 버튼이 y=24~68을 쓴다. 카드가 그
                아래에서만 커지게 해야 제목이 버튼에 가리지 않는다. 미션 1 카드는
                작아서 중앙 정렬만으로 피했지만, 미션 2는 친구 4장이 붙어 더 높다. */}
            <div className="flex min-h-0 flex-1 items-center px-6 pt-20">
              {isMission2 ? (
                <Mission2Card
                  title={state.mission.title}
                  selectedIndex={state.mission2Choice}
                  onSelect={(index) =>
                    dispatch({ type: "MISSION2_SELECT", index })
                  }
                  /* 한 번 말해 봤는데 미션이 다시 열렸다 = 관점 요소가 확정되지
                     않았다. 그때만 힌트를 붙인다 — 처음부터 보여주면 아이가
                     정해진 답을 찾으려 한다 (PRD 7.6) */
                  showHint={state.missionTurns >= 1}
                />
              ) : (
              <MissionCard
                mission={state.mission}
                doneCount={missionDone}
                /**
                 * 한 번 말해봤는데도 아직 남은 항목이 있으면 힌트를 준다.
                 * 프론트가 발화를 채점하는 것이 아니라 **서버가 준 턴 수**만 본다.
                 */
                showHint={state.turnCount >= 2}
              />
              )}
            </div>

            <div className="flex shrink-0 flex-col items-center gap-2 px-6 pb-5">
              <p className="text-parent-body text-muted">
                {isMission2 && state.mission2Choice === null
                  ? "친구를 고르면 말할 수 있어"
                  : "미션을 읽고 준비되면 눌러줘"}
              </p>
              {/* 채움 primary — 이 화면의 유일한 행동이고, 누르면 내 차례가
                  시작된다. §1-5가 primary를 "주요 CTA · 내 차례"로 정했다.
                  미션 2는 **고르기 전에는 누를 수 없다** — 문장 틀의 주어가 비어 있는
                  상태로 말하게 하면 무엇을 말해야 하는지 알 수 없다. */}
              <PillButton
                size="kid"
                disabled={isMission2 && state.mission2Choice === null}
                onClick={() => dispatch({ type: "MISSION_DISMISS" })}
              >
                말해볼래요
              </PillButton>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {state.status === PlayState.SCENE_NARRATION ? (
              <WaitingPanel displayName={scene.characterDisplayName} />
            ) : null}

            {isCharacterTurn(state.status) ? (
              <ConversationPanel
                displayName={displayName}
                messages={npcMessages}
                currentSceneId={scene.sceneId}
                accumulatedElements={state.accumulatedElements}
                guided={state.status === PlayState.GUIDED}
              />
            ) : null}

            {state.status === PlayState.CHILD_TURN ||
            state.status === PlayState.TRANSCRIBING ? (
              <ChildTurnPanel
                missionItem={missionNowItem}
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
                childText={messages.at(-1)?.text ?? ""}
                elapsedMs={displayedThinkingElapsed}
              />
            ) : null}

            {state.status === PlayState.MIC_ERROR ? (
              <MicErrorPanel
                onRetry={() => dispatch({ type: "RETRY_SPEAKING" })}
                // "건너뛰기"로 빈 발화를 서버에 보내지 않는다. (PRD 8.9, Q-09)
                // 메시지를 만들지 않고 아이 차례로 되돌린다.
                onSkip={() => dispatch({ type: "RETRY_SPEAKING" })}
              />
            ) : null}
          </div>
        )
      }
    />
  );
}
