/**
 * 말하기 후 활동 단계 화면 — docs/spec/screens.md D-1, D-3, D-4, D-5, D-6, D-7
 *
 * D-2(카드 배열)만 드래그 로직 때문에 파일이 따로 있다.
 */

"use client";

import { Modal } from "@/components/ui/Modal";
import { MicButton } from "@/components/ui/MicButton";
import { PillButton } from "@/components/ui/PillButton";
import { StarDustIcon } from "@/components/ui/StarDust";
import { StarDustRain } from "@/components/ui/StarDustRain";
import type { ActivityCard, RetellingResult } from "@/lib/api/types";

/** D-1 활동 인트로 */
export function ActivityIntro({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-6 px-10 text-center">
      <div
        aria-hidden
        className="flex h-[23.75rem] w-full max-w-[34rem] items-center justify-center rounded-card bg-primary-soft text-kid-body font-bold text-muted"
      >
        단체 일러스트 준비 중
      </div>

      <span className="rounded-pill bg-secondary px-5 py-1.5 text-parent-body font-bold text-white">
        이야기 끝!
      </span>

      <h1 className="text-intro leading-tight font-bold text-text">
        이제 네 이야기로 다시 들려줄래?
      </h1>

      <p className="text-kid-body text-muted">
        카드를 순서대로 놓고, 그다음에 이야기를 들려주면 돼
      </p>

      <PillButton size="kid-lg" onClick={onStart}>
        시작하기
      </PillButton>
    </div>
  );
}

/**
 * D-3 순서 오답 피드백
 *
 * ⚠️ 절대 금지: 빨간색, X 마크, "틀렸어요", "실패".
 *    실패를 지적하면 아이가 위축된다.
 *
 * ── "힌트 보기"를 넣지 않았다 ────────────────────────────────────────
 * 명세는 버튼 2개(힌트 보기 / 다시 해보기)를 그렸지만, **서버가 강조할 카드를
 * 알려주지 않는다** — `POST .../activity/order` 응답에 그런 필드가 없다
 * (backend/docs/api-spec.md 8.2). 프론트는 정답을 모르므로 힌트를 만들 수 없다.
 * 누르면 아무 일도 없는 버튼보다 없는 것이 정직하다.
 *
 * 빠져나갈 길은 3회 제한이 대신한다 — 3회째에 서버가 정답 순서를 보여준다. (D-10)
 */
export function FeedbackModal({
  open,
  onRetry,
}: {
  open: boolean;
  onRetry: () => void;
}) {
  return (
    <Modal open={open} width={560} dismissible={false} label="다시 해보기">
      <div className="flex flex-col items-center gap-5 text-center">
        <div
          aria-hidden
          className="flex size-[8.75rem] items-center justify-center rounded-full bg-accent-soft text-5xl"
        >
          🙂
        </div>

        <p className="text-headline font-bold text-primary">거의 다 왔어!</p>

        <p className="text-kid-body text-text">
          순서가 조금 바뀐 것 같아. 다시 한 번 놓아볼까?
        </p>

        <PillButton fullWidth onClick={onRetry}>
          다시 해보기
        </PillButton>
      </div>
    </Modal>
  );
}

/**
 * D-4 정답 → 핵심 단어 공개
 *
 * ── 3회 시도 후에도 이 화면이다 ─────────────────────────────────────
 * 재시도가 3회로 제한되고(D-10), 3회째에는 서버가 정답 순서를 실어 보낸다.
 * 그때 **별도 화면을 만들지 않고 이 화면을 쓴다.** 배너 문구와 카드 테두리만
 * 바뀐다(`revealed`).
 *
 * 화면을 따로 만들면 그 자체가 "너는 다른 길로 왔다"는 표시가 된다.
 * D-3의 원칙은 실패를 **지적하지 않는** 것이고, 여기서는 순서를 알려 주고
 * 같은 다음 단계로 보내는 것이 그 원칙을 지키는 방법이다.
 *
 * 그렇다고 "맞췄어!"라고 하지도 않는다. 그건 거짓이고, 아이도 자기가 맞히지
 * 않았다는 걸 안다.
 */
