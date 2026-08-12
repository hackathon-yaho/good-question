/**
 * 우측 대화 패널 — docs/spec/screens.md C-2 ~ C-6, I-2
 *
 * 상태별로 우측 40% 영역에 들어가는 뷰들이다.
 * C-3(CHARACTER_SPEAKING)과 C-7(GUIDED)은 UI 구조가 같으므로 컴포넌트를 분리하지 않고
 * guided prop으로 구분한다. (§C 공통)
 */

"use client";

import { PillButton } from "@/components/ui/PillButton";
import { MicButton } from "@/components/ui/MicButton";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import { ThinkingElementStars } from "@/components/ui/ThinkingElementStars";
import { CharacterPortrait } from "@/features/play/CharacterPortrait";
import { ConversationHistory } from "@/features/play/ConversationHistory";
import { HighlightedText } from "@/features/play/HighlightedText";
import type { HighlightWord, Message } from "@/lib/api/types";

/** C-2 우측 — 대기 상태. "지금은 아니야"가 확실히 읽혀야 한다. */
export function WaitingPanel({ displayName }: { displayName: string | null }) {
  return (
    <div className="panel-inactive flex size-full flex-col items-center justify-center gap-6 px-8">
      <CharacterPortrait
        displayName={displayName ?? "?"}
        size={140}
        silhouette
      />
      <p className="text-center text-kid-body text-muted">
        {displayName
          ? `잠시 후 ${displayName}이(가) 이야기해요`
          : "잠시 후 이야기가 이어져요"}
      </p>
      <MicButton state="disabled" size={96} />
    </div>
  );
}

/**
 * C-3 / C-7 — 캐릭터 발화 중
 *
 * ── 미션과 함께 뜰 때 무엇이 접히는가 ───────────────────────────────
 * 미션 카드가 우측 패널의 절반을 쓰면 이 패널에 400px 남는데, 펼친 높이는 485px다.
 * 예전에는 아무 방어가 없어서 **푸터(마이크)가 패널 밖 250~300px로 밀려나** 아예
 * 보이지 않고, 말풍선끼리·헤더와 겹쳤다.
 *
 * 두 가지로 막는다.
 *   1. 고정 영역(헤더·별 뱃지·푸터)에 shrink-0. 눌려서 내용이 삐져나오지 않게.
 *   2. **현재 대사 영역이 남는 높이를 받아 스크롤**한다. 줄어들 곳을 한 곳으로 몰면
 *      어디가 깨질지 예측할 수 있다.
 *
 * compact(미션이 열린 상태)에서는 지난 대화 기록과 푸터의 비활성 마이크를 접는다.
 * 지난 기록은 맥락일 뿐이고, "지금은 들을 차례"는 헤더의 "말하는 중" 칩과
 * 푸터 문구가 이미 전한다.
 */
