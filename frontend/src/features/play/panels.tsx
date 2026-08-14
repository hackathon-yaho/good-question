/**
 * 우측 대화 패널 — docs/spec/screens.md C-2 ~ C-6
 * C-3(CHARACTER_SPEAKING)과 C-7(GUIDED)은 UI 구조가 같으므로 컴포넌트를 분리하지 않고
 * guided prop으로 구분한다. (§C 공통)
 */

"use client";

import { PillButton } from "@/components/ui/PillButton";
import { MicButton } from "@/components/ui/MicButton";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import { ThinkingElementStars } from "@/components/ui/ThinkingElementStars";
import { ConversationHistory } from "@/features/play/ConversationHistory";
import type { Message } from "@/lib/api/types";
import { subjectParticle } from "@/lib/korean";

/**
 * C-1 · C-2 우측 — 이야기를 듣는 동안. "지금은 아니야"가 확실히 읽혀야 한다.
 *
 * ── 캐릭터 영역을 뺐다 ─────────────────────────────────────────────
 * 예전에는 실루엣 초상 140px이 여기 있었다. 그런데 이 순간 아이가 볼 것은
 * **좌측 장면과 자막**이다. 우측에 큰 얼굴이 있으면 시선이 갈라지고, 곧 등장할
 * 캐릭터를 미리 흐릿하게 보여주는 것도 이야기의 재미를 깎는다.
 * 지금은 마이크가 꺼져 있다는 신호만 남긴다.
 */
export function WaitingPanel({ displayName }: { displayName: string | null }) {
  return (
    <div className="panel-inactive flex size-full flex-col items-center justify-center gap-6 px-8">
      <p className="text-center text-kid-body text-muted">
        {displayName
          ? `잠시 후 ${displayName}${subjectParticle(displayName)} 이야기해요`
          : "잠시 후 이야기가 이어져요"}
      </p>
      <MicButton state="disabled" size={96} />
      <p className="text-center text-parent-body text-muted">
        이야기가 끝나면 말할 차례가 와요
      </p>
    </div>
  );
}

/**
 * C-3 / C-7 우측 — 이 캐릭터와 주고받은 대화 내역
 *
 * ── 대사가 좌측으로 갔다 ────────────────────────────────────────────
 * 예전에는 이 패널이 **현재 대사**를 들고 있었다. 지금은 좌측(`CharacterStage`)이
 * 얼굴·이름·대사를 함께 보여주고, 여기는 **지금까지의 흐름**만 담는다.
 * 아이가 "무슨 이야기를 하고 있었지?"를 확인하는 자리다.
 *
 * ── 그 캐릭터와 나눈 이야기 **전체**를 보여준다 ─────────────────────
 * 처음에는 현재 장면 것만 보여줬다. 그런데 같은 캐릭터가 여러 장면에 나온다
 * (PRD I-13 · 방귀쟁이 며느리는 장면 1과 4에 모두 등장). 지금 장면 것만 보여주면
 * 아이가 "이 친구랑 아까 무슨 이야기 했었지?"를 확인할 수 없다.
 *
 * ⚠️ **다른 캐릭터 대사는 여전히 섞지 않는다.** 세션 전체를 그대로 부으면 누가
 *    말했는지 알 수 없다. 필터는 호출부(`PlayScreen`)가 하고, 지난 장면 묶음 앞에는
 *    `ConversationHistory`가 "지난 이야기" 구분선을 넣는다 — 장면 1의 대화와 장면 4의
 *    대화는 서로 다른 순간이라 이어 붙이면 한 대화로 읽힌다.
 *
 * GUIDED에서만 사고 요소 뱃지를 노출한다. "GUIDED"라는 개념 자체는 아이에게
 * 보이지 않는다 — 화면에 뜨는 것은 "오늘 모은 생각"이다.
 */