export function KeywordReveal({
  slots,
  keywords,
  revealed = false,
  onNext,
}: {
  slots: readonly (ActivityCard | null)[];
  keywords: readonly string[];
  /** 3회 시도 후 정답 순서를 보여주는 경우 (D-10) */
  revealed?: boolean;
  onNext: () => void;
}) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-7 px-10">
      <p
        className={[
          "rounded-pill px-6 py-2 text-kid-button font-bold",
          revealed ? "bg-accent-soft text-text" : "bg-secondary text-white",
        ].join(" ")}
      >
        {revealed ? "이런 순서였어!" : "순서를 맞췄어!"}
      </p>

      <ol className="flex items-center gap-3">
        {slots.map((card, index) => (
          <li key={card?.id ?? index} className="flex items-center gap-3">
            <div
              className={[
                "flex h-[10rem] w-[13.75rem] items-center justify-center rounded-card border-2 p-3 text-center",
                revealed
                  ? "border-accent bg-accent-soft"
                  : "border-secondary bg-secondary-soft",
              ].join(" ")}
            >
              <span className="text-parent-body leading-snug font-bold text-text">
                {card?.text}
              </span>
            </div>
            {index < slots.length - 1 ? (
              <span aria-hidden className="text-2xl text-muted">
                ›
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      <p className="text-kid-body font-bold text-text">
        이 단어들을 넣어서 말해볼까?
      </p>

      <ul className="flex flex-wrap justify-center gap-3">
        {keywords.map((keyword) => (
          <li
            key={keyword}
            className="flex min-h-touch-kid items-center rounded-pill border-2 border-accent bg-surface px-6 text-kid-button font-bold text-text"
          >
            {keyword}
          </li>
        ))}
      </ul>

      <PillButton size="kid-lg" onClick={onNext}>
        이야기 말하기
      </PillButton>
    </div>
  );
}

/**
 * D-5 이야기 재구성 말하기
 *
 * ── 점등 시점이 모드에 따라 다르다 ──────────────────────────────────
 * 이 화면의 핵심 인터랙션은 키워드 점등이다. 그런데 2안(백엔드 Whisper)에는
 * **interim result가 없어서 실시간 점등이 불가능하다.** 최종 결과가 도착할 때
 * 한 번에 켜진다. (docs/request/frontend/stt-tts-integration.md "D-5")
 *
 *   브라우저 모드 — 말하는 동안 하나씩 켜진다
 *   백엔드 모드   — 변환이 끝나면 한 번에 켜진다
 *
 * 화면 코드는 같다. `spokenKeywords`가 언제 늘어나느냐만 다르다.
 * 그래서 "아직 안 켜진 키워드"가 아이 잘못으로 읽히지 않아야 한다 — 회색이지
 * 빨간색이 아니고, "아직 안 말했어요"까지만 말한다.
 */
/**
 * D-5 이야기 재구성 말하기 (수동 제출 처리)
 */
export function Retelling({
  cards,
  keywords,
  spokenKeywords,
  recording,
  transcribing = false,
  interimText,
  micLevel,
  errorCode,
  onMicClick,
  onDone,
}: {
  cards: readonly (ActivityCard | null)[];
  keywords: readonly string[];
  spokenKeywords: readonly string[];
  recording: boolean;
  /** ① 변환 중. 마이크를 끄고 문구를 바꾼다. */
  transcribing?: boolean;
  interimText: string;
  micLevel: number;
  errorCode: string | null;
  onMicClick: () => void;
  onDone: () => void;
}) {
  // 💡 기존에 녹음 완료나 transcribing 완료 시 자동으로 onDone()을 실행하던 
  // useEffect나 콜백 함수가 상위/내부에 있다면 반드시 삭제해주세요!

  return (
    <div className="flex size-full flex-col items-center gap-5 px-10 py-8">
      <h1 className="text-narration font-bold text-text">
        이야기를 처음부터 들려줘
      </h1>

      {/* 참고용 카드 스트립 */}
      <ol className="flex gap-3">
        {cards.map((card, index) => (
          <li
            key={card?.id ?? index}
            className="flex h-[8.125rem] w-[11.25rem] items-center justify-center rounded-card border border-border bg-surface p-2 text-center"
          >
            <span className="text-sm leading-snug text-muted">{card?.text}</span>
          </li>
        ))}
      </ol>

      {/* 키워드 점등 */}
      <ul className="flex flex-wrap justify-center gap-3">
        {keywords.map((keyword) => {
          const spoken = spokenKeywords.includes(keyword);
          return (
            <li
              key={keyword}
              className={[
                "flex min-h-touch items-center gap-2 rounded-pill border-2 px-5 text-kid-body font-bold transition-colors",
                spoken
                  ? "border-secondary bg-secondary text-white"
                  : "border-accent bg-surface text-muted",
              ].join(" ")}
            >
              {spoken ? <span aria-hidden>✓</span> : null}
              {keyword}
              <span className="sr-only">
                {spoken ? "말했어요" : "아직 안 말했어요"}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
        <MicButton
          state={transcribing ? "disabled" : recording ? "recording" : "idle"}
          size={200}
          level={micLevel}
          onClick={onMicClick}
        />

        {errorCode ? (
          <p className="text-kid-body text-primary">
            잘 안 들렸어. 다시 말해줄래?
          </p>
        ) : (
          <p aria-live="polite" className="text-parent-body text-muted">
            {transcribing
              ? "네 이야기를 글로 옮기고 있어…"
              : recording
                ? "듣고 있어요…"
                : "마이크를 누르고 이야기해줘"}
          </p>
        )}

        {interimText ? (
          <p className="max-w-[40rem] rounded-bubble bg-secondary-soft px-5 py-3 text-center text-kid-body text-text">
            {interimText}
          </p>
        ) : null}
      </div>

      {/* 🟢 수동 클릭으로만 다음 단계(onDone)로 진입 */}
      <PillButton
        size="kid"
        onClick={onDone}
        /* 
          변환 중(transcribing)일 때는 클릭 방지.
          녹음이 중지되었거나, 한번이라도 이야기를 변환한 텍스트가 생겼다면 
          아이/부모가 직접 눌러서 제출할 수 있도록 활성화합니다.
        */
        disabled={transcribing}
      >
        말 다 했어요
      </PillButton>
    </div>
  );
}

/**
 * D-6 재구성 결과 확인
 *
 * ⚠️ 원문 명세의 "내 목소리로 다시 듣기"는 원본 음성 저장을 전제하는데,
 *    PRD 10.3이 원본 음성 저장을 금지한다. (open-questions Q-07)
 *    TTS로 텍스트를 읽어주는 방식으로 대체하고 문구도 바꿨다.
 *    "내 목소리로"를 그대로 두면 거짓말이 된다.
 */
export function ReviewPanel({
  text,
  keywords,
  speaking,
  onListen,
  onRetell,
  onComplete,
  submitting,
}: {
  text: string;
  keywords: readonly string[];
  speaking: boolean;
  onListen: () => void;
  onRetell: () => void;
  onComplete: () => void;
  submitting: boolean;
}) {
  return (
    <div className="flex size-full flex-col items-center justify-center gap-6 px-10 py-8">
      <h1 className="text-narration font-bold text-text">내가 만든 이야기</h1>

      <div className="max-h-[45%] w-full max-w-[53.75rem] overflow-y-auto rounded-card border border-border bg-surface p-8">
        <p className="text-kid-body leading-[1.7] text-text">
          {highlight(text, keywords)}
        </p>
      </div>

      <PillButton variant="outlined" onClick={onListen} disabled={speaking}>
        🔊 내 이야기 다시 듣기
      </PillButton>

      <div className="flex w-full max-w-[34rem] gap-3">
        <PillButton
          variant="outlined"
          size="kid"
          className="basis-2/5"
          onClick={onRetell}
        >
          다시 말하기
        </PillButton>
        <PillButton
          size="kid"
          className="basis-3/5"
          onClick={onComplete}
          disabled={submitting}
        >
          이야기 완성하기
        </PillButton>
      </div>
    </div>
  );
}

/** 키워드에 마커 배경을 입힌다. */
function highlight(text: string, keywords: readonly string[]) {
  if (keywords.length === 0) return text;

  const pattern = new RegExp(`(${keywords.map(escapeRegExp).join("|")})`, "g");
  return text.split(pattern).map((part, i) =>
    keywords.includes(part) ? (
      <mark key={i} className="rounded bg-accent-soft px-1 text-text">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * D-7 세션 완료
 *
 * ⚠️ 금지: 점수, 등급, 퍼센트. 축하하되 평가하지 않는다.
 *    "별가루"는 요건·DB 어디에도 없어 MVP에서 제외했다. (open-questions Q-12)
 */
export function ActivityComplete({
  result,
  onHome,
  onWordbook,
}: {
  result: RetellingResult;
  onHome: () => void;
  onWordbook: () => void;
}) {
  const stats = [
    { label: "말한 횟수", value: `${result.stats.childUtteranceCount}번` },
    { label: "함께한 친구", value: `${result.stats.characterCount}명` },
    { label: "새 단어", value: `${result.stats.newWordCount}개` },
  ];

  return (
    <div className="relative flex size-full flex-col items-center justify-center gap-6 overflow-hidden px-10">
      {/* 별가루가 떨어진다. 반짝이는 점 대신 실제로 모은 것이 쏟아지는 느낌을 준다. */}
      <StarDustRain />

      <div
        aria-hidden
        className="z-10 flex h-[22.5rem] w-full max-w-[32rem] items-center justify-center rounded-card bg-primary-soft text-kid-body font-bold text-muted"
      >
        단체 일러스트 준비 중
      </div>

      <h1 className="z-10 text-hero leading-tight font-bold text-text">
        이야기를 끝까지 해냈어!
      </h1>

      {/* 획득 별가루 — 서버가 값을 줄 때만. 없으면 이 줄이 사라진다. (계획 D4) */}
      {typeof result.earnedStarDust === "number" ? (
        <p className="z-10 flex items-center gap-2 text-kid-button font-bold text-text">
          <StarDustIcon size={28} className="text-accent" />
          별가루 +{result.earnedStarDust.toLocaleString("ko-KR")}
        </p>
      ) : null}

      <ul className="z-10 flex gap-4">
        {stats.map((stat) => (
          <li
            key={stat.label}
            className="flex min-w-[9rem] flex-col items-center gap-1 rounded-card border border-border bg-surface px-6 py-4"
          >
            <span className="text-parent-body text-muted">{stat.label}</span>
            <span className="text-kid-button font-bold text-text">
              {stat.value}
            </span>
          </li>
        ))}
      </ul>

      <div className="z-10 flex gap-3">
        <PillButton variant="outlined" size="kid" onClick={onWordbook}>
          내 단어장 보기
        </PillButton>
        <PillButton size="kid" onClick={onHome}>
          홈으로 가기
        </PillButton>
      </div>
    </div>
  );
}