export function CharacterPanel({
  displayName,
  text,
  turnCount,
  maxTurns,
  messages,
  accumulatedElements,
  guided,
  onReplay,
  highlightWords = [],
  onWordClick,
  compact = false,
}: {
  displayName: string;
  text: string;
  turnCount: number;
  maxTurns: number;
  messages: readonly Message[];
  accumulatedElements: readonly string[];
  guided: boolean;
  /**
   * "다시 듣기". **재생 중에도 누를 수 있어야 한다.**
   *
   * 이 패널은 캐릭터가 말하는 동안만 떠 있고, 재생이 끝나면 곧바로 아이 차례(C-4)로
   * 바뀐다. 재생 중을 막으면 **누를 수 있는 순간이 아예 없다.** 실제로 그랬다.
   * 눌리면 처음부터 다시 재생한다.
   */
  onReplay: () => void;
  /** 서버가 지정한 밑줄 단어. 탭하면 C-9가 열린다. */
  highlightWords?: readonly HighlightWord[];
  onWordClick?: (word: HighlightWord) => void;
  /** 미션 카드가 함께 떠 있어 공간이 좁을 때 */
  compact?: boolean;
}) {
  return (
    <div className="flex size-full min-h-0 flex-col">
      {/* 헤더 아래에 구분선을 두지 않는다. 캐릭터 이름은 말풍선의 임자이므로
          말풍선과 한 덩어리로 읽혀야 하는데, 선을 그으면 **제목 바**처럼 보인다.
          아바타와 작은 muted 글씨로 이미 충분히 구분된다.
          C-4와 같은 자리이므로 양쪽에서 같이 뺀다. 매 턴 C-3↔C-4를 오갈 때
          같은 y에서 선이 생기고 사라지면 그게 더 거슬린다. */}
      <header className="flex shrink-0 items-center gap-3 px-6 pt-4">
        <CharacterPortrait
          displayName={displayName}
          size={compact ? 56 : 72}
          speaking
        />
        <div className="min-w-0">
          <p className="truncate text-kid-body font-bold text-text">
            {displayName}
          </p>
          <span className="rounded-pill bg-info px-2.5 py-0.5 text-sm font-bold text-white">
            말하는 중
          </span>
        </div>
        <span className="ml-auto shrink-0 text-parent-body font-bold text-muted">
          {Math.min(turnCount, maxTurns)} / {maxTurns}
        </span>
      </header>

      {/* 남는 높이를 여기서 받는다. 좁아지면 이 영역만 스크롤된다. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <SpeechBubble speaker="character" emphasis>
          {onWordClick && highlightWords.length > 0 ? (
            <HighlightedText
              text={text}
              words={highlightWords}
              onWordClick={onWordClick}
            />
          ) : (
            text
          )}
        </SpeechBubble>
        <div className="mt-3 flex justify-end">
          <PillButton variant="outlined" onClick={onReplay}>
            다시 듣기
          </PillButton>
        </div>
      </div>

      {/* GUIDED에서만 별 뱃지를 노출한다. "GUIDED"라는 개념은 아이에게 보이지 않는다. */}
      {guided ? (
        <div className="shrink-0 bg-accent-soft/50 py-4">
          <ThinkingElementStars accumulatedElements={accumulatedElements} />
        </div>
      ) : null}

      {/* 미션이 열려 있으면 지난 기록을 접는다. 두 영역이 flex-1을 나눠 가지면
          둘 다 너무 좁아진다. */}
      {compact ? null : <ConversationHistory messages={messages} />}

      <footer className="flex shrink-0 flex-col items-center gap-2 px-6 pb-5">
        {compact ? null : <MicButton state="disabled" size={96} />}
        <p className="text-parent-body text-muted">
          {displayName}이(가) 말하고 있어요
        </p>
      </footer>
    </div>
  );
}

/**
 * C-4 — 내 차례. 이 화면의 시각 신호가 약하면 서비스 전체가 작동하지 않는다.
 *
 * ── "변환 중"도 이 컴포넌트다 ────────────────────────────────────────
 * 2안에서 녹음 종료와 텍스트 도착 사이에 최대 8초가 생겼다
 * (docs/request/frontend/stt-tts-integration.md). 그 구간을 **별도 화면으로 만들지
 * 않는다.** 틀을 그대로 두고 마이크를 끄고 문구만 바꾼다. 이유 둘:
 *
 *   1. 레이아웃이 바뀌면 브라우저 모드(구간이 짧다)에서 화면이 번쩍인다
 *   2. 아이 입장에서 "내가 말한 게 넘어가는 중"이라 같은 장면의 연속이다
 *
 * "응답 대기"(②)는 캐릭터가 생각하는 구간이라 화면이 완전히 다르다.
 * → `ThinkingPanel`
 */