export function ConversationPanel({
  displayName,
  messages,
  currentSceneId,
  accumulatedElements,
  guided,
}: {
  displayName: string;
  messages: readonly Message[];
  /** 지금 장면 id — 지난 장면 대화 앞에 구분선을 넣는 데 쓴다 */
  currentSceneId?: string;
  accumulatedElements: readonly string[];
  guided: boolean;
}) {
  return (
    <div className="flex size-full min-h-0 flex-col">
      {/* 셸의 "잠시 멈춤" 버튼이 y=24~68을 쓴다. `pr-28`은 칩이 그 아래로 들어가지
          않게 하고, `min-h-[4.5rem]`(72px)은 **아래 대화 내역이 버튼 밑으로
          스크롤되지 않게** 한다. 헤더가 버튼보다 낮으면 말풍선이 버튼에 가려
          글자가 잘린다. */}
      <header className="flex min-h-[4.5rem] shrink-0 items-center gap-3 px-6 pt-4 pr-28">
        <p className="min-w-0 truncate text-parent-body font-bold text-muted">
          {displayName}와 나눈 이야기
        </p>
        <span className="shrink-0 rounded-pill bg-info px-2.5 py-0.5 text-sm font-bold text-white">
          말하는 중
        </span>
      </header>

      {messages.length === 0 ? (
        <p className="flex min-h-0 flex-1 items-center justify-center px-8 text-center text-parent-body text-muted">
          이제 첫 이야기를 시작해요
        </p>
      ) : (
        <ConversationHistory messages={messages} currentSceneId={currentSceneId} />
      )}

      {guided ? (
        <div className="shrink-0 bg-accent-soft/50 py-4">
          <ThinkingElementStars accumulatedElements={accumulatedElements} />
        </div>
      ) : null}

      <footer className="flex shrink-0 flex-col items-center gap-2 px-6 pb-5">
        {/* 미션 브리프는 이제 이 패널을 아예 대체하므로 좁아질 일이 없다.
            예전의 compact 분기를 지웠다. */}
        <MicButton state="disabled" size={96} />
        <p className="text-parent-body text-muted">
          {displayName}
          {subjectParticle(displayName)} 말하고 있어요
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
// export function ChildTurnPanel({
//   missionItem = null,
//   recording,
//   transcribing = false,
//   interimText,
//   micLevel,
//   onMicClick,
//   onSubmit,
//   submitDisabled,
// }: {
//   /**
//    * 미션 진행 중이면 **지금 말할 항목**. 미션 카드는 감추지만(계획 D17) 방금 읽은
//    * 항목을 잊지 않게 한 줄로 남긴다. 카드가 아니라 라벨이다.
//    */
//   missionItem?: string | null;
//   recording: boolean;
//   /** ① 변환 중. 마이크를 끄고 문구를 바꾼다. */
//   transcribing?: boolean;
//   interimText: string;
//   micLevel: number;
//   onMicClick: () => void;
//   onSubmit: () => void;
//   submitDisabled: boolean;
// }) {
//   const micState = transcribing
//     ? "disabled"
//     : recording
//       ? "recording"
//       : "idle";

//   return (
//     <div className="flex size-full min-h-0 flex-col">
//       {/* NPC 프로필과 지난 대사를 뺐다. 좌측(`CharacterStage`)이 얼굴·이름·대사를
//           이미 보여주므로 같은 정보를 우측에 또 두면 마이크 자리를 잡아먹는다.
//           이 패널은 **말하는 일**에만 쓴다. */}

//       {/* overflow-hidden이 없으면 좁아졌을 때 마이크가 위아래로 삐져나와
//           말풍선과 푸터를 덮는다.
//           ⚠️ `pt-20`이 없으면 "이제 말해 볼까?"의 위쪽이 **잘린다.** 아래 마이크 칸이
//              `flex-1`로 남은 높이를 다 가져가 열이 꽉 차고, 그러면 `justify-center`가
//              할 일이 없어져 문구가 y=0에 앉는다. text-turn은 32px이라 그대로 잘린다.
//           ⚠️ 80px인 이유: 셸의 "잠시 멈춤" 버튼이 y=24~68을 쓴다. 그 아래에서 시작하면
//              **세로로 겹치지 않으므로 가로 위치와 무관하게 안전하다.**
//              예전에는 `pr-28`(112px)로 오른쪽을 비워 피했는데, 그 버튼은 우상단
//              모서리에만 있는데도 열 전체에 여백이 걸려 **마이크까지 43px 왼쪽으로
//              밀렸다.** 좌우 여백을 대칭으로 두면 모든 요소가 패널 진짜 중심에 온다. */}
//       <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-hidden px-6 pt-20">
//         {missionItem ? (
//           <p className="flex shrink-0 items-center gap-2 self-start">
//             <span className="rounded-pill bg-primary px-2.5 py-0.5 text-xs font-bold text-white">
//               미션
//             </span>
//             <span className="text-parent-body font-bold text-text">
//               {missionItem}
//             </span>
//           </p>
//         ) : null}

//         <p className="shrink-0 text-center text-turn leading-tight font-bold text-primary">
//           {transcribing ? "잘 들었어!" : "이제 말해 볼까?"}
//         </p>

//         {/* 남은 높이를 마이크가 받는다. 이 칸은 flex-1로 높이가 확정되므로
//             adaptive를 켜도 안전하다. MicButton 주석의 경고 참조. */}
//         <div className="flex min-h-0 w-full flex-1 items-center justify-center">
//           <MicButton
//             state={micState}
//             size={180}
//             level={micLevel}
//             onClick={onMicClick}
//             adaptive
//           />
//         </div>

//         {/* "변환 중"은 아이에게 기술 용어다. 무슨 일이 일어나는지로 쓴다. */}
//         {transcribing ? (
//           <p
//             aria-live="polite"
//             className="flex shrink-0 items-center gap-2 text-center text-parent-body text-muted"
//           >
//             <span aria-hidden className="flex gap-1">
//               {[0, 1, 2].map((i) => (
//                 <span
//                   key={i}
//                   style={{ animationDelay: `${i * 0.15}s` }}
//                   className="size-1.5 animate-bounce rounded-full bg-muted"
//                 />
//               ))}
//             </span>
//             네 말을 글로 옮기고 있어…
//           </p>
//         ) : (
//           <></>
//         )}

//         {interimText ? (
//           <p className="max-w-full shrink-0 truncate rounded-bubble bg-secondary-soft px-4 py-2 text-center text-kid-body text-text">
//             {interimText}
//           </p>
//         ) : null}
//       </div>
//     </div>
//   );
// }

/**
 * C-4 — 내 차례. 이 화면의 시각 신호가 약하면 서비스 전체가 작동하지 않는다.
 */
export function ChildTurnPanel({
  missionItem = null,
  recording,
  transcribing = false,
  interimText,
  micLevel,
  onMicClick,
}: {
  missionItem?: string | null;
  recording: boolean;
  transcribing?: boolean;
  interimText: string;
  micLevel: number;
  onMicClick: () => void;
  onSubmit: () => void;
  submitDisabled: boolean;
}) {
  const micState = transcribing
    ? "disabled"
    : recording
      ? "recording"
      : "idle";

  return (
    <div className="relative flex size-full min-h-0 flex-col items-center justify-between px-6 pb-8 pt-20">
      {/* 1. 상단 타이틀 & 미션 영역 (상단 고정) */}
      <div className="flex shrink-0 flex-col items-center gap-2 text-center">
        {missionItem ? (
          <p className="flex shrink-0 items-center gap-2 self-start">
            <span className="rounded-pill bg-primary px-2.5 py-0.5 text-xs font-bold text-white">
              미션
            </span>
            <span className="text-parent-body font-bold text-text">
              {missionItem}
            </span>
          </p>
        ) : null}

        <p className="shrink-0 text-center text-turn leading-tight font-bold text-primary">
          {transcribing ? "잘 들었어!" : "이제 말해 볼까?"}
        </p>
      </div>

      {/* 2. 중앙 마이크 영역 (세로 중앙 배치) */}
      <div className="flex min-h-0 w-full flex-1 items-center justify-center py-4">
        <MicButton
          state={micState}
          size={180}
          level={micLevel}
          onClick={onMicClick}
          adaptive
        />
      </div>

      {/* 3. 하단 안내 문구 & 실시간 텍스트 영역 (하단 여백 확보) */}
      <div className="flex shrink-0 min-h-[3rem] flex-col items-center justify-center gap-2 pb-4">
        {transcribing ? (
          <p
            aria-live="polite"
            className="flex items-center gap-2.5 text-center text-kid-body font-bold text-text"
          >
            <span aria-hidden className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{ animationDelay: `${i * 0.15}s` }}
                  className="size-2 animate-bounce rounded-full bg-primary"
                />
              ))}
            </span>
            네 말을 글로 옮기고 있어…
          </p>
        ) : null}

        {interimText ? (
          <p className="max-w-full shrink-0 truncate rounded-bubble bg-secondary-soft px-4 py-2 text-center text-kid-body text-text">
            {interimText}
          </p>
        ) : null}
      </div>
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
 * ①(변환 중)과 **다른 화면이다.** ①은 아이 차례 틀에서 마이크만 꺼지고, 여기는
 * 내 말이 말풍선으로 올라간 뒤 캐릭터가 생각하는 구간이다. 요청 문서가 두 구간을
 * 구분해 달라고 요구한다. 예산은 10초. (docs/request/frontend/stt-tts-integration.md)
 */
