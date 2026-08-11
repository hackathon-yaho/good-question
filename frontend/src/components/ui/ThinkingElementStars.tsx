/**
 * ThinkingElementStars — docs/spec/screens.md §1-6, C-7, C-12
 *
 *   "오늘 모은 생각"
 *    ★     ★     ☆     ☆
 *   마음   이유   생각   방법
 *
 * 지켜야 할 것:
 *   - 영문 코드(REASON 등)를 화면에 노출하지 않는다
 *   - "점수"처럼 보이지 않게 한다. 평가가 아니라 "모으는 재미"다
 *   - GUIDED라는 개념 자체를 아이에게 노출하지 않는다
 *   - missingElements를 "못한 것"으로 표시하지 않는다. 빈 별은 그냥 아직 안 모은 것이다
 */

import { KID_GROUPS, toKidGroupFlags } from "@/lib/thinking-elements";

type Props = {
  /** 서버가 내려준 accumulatedElements. 영문 코드 배열 */
  accumulatedElements: readonly string[];
  title?: string;
};

export function ThinkingElementStars({
  accumulatedElements,
  title = "오늘 모은 생각",
}: Props) {
  const flags = toKidGroupFlags(accumulatedElements);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-kid-body font-bold text-muted">{title}</p>

      <ul className="flex items-start gap-6">
        {KID_GROUPS.map((group) => {
          const earned = flags[group];
          return (
            <li key={group} className="flex flex-col items-center gap-1">
              <span
                aria-hidden
                className={[
                  "text-4xl leading-none transition-colors",
                  earned ? "text-accent" : "text-border",
                ].join(" ")}
              >
                {earned ? "★" : "☆"}
              </span>
              <span
                className={[
                  "text-kid-body font-bold",
                  earned ? "text-text" : "text-muted",
                ].join(" ")}
              >
                {group}
              </span>
              <span className="sr-only">
                {earned ? `${group} 모았어요` : `${group} 아직이에요`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
