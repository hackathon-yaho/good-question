/**
 * SpeechBubble — docs/spec/screens.md §1-6, C-3
 *
 * 대화 히스토리 표시 규칙:
 *   character → 좌측 정렬, 흰색 + border
 *   child     → 우측 정렬, secondary-soft
 *
 * speaker="system" 메시지는 미션 노출 기록이므로 히스토리에 표시하지 않는다.
 * (PRD 7.6) 호출부에서 걸러낼 것.
 */

import type { ReactNode } from "react";

type Props = {
  speaker: "character" | "child";
  children: ReactNode;
  /** 현재 발화 중인 대사. 30px bold로 크게 보여준다. (§1-3) */
  emphasis?: boolean;
  /** C-4에서 직전 캐릭터 대사를 흐리게 축소 표시할 때 */
  dimmed?: boolean;
};

export function SpeechBubble({
  speaker,
  children,
  emphasis = false,
  dimmed = false,
}: Props) {
  const isChild = speaker === "child";

  return (
    <div className={isChild ? "flex justify-end" : "flex justify-start"}>
      <div
        className={[
          "max-w-[92%] rounded-bubble px-6 py-4",
          isChild
            ? "bg-secondary-soft text-text"
            : "border border-border bg-surface text-text",
          // 아이 화면 대사는 한 번에 한 문장, 줄당 최대 22자 (§1-3)
          emphasis
            ? "text-dialogue leading-snug font-bold"
            : "text-kid-body leading-relaxed",
          dimmed ? "opacity-85" : "",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}
