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
import { KidLoadingScreen } from "@/components/ui/KidLoadingScreen";
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
import { MissionCompleteOverlay } from "@/features/play/MissionCompleteOverlay";
import {
  DEFAULT_PLAY_SETTINGS,
  PauseSheet,
  type PlaySettings,
} from "@/features/play/PauseSheet";
import { CharacterStage } from "@/features/play/CharacterStage";
import { SceneStage } from "@/features/play/SceneStage";
import { SceneTransition } from "@/features/play/SceneTransition";
import {
  clearTransition,
  loadTransition,
  saveTransition,
} from "@/features/play/scene-transition-storage";
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
import { getSceneBackgroundImageByOrder, getCharacterImage } from "@/lib/story-images";
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
  // localStorage에서 설정 불러오기
  const [settings, setSettings] = useState<PlaySettings>(() => {
    try {
      const saved = localStorage.getItem("playSettings");
      if (saved) return JSON.parse(saved) as PlaySettings;
    } catch { /* ignore */ }
    return DEFAULT_PLAY_SETTINGS;
  });
  // 설정 변경 시 localStorage에 저장
  const persistSettings = useCallback((next: PlaySettings) => {
    setSettings(next);
    try { localStorage.setItem("playSettings", JSON.stringify(next)); } catch { /* ignore */ }
  }, []);
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
  /** 미션 종료 오버레이(MissionCompleteOverlay). 흐름을 막지 않는 순수 장식 레이어다 */
  const [showMissionComplete, setShowMissionComplete] = useState(false);

  const { speak, cancel: cancelTts, unlock: unlockAudio, speaking } = useCharacterVoice();

  // 이미 읽은 문장을 다시 읽지 않기 위한 키. 리렌더마다 speak가 재실행되면 소리가 겹친다.
  const spokenKeyRef = useRef<string | null>(null);
  const advancingRef = useRef(false);
  /** 발화 제출이 떠 있는 동안 두 번째 제출을 막는다. */
  const submittingRef = useRef(false);

  const scene = state.scene;
  const displayName = scene?.characterDisplayName ?? "";
  // 서버가 backgroundImageUrl을 내려주지 않으면 프론트 정적 에셋으로 대체
  // 백엔드는 sceneId로 UUID를 사용하므로 sceneOrder(1~9)로 매핑한다
  const backgroundImageUrl = scene?.backgroundImageUrl ?? getSceneBackgroundImageByOrder(scene?.sceneOrder ?? 0);
  // 서버가 characterImageUrl을 내려주지 않으면 프론트 정적 에셋으로 대체
  // characterState가 있으면 해당 표정 이미지로 변경
  const characterImageUrl = scene?.characterImageUrl
    ?? getCharacterImage(scene?.characterName ?? "", state.characterState ?? undefined);



  /**
   * 지금 화면에 떠 있는 장면. 응답이 늦게 도착했을 때 "아직 같은 장면인가"를
   * 판단하는 데 쓴다. 클로저에 갇힌 값이 아니라 최신 값이어야 한다.
   */
  const currentSceneIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentSceneIdRef.current = scene?.sceneId ?? null;
  }, [scene?.sceneId]);

  /**
   * 미션이 막 끝난 턴에만 `missionJustEndedAt`이 값을 갖는다(매번 다른 `now`).
   * 2.4초간 오버레이를 띄우고 스스로 끈다 — 상태머신은 그 밑에서 평소대로
   * 진행되므로, 이 타이머가 실패해도 아이는 갇히지 않는다.
   */
  useEffect(() => {
    if (!state.missionJustEndedAt) return;
    setShowMissionComplete(true);
    const timer = setTimeout(() => setShowMissionComplete(false), 2400);
    return () => clearTimeout(timer);
  }, [state.missionJustEndedAt]);

  // --- 세션 로드 --------------------------------------------------------
  useEffect(() => {
    let alive = true;
    api
      .getSession(sessionId)
      .then((snapshot) => {
        if (alive) {
          /**
           * C-12를 보다가 새로고침한 경우를 가려낸다. dialogue 장면은 서버가
           * `POST /messages` 안에서 이미 다음 장면으로 세션을 옮겨 놓으므로,
           * 방금 본 별 화면은 여기서 다시 읽은 스냅샷 어디에도 없다.
           *
           *   - 중간 장면: 다음 장면으로 이미 옮겨져 sceneId가 달라진다
           *   - 마지막 장면: sceneId는 그대로지만 status가 post_activity로 바뀐다
           *     (다음 장면이 없어 `session.currentSceneId`를 그대로 두기 때문)
           */
          const pending = loadTransition(sessionId);
          const missedTransition =
            pending !== null &&
            (snapshot.status === "post_activity" ||
              snapshot.currentScene.sceneId !== pending.scene.sceneId);

          if (missedTransition && pending) {
            dispatch({ type: "RESTORE_TRANSITION", data: pending });
          } else {
            // 남아 있어도 지금 스냅샷과 안 맞는 낡은 값이다 — 버린다.
            if (pending) clearTransition(sessionId);
            dispatch({ type: "HYDRATE", snapshot });
          }

          // 이어하기로 진입 시 INTRO가 아닌 상태면 audioUnlock (TTS 재생).
          // unlockAudio()는 호출하지 않는다 — STT에 영향을 줄 수 있다.
          if (snapshot.currentScene.sceneType !== "intro") {
            setAudioUnlocked(true);
          }
          // dialogue 장면 이어하기면 STT가 켜져 있을 수 있으니 중지한다
          if (snapshot.currentScene.sceneType === "dialogue" && stt) {
            stt.stop();
          }
        }
      })
      .catch((error) => {
        console.error("[play] 세션 로드 실패", error);
        toast.show("이야기를 불러오지 못했어요", "danger");
      });
    return () => {
      alive = false;
    };
  }, [api, sessionId, toast]);

  /**
   * C-12에 들어가는 순간, 이 화면을 다시 그리는 데 필요한 값을 sessionStorage에
   * 남겨 둔다. 여기서 새로고침하면 서버는 이미 다음 장면이라 되찾을 방법이
   * 없다 — 남겨 둔 값으로 화면만 복원한다. (scene-transition-storage.ts)
   *
   * "계속하기"를 실제로 눌러 다음 장면으로 넘어가면 `advanceScene`이 지운다.
   */
  useEffect(() => {
    if (state.status !== PlayState.SCENE_TRANSITION || !scene) return;
    saveTransition(sessionId, {
      scene,
      closingText: state.characterText,
      characterMessageId: state.characterMessageId,
      accumulatedElements: state.accumulatedElements,
      nextSceneId: state.nextSceneId,
    });
  }, [
    sessionId,
    scene,
    state.status,
    state.characterText,
    state.characterMessageId,
    state.accumulatedElements,
    state.nextSceneId,
  ]);

  // --- STT ① -----------------------------------------------------------
  // 2안에서는 녹음 종료(stop) → 업로드 → 텍스트가 별개 구간이다. onTranscribeStart가
  // 그 시작을 알린다. (docs/request/frontend/stt-tts-integration.md)
  const stt = useChildSpeech({
    // 필요 시 maxDurationMs를 제거하거나 충분히 크게 설정
    onTranscribeStart: () => dispatch({ type: "TRANSCRIBING" }),
    onInterim: (text) => dispatch({ type: "INTERIM", text }),
    // 실시간 final 결과가 나올 때마다 draftText를 자동 업데이트 (턴 종료는 하지 않음)
    onFinal: (text) => dispatch({ type: "TRANSCRIBED", text }),
    onError: (code) => {
      // 사용자가 직접 취소/종료하기 전 발생한 에러만 처리
      if (code !== "aborted") {
        dispatch({ type: "STT_FAILED", code });
      }
    },
  });
  
  // PlayScreen.tsx 내부 submit 함수
  const submit = useCallback(async () => {
    if (submittingRef.current) return;
  
    // draftText가 비어있다면 interimText를 대신 사용
    const text = (state.draftText || state.interimText).trim();
    if (!text) return;
  
    submittingRef.current = true;
  
    // 1. 마이크/STT 강제 정지
    stt.stop(); 
    
    // 2. 제출 상태(THINKING)로 전환
    dispatch({ type: "SUBMIT" });
  
    try {
      const result = await withTimeout(
        api.submitUtterance(sessionId, {
          text,
          sttRawText: state.sttRawText || text,
        }),
        RESPOND_TIMEOUT_MS
      );
      dispatch({ type: "SERVER_RESULT", result, now: new Date().toISOString() });
    } catch (error) {
      /**
       * ⚠️ 여기를 비워 두면 **아이가 THINKING에 갇힌다.** 서버가 실패해도 화면은
       *    "생각 중"인 채로 멈추고, 아이는 무엇이 잘못됐는지도 다시 시도할 방법도
       *    알 수 없다. 조용히 삼키지 않는다.
       *
       * 아이 화면에는 부드러운 문구(I-3)만 띄우고 개발자용 정보는 콘솔에 남긴다.
       * **아이가 한 말은 지우지 않는다** — 재시도하면 C-5(확인 화면)로 돌아가
       * 같은 발화를 그대로 다시 보낸다. 다시 말하게 하면 아이가 억울하다.
       */
      console.error("[play] 발화 제출 실패", error);
      network.show({
        retry: () => {
          dispatch({ type: "TRANSCRIBED", text });
          submittingRef.current = false;
        },
      });
    } finally {
      submittingRef.current = false;
    }
  }, [api, network, sessionId, state.draftText, state.interimText, state.sttRawText, stt]);
  
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

        // 실제로 다음 장면(또는 활동)으로 넘어갔다 — 복원용으로 남겨 둔 값을 지운다.
        clearTransition(sessionId);
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
            clearTransition(sessionId);
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

    // 도입(C-1) — 각 문장이 끝나면 0.5초 후 자동으로 다음 문장으로 넘어간다.
    if (state.status === PlayState.INTRO) {
      // 제스처 전에 speak를 부르면 조용히 차단되고 spokenKey만 소모된다.
      if (!audioUnlocked) return;
      const key = `intro:${scene.sceneId}:${state.sentenceIndex}`;
      if (spokenKeyRef.current === key) return;
      spokenKeyRef.current = key;
      // 자막은 메시지가 아니라 messageId가 없다. 텍스트로 음성을 요청한다.
      speak(
        { text: currentSentence(state) },
        {
          rate: settings.rate,
          volume: settings.volume,
          onDone: () => {
            // 마지막 문장이면 "이야기 시작하기" 버튼을 기다린다. 자동 진입하지 않는다.
            if (isLastSentence(state)) return;
            setTimeout(() => dispatch({ type: "SENTENCE_NEXT" }), 500);
          },
        }
      );
      return;
    }

    // 전개(C-2)는 자막이 끝나면 0.5초 후 자동으로 다음 문장으로 넘어간다.
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
            setTimeout(() => {
              if (isLastSentence(state)) void advanceScene(scene.sceneId, scene.sceneType);
              else dispatch({ type: "SENTENCE_NEXT" });
            }, 500);
          },
        }
      );
      return;
    }

    // 캐릭터 발화(C-3 / C-7). TTS가 끝나면 아이 차례로 넘긴다.
    if (isCharacterTurn(state.status) && state.characterText) {
      // 브라우저 오디오 해제가 안 되어있다면 해제 유도
      if (!audioUnlocked) return;

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
    // 도입부(intro)에 들어가기 전까지만 로딩 화면을 쓴다. 도입 이후 대화가
    // 진행되는 동안에는 장면 전환마다 스치듯 나타나 오히려 산만해지므로
    // 쓰지 않는다 (팀 결정, 2026-08-16).
    return (
      <ImmersiveShell variant="full" fontScale={settings.fontScale}>
        <div className="flex size-full items-center justify-center">
          <KidLoadingScreen label="이야기를 불러오고 있어요" />
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
        onChange={persistSettings}
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
      <MissionCompleteOverlay show={showMissionComplete} />
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
          backgroundImageUrl={backgroundImageUrl}
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
          characterImageUrl={characterImageUrl}
          closingText={state.characterText}
          accumulatedElements={state.accumulatedElements}
          screenIndex={toScreenIndex(scene.sceneOrder)}
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
  // 미션 브리프가 열려 있어도 캐릭터가 말하는 중이면 CharacterStage를 보여준다
  const showScene =
    (state.status === PlayState.SCENE_NARRATION || state.missionBriefOpen)
    && !isCharacterTurn(state.status);

  /** 미션 체크리스트에서 완료로 표시할 항목 수 (machine.ts 주석 참조) */
  const missionDone = state.mission
    ? missionDoneCount(state.mission, state.missionTurns, state.satisfiedIndexes)
    : 0;

  /**
   * 미션 2는 **택 1** 방식이라 카드가 다르다 (화면 명세 C-11).
   * 판단 근거는 서버가 주는 `id`다 — `mission_2`는 계약에 박힌 고정 문자열이다.
   */
  const isMission2 = state.mission ? isChoiceMission(state.mission.id) : false;

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
   *    판단 근거는 서버가 메시지마다 실어 주는 `characterDisplayName`(D-31)이다.
 *    예전에는 장면-캐릭터 짝을 프론트가 모았는데, 이어하기로 중간 진입하면 지난
 *    장면의 짝을 몰라 대화를 못 보여줬다. 서버 필드가 그 한계를 없앴다.
   */
  const npcMessages = messages.filter((m) => {
    if (m.sceneId === scene.sceneId) return true;
    if (!displayName) return false;
    return m.characterDisplayName === displayName;
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
            backgroundImageUrl={backgroundImageUrl}
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
            characterImageUrl={characterImageUrl}
            backgroundImageUrl={backgroundImageUrl}
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
                satisfiedIndexes={state.satisfiedIndexes}
                /**
                 * 한 번 말해봤는데도 아직 남은 항목이 있으면 힌트를 준다.
                 * 프론트가 발화를 채점하는 것이 아니라 **서버가 준 턴 수**만 본다.
                 */
                showHint={state.turnCount >= 2}
              />
              )}
            </div>

            <div className="flex shrink-0 flex-col items-center gap-2 px-6 pb-5">
              <p className="text-kid-body font-semibold text-muted">
                {speaking
                  ? "캐릭터가 말하고 있어"
                  : isMission2 && state.mission2Choice === null
                    ? "친구를 고르면 말할 수 있어"
                    : "미션을 읽고 준비되면 눌러줘"}
              </p>
              {/* 채움 primary — 이 화면의 유일한 행동이고, 누르면 내 차례가
                  시작된다. §1-5가 primary를 "주요 CTA · 내 차례"로 정했다.
                  미션 2는 **고르기 전에는 누를 수 없다** — 문장 틀의 주어가 비어 있는
                  상태로 말하게 하면 무엇을 말해야 하는지 알 수 없다.
                  캐릭터가 미션 대사를 읽는 동안에도 **누를 수 없다** — 여기서 누르면
                  MISSION_DISMISS가 즉시 아이 차례로 넘기고 마이크를 켜는데, 그 뒤
                  뒤늦게 도착하는 TTS onDone(CHARACTER_TTS_DONE)이 recording을
                  다시 false로 덮어써 마이크가 꺼진 채로 남는다. */}
              <PillButton
                size="kid"
                disabled={speaking || (isMission2 && state.mission2Choice === null)}
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
                screenIndex={toScreenIndex(scene.sceneOrder)}
                guided={false}
              />
            ) : null}

            {state.status === PlayState.CHILD_TURN || state.status === PlayState.TRANSCRIBING ? (
              <ChildTurnPanel
                recording={state.recording}
                transcribing={state.status === PlayState.TRANSCRIBING}
                interimText={state.interimText}
                micLevel={displayedMicLevel}
                onMicClick={() => {
                  if (state.recording) stt.stop();
                  else startRecording();
                }}
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
              <ThinkingPanel elapsedMs={displayedThinkingElapsed} />
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
