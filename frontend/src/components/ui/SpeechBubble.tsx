/**
 * SpeechBubble — docs/spec/screens.md §1-6, C-3
 *
 * 대화 히스토리 표시 규칙:
 *   character → 좌측 정렬, info-soft
 *   child     → 우측 정렬, secondary-soft
 *
 * ── 테두리를 채움으로 바꿨다 ────────────────────────────────────────
 * 원래 캐릭터 말풍선은 "흰색 + border"였다. 그런데 우측 패널도 흰색(surface)이라
 * **테두리가 말풍선을 보이게 하는 유일한 수단**이었고, 폭이 패널의 92%라서
 * 위아래 변이 수평 구분선처럼 읽혔다.
 *
 * 채움으로 바꾸니 테두리 없이도 말풍선이 보이고, 말하는 이가 색으로 구분된다.
 * §1-5의 색 규칙(캐릭터 발화 = info / 아이 발화 = secondary)과도 맞는다.
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
          isChild ? "bg-secondary-soft text-text" : "bg-info-soft text-text",
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
