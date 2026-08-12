/**
 * 음성 계층 공통 계약 + Web Speech API 최소 타입 선언
 *
 * 아래 두 계약(`ChildSpeech`, `CharacterVoice`)은 **2안(백엔드 처리) 기준**으로
 * 생겼다. 브라우저 구현도 이 모양에 맞춘다. 반대로 맞추면 백엔드를 붙일 때
 * 화면 코드를 다시 손대야 한다.
 * (docs/request/frontend/stt-tts-integration.md)
 */

/* ── 아이 발화(STT) ────────────────────────────────────────────────── */

/**
 * `recording`  녹음 중 (C-4)
 * `transcribing` 변환 중 — 오디오를 올리고 텍스트를 기다린다 (① 최대 8초)
 * `idle` · `error`
 */
export type SttStatus = "idle" | "recording" | "transcribing" | "error";

export type ChildSpeechOptions = {
  /** 최대 녹음 시간(ms). C-4 30000, D-5 60000 */
  maxDurationMs?: number;
  /**
   * 녹음이 끝나고 변환이 시작될 때. C-4 → "변환 중" 화면으로 넘기는 신호다.
   *
   * 브라우저 구현에서도 부른다. 구간이 짧을 뿐 없는 구간이 아니다.
   */
  onTranscribeStart?: () => void;
  /**
   * 부분 전사. **백엔드 구현은 절대 부르지 않는다** — 2안에 interim result가 없다.
   * 그래서 이 콜백에 기능을 의존하면 안 된다. D-5 키워드 점등은 최종 결과로 한다.
   */
  onInterim?: (text: string) => void;
  /**
   * 최종 텍스트. **빈 문자열일 수 있다.** 그때는 서버에 보내지 않고 I-2로 간다.
   * (PRD 8.9 · 요청 문서 "①의 결과가 비면 ②를 호출하지 않습니다")
   */
  onFinal?: (text: string) => void;
  /** 마이크·변환 실패 — I-2로 보낸다 */
  onError?: (code: string) => void;
  /** false면 이 구현은 아무것도 하지 않는다. 모드 전환용. (`speech/mode.ts`) */
  enabled?: boolean;
};

export type ChildSpeech = {
  status: SttStatus;
  /** 브라우저 구현에서만 채워진다. 백엔드 구현은 항상 "" */
  interimText: string;
  supported: boolean;
  start: () => void;
  /** 녹음을 끝낸다. 결과는 `onFinal`로 딱 한 번 온다. */
  stop: () => void;
};

/* ── 캐릭터 음성(TTS) ──────────────────────────────────────────────── */

export type TtsRate = "slow" | "normal" | "fast";

/**
 * 무엇을 읽을지.
 *
 * `messageId`가 있으면 백엔드 구현이 `GET /api/tts?messageId=`로 캐시를 탄다.
 * 없으면(도입·전개 내레이션, 단어 발음) `text`로 요청한다.
 * → 텍스트 요청 경로는 백엔드에 추가 요청해 둔 상태다.
 *   (docs/request/backend/tts-text-endpoint.md)
 *
 * `text`는 두 구현 모두 필요하다. 브라우저 구현은 이것만 쓴다.
 */
export type VoiceCue = {
  text: string;
  messageId?: string | null;
};

export type SpeakOptions = {
  rate?: TtsRate;
  volume?: number;
  /**
   * 재생이 끝났을 때. **실패해도 부른다.**
   * 이 콜백이 안 오면 아이가 영원히 기다린다. (screens.md C-3 체크리스트)
   */
  onDone?: () => void;
};

export type CharacterVoice = {
  speak: (cue: VoiceCue, options?: SpeakOptions) => void;
  cancel: () => void;
  speaking: boolean;
  supported: boolean;
  /**
   * 아이의 첫 탭에서 한 번 부른다. iOS Safari가 조작 없는 자동 재생을 막으므로
   * 그 안에서 오디오 엘리먼트를 열어 둬야 이후 자동 재생이 통한다.
   *
   * 브라우저 구현에는 열어 둘 것이 없어 아무것도 하지 않는다.
   * 두 구현 모두 이 메서드를 갖는 이유는 화면이 모드를 몰라도 되게 하는 것이다.
   */
  unlock: () => void;
};

/* ── Web Speech API (mock 구현 전용) ───────────────────────────────── */

/**
 * TS 기본 lib에 SpeechRecognition이 없다(표준화 진행 중). 쓰는 것만 좁게 선언한다.
 * 백엔드 모드로 완전히 넘어가면 이 아래 전체가 사라진다.
 */

export type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
};

export type SpeechRecognitionResult = {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
};

export type SpeechRecognitionResultList = {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
};

export type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

export type SpeechRecognitionErrorEventLike = {
  error: string;
  message?: string;
};

export type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onspeechend: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}
