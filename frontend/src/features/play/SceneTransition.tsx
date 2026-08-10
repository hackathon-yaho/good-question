/**
 * C-12 장면 전환 인터스티셜 — docs/spec/screens.md C-12
 *
 * 마무리 대사는 서버가 story_scenes.character_closing을 조회해 내려준 고정 텍스트다.
 * LLM이 생성하지 않는다. (PRD I-01)
 *
 * ⚠️ 절대 금지: 점수, 퍼센트, 등급, "잘했어요/아쉬워요" 같은 평가 표현.
 *    마지막 대사는 평가가 아니라 다음 장면으로의 연결이다.
 */

"use client";

import { PillButton } from "@/components/ui/PillButton";
import { ThinkingElementStars } from "@/components/ui/ThinkingElementStars";
import { CharacterPortrait } from "@/features/play/CharacterPortrait";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import { numberRo } from "@/lib/korean";

type Props = {
  displayName: string;
  closingText: string;
  accumulatedElements: readonly string[];
  /** 다음 장면 번호(화면 단위). 마지막이면 null */
  nextScreenIndex: number | null;
  onContinue: () => void;
  continueDisabled: boolean;
};

export function SceneTransition({
  displayName,
  closingText,
  accumulatedElements,
  nextScreenIndex,
  onContinue,
  continueDisabled,
}: Props) {
  return (
    <div className="relative flex size-full flex-col items-center justify-center gap-8 overflow-hidden bg-bg px-12">
      {/* 별 파티클 */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {[
          [12, 18], [28, 72], [44, 26], [61, 64], [78, 34], [88, 78],
          [20, 46], [70, 12],
        ].map(([left, top], i) => (
          <span
            key={i}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              animationDelay: `${i * 0.25}s`,
            }}
            className="absolute animate-pulse text-2xl text-accent"
          >
            ✦
          </span>
        ))}
      </div>

      <CharacterPortrait displayName={displayName} size={120} />

      <div className="z-10 w-full max-w-shell-card">
        <SpeechBubble speaker="character" emphasis>
          {closingText}
        </SpeechBubble>
      </div>

      <div className="z-10">
        <ThinkingElementStars accumulatedElements={accumulatedElements} />
      </div>

      <p className="z-10 text-kid-body text-muted">
        {nextScreenIndex
          ? `장면 ${nextScreenIndex}${numberRo(nextScreenIndex)} 넘어갈게요`
          : "이야기가 끝났어요"}
      </p>

      <PillButton
        size="kid-lg"
        onClick={onContinue}
        disabled={continueDisabled}
        className="z-10"
      >
        계속하기
      </PillButton>
    </div>
  );
}