export function ChildTurnPanel({
  displayName,
  previousText,
  recording,
  transcribing = false,
  interimText,
  micLevel,
  onMicClick,
  onSubmit,
  submitDisabled,
  compact = false,
}: {
  displayName: string;
  previousText: string;
  recording: boolean;
  /** ① 변환 중. 마이크를 끄고 문구를 바꾼다. */
  transcribing?: boolean;
  interimText: string;
  micLevel: number;
  onMicClick: () => void;
  onSubmit: () => void;
  submitDisabled: boolean;
  /** 미션 카드가 함께 떠 있어 공간이 좁을 때. 지난 대사 줄을 접는다. */
  compact?: boolean;
}) {
  const micState = transcribing
    ? "disabled"
    : recording
      ? "recording"
      : "idle";

  return (
    <div className="flex size-full min-h-0 flex-col">
      {/* 구분선 없음 — 이유는 CharacterPanel 헤더 주석 참조 */}
      <header className="flex shrink-0 items-center gap-3 px-6 pt-4">
        <CharacterPortrait displayName={displayName} size={56} />
        <p className="truncate text-parent-body font-bold text-muted">
          {displayName}
        </p>
      </header>

      {/* 미션 카드가 열려 있으면 이 줄을 접는다. 흐린 지난 대사는 맥락일 뿐이고,
          아이에게 지금 필요한 것은 미션 내용과 마이크다. 둘 다 펼치면 우측 패널에
          들어가지 않는다. */}
      {compact ? null : (
        <div className="shrink-0 px-6 py-4">
          <SpeechBubble speaker="character" dimmed>
            {previousText}
          </SpeechBubble>
        </div>
      )}

      {/* overflow-hidden이 없으면 좁아졌을 때 마이크가 위아래로 삐져나와
          말풍선과 푸터를 덮는다. */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden px-6">
        <p className="shrink-0 text-center text-turn leading-tight font-bold text-primary">
          {transcribing ? "잘 들었어!" : "이제 말해 볼까?"}
        </p>

        {/* 남은 높이를 마이크가 받는다. 이 칸은 flex-1로 높이가 확정되므로
            adaptive를 켜도 안전하다. MicButton 주석의 경고 참조. */}
        <div className="flex min-h-0 w-full flex-1 items-center justify-center">
          <MicButton
            state={micState}
            size={180}
            level={micLevel}
            onClick={onMicClick}
            adaptive
          />
        </div>

        {/* "변환 중"은 아이에게 기술 용어다. 무슨 일이 일어나는지로 쓴다. */}
        {transcribing ? (
          <p
            aria-live="polite"
            className="flex shrink-0 items-center gap-2 text-center text-parent-body text-muted"
          >
            <span aria-hidden className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{ animationDelay: `${i * 0.15}s` }}
                  className="size-1.5 animate-bounce rounded-full bg-muted"
                />
              ))}
            </span>
            네 말을 글로 옮기고 있어…
          </p>
        ) : (
          <p className="shrink-0 text-center text-parent-body text-muted">
            말이 끝나면 아래 보내기를 눌러줘
          </p>
        )}

        {interimText ? (
          <p className="max-w-full shrink-0 truncate rounded-bubble bg-secondary-soft px-4 py-2 text-center text-kid-body text-text">
            {interimText}
          </p>
        ) : null}
      </div>

      <footer className="flex shrink-0 items-center justify-end gap-3 px-6 pb-5">
        <PillButton size="kid" onClick={onSubmit} disabled={submitDisabled}>
          보내기
        </PillButton>
      </footer>
    </div>
  );
}

/** C-5 — STT 결과 확인. "내 말이 제대로 들어갔는지 확인하고 싶다"는 인터뷰 요구다. */
export function ConfirmPanel({
  draftText,
  onChange,
  onRetry,
  onSubmit,
}: {
  draftText: string;
  onChange: (text: string) => void;
  onRetry: () => void;
  onSubmit: () => void;
}) {
  return (
    // 미션과 함께 뜨면 textarea 높이 때문에 넘친다. 넘칠 때는 스크롤한다.
    // justify-center를 쓰면 넘친 위쪽이 스크롤로도 닿지 않는다. m-auto는
    // 자리가 남을 때만 가운데로 몰고, 모자라면 위에서부터 채운다.
    <div className="flex size-full min-h-0 flex-col overflow-y-auto px-6 py-8">
      <div className="m-auto flex w-full flex-col gap-5">
        <p className="text-parent-body font-bold text-muted">내가 한 말</p>

        <textarea
          value={draftText}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          aria-label="변환된 내 말"
          className="w-full resize-none rounded-bubble bg-secondary-soft px-5 py-4 text-dialogue leading-snug font-bold text-text outline-none focus:ring-4 focus:ring-secondary/40"
        />

        <p className="text-kid-body text-muted">이렇게 말한 게 맞아?</p>

        <div className="flex gap-3">
          <PillButton
            variant="outlined"
            size="kid"
            className="basis-2/5"
            onClick={onRetry}
          >
            다시 말하기
          </PillButton>
          <PillButton
            size="kid"
            className="basis-3/5"
            onClick={onSubmit}
            disabled={!draftText.trim()}
          >
            보내기
          </PillButton>
        </div>
      </div>
    </div>
  );
}

