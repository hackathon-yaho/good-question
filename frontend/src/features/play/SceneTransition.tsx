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
  characterImageUrl?: string | null;
  closingText: string;
  accumulatedElements: readonly string[];
  /** 다음 장면 번호(화면 단위). 마지막이면 null */
  nextScreenIndex: number | null;
  onContinue: () => void;
  continueDisabled: boolean;
};

export function SceneTransition({
  displayName,
  characterImageUrl,
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

      <CharacterPortrait displayName={displayName} imageUrl={characterImageUrl} size={180} />

      {/* 마무리 대사가 이 화면의 주인공이다. 폭을 넓히고 가운데 정렬해
          "장면이 닫혔다"는 느낌을 준다. 평가 문구가 아니라 연결이다.
          `align="center"`가 필요한 이유는 SpeechBubble 주석에 적어뒀다.
          폭은 shell-wide(720px) — 31px 글자로 한글 26자다. 22자 규칙(§1-3)보다
          약간 넓은데, 이건 아이가 읽는 본문이 아니라 캐릭터가 읽어주는 대사다. */}
      <div className="z-10 w-full max-w-shell-wide">
        <SpeechBubble speaker="character" emphasis align="center">
          <span className="block text-center leading-relaxed">{closingText}</span>
        </SpeechBubble>
      </div>

      <div className="z-10">
        <ThinkingElementStars accumulatedElements={accumulatedElements} />
      </div>

      {/* 다음 장면 안내 — 아이가 이 줄을 보고 "계속하기"를 누른다. 눈에 들어와야 한다 */}
      <p className="z-10 text-narration font-bold text-text">
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