export function ThinkingPanel({
  childText,
  elapsedMs,
}: {
  childText: string;
  elapsedMs: number;
}) {
  // 예산이 10초이므로 6초에서 문구를 바꾼다. 8초에 바꾸면 남은 2초에만 보인다.
  const hint = elapsedMs > 6000 ? "조금만 더 기다려줘" : "음… 생각 중이야";

  return (
    <div className="flex size-full min-h-0 flex-col">
      {/* 초상화를 여기 두지 않는다. 좌측 패널이 같은 얼굴을 상시 그리고 있어
          한 화면에 두 번 나온다 (2026-08-13 개편). 기다리는 신호만 남긴다. */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-hidden">
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
  onRetry,
  onSkip,
}: {
  onRetry: () => void;
  onSkip: () => void;
}) {
  return (
    // 미션과 함께 뜨면 넘친다. m-auto로 자리가 남을 때만 가운데로 몰고,
    // 모자라면 위에서부터 채워 스크롤로 닿게 한다.
    <div className="flex size-full min-h-0 flex-col overflow-y-auto px-8 py-6">
      <div className="m-auto flex w-full flex-col items-center gap-5">
        {/* 초상화 없음 — 좌측 패널에 이미 있다 (ThinkingPanel과 같은 이유).
            자리가 빠진 만큼 미션과 함께 떠도 넘치지 않는다. */}
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