/**
 * C-6 — 응답 대기(②). 기술적인 스피너를 쓰지 않는다.
 * "캐릭터가 생각하고 있다"로 읽혀야 한다.
 *
 * ①(변환 중)과 **다른 화면이다.** ①은 아이 차례 틀에서 마이크만 꺼지고,
 * 여기는 캐릭터 초상화가 나온다. 요청 문서가 두 구간을 구분해 달라고 요구한다.
 * 예산은 10초. (docs/request/frontend/stt-tts-integration.md)
 */
export function ThinkingPanel({
  displayName,
  childText,
  elapsedMs,
}: {
  displayName: string;
  childText: string;
  elapsedMs: number;
}) {
  // 예산이 10초이므로 6초에서 문구를 바꾼다. 8초에 바꾸면 남은 2초에만 보인다.
  const hint = elapsedMs > 6000 ? "조금만 더 기다려줘" : "음… 생각 중이야";

  return (
    <div className="flex size-full min-h-0 flex-col">
      <div className="max-h-[40%] shrink-0 overflow-y-auto px-6 py-5">
        <SpeechBubble speaker="child">{childText}</SpeechBubble>
      </div>

      {/* overflow-hidden이 없으면 좁아졌을 때 초상화가 위아래로 삐져나와
          말풍선과 푸터를 덮는다. */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-hidden">
        <CharacterPortrait displayName={displayName} size={120} thinking />

        <div className="flex items-center gap-1.5 rounded-bubble border border-border bg-surface px-5 py-3">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{ animationDelay: `${i * 0.15}s` }}
              className="size-2.5 animate-bounce rounded-full bg-muted"
            />
          ))}
        </div>

        <p className="animate-pulse text-kid-body text-muted">{hint}</p>
      </div>

      <footer className="flex shrink-0 justify-center pb-5">
        <MicButton state="disabled" size={96} />
      </footer>
    </div>
  );
}

/** I-2 — 인식 실패. 빨간색·경고 아이콘을 쓰지 않는다. 아이 잘못이 아니다. */
export function MicErrorPanel({
  displayName,
  onRetry,
  onSkip,
}: {
  displayName: string;
  onRetry: () => void;
  onSkip: () => void;
}) {
  return (
    // 미션과 함께 뜨면 넘친다. m-auto로 자리가 남을 때만 가운데로 몰고,
    // 모자라면 위에서부터 채워 스크롤로 닿게 한다.
    <div className="flex size-full min-h-0 flex-col overflow-y-auto px-8 py-6">
      <div className="m-auto flex w-full flex-col items-center gap-5">
        <CharacterPortrait displayName={displayName} size={120} />

        <p className="text-headline font-bold text-primary">잘 안 들렸어</p>
        <p className="text-kid-body text-muted">조금 더 크게 말해줄래?</p>

        <p className="rounded-bubble bg-accent-soft px-5 py-3 text-center text-parent-body text-text">
          조용한 곳에서 마이크에 가까이 대고 말해보자.
        </p>

        <div className="flex w-full gap-3">
          <PillButton size="kid" className="basis-3/5" onClick={onRetry}>
            다시 말하기
          </PillButton>
          <PillButton
            variant="outlined"
            size="kid"
            className="basis-2/5"
            onClick={onSkip}
          >
            건너뛰기
          </PillButton>
        </div>
      </div>
    </div>
  );
}
