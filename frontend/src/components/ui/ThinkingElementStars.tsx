/**
 * ThinkingElementStars — docs/spec/screens.md §1-6, C-7, C-12
 *
 *   "오늘 모은 생각"
 *    ♡     ?     💡     🔑     ← 그룹마다 다른 아이콘 (2색: 모았다 / 아직)
 *   마음   이유   생각   방법
 *
 * ── 별 4개에서 그룹별 아이콘으로 바꿨다 ─────────────────────────────
 * 같은 별 4개는 **"몇 개 채웠나"로 읽힌다.** 개수가 눈에 먼저 들어와 점수처럼 보인다.
 * 아이콘이 다르면 "무엇을 말했나"가 먼저 읽힌다 — 마음을 말했는지, 이유를 말했는지.
 * 아이콘은 파일이 아니라 인라인 SVG다. `currentColor`로 활성/비활성을 CSS가 정한다.
 *
 * 지켜야 할 것:
 *   - 영문 코드(REASON 등)를 화면에 노출하지 않는다
 *   - "점수"처럼 보이지 않게 한다. 평가가 아니라 "모으는 재미"다
 *   - GUIDED라는 개념 자체를 아이에게 노출하지 않는다
 *   - missingElements를 "못한 것"으로 표시하지 않는다. 회색은 그냥 아직 안 모은 것이다
 *     → 빨간색·X 마크를 쓰지 않는 이유가 이것이다
 */

import { KID_GROUPS, toKidGroupFlags, type KidGroup } from "@/lib/thinking-elements";

/**
 * 그룹별 아이콘. 뜻이 바로 읽히는 것으로 골랐다 (계획 D7).
 *   마음 = 하트 · 이유 = 물음표 · 생각 = 전구 · 방법 = 열쇠
 */
const ICON: Record<KidGroup, React.ReactNode> = {
  마음: (
    <path d="M12 20.5l-1.4-1.3C6 15.1 3 12.4 3 9a4.5 4.5 0 018.99-.6h.02A4.5 4.5 0 0121 9c0 3.4-3 6.1-7.6 10.2z" />
  ),
  이유: (
    <>
      <path d="M9 8.5a3 3 0 015.9.8c0 2-2.9 2.5-2.9 4.7" />
      <circle cx="12" cy="18.5" r="1.2" />
    </>
  ),
  생각: (
    <>
      <path d="M9.2 16.5a6 6 0 115.6 0" />
      <path d="M9.5 16.5h5M10.2 19.5h3.6" />
    </>
  ),
  방법: (
    <>
      <circle cx="8.5" cy="8.5" r="4" />
      <path d="M11.4 11.4L20 20M16.5 15.5l-2 2M19 18l-2 2" />
    </>
  ),
};

/** 채운 아이콘(마음)과 선 아이콘(나머지)이 섞여 있어 stroke/fill을 그룹별로 나눈다. */
const FILLED: Record<KidGroup, boolean> = {
  마음: true,
  이유: false,
  생각: false,
  방법: false,
};

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
          const filled = FILLED[group];
          return (
            <li key={group} className="flex flex-col items-center gap-1.5">
              <span
                aria-hidden
                className={[
                  "flex size-14 items-center justify-center rounded-full transition-colors",
                  earned
                    ? "bg-secondary-soft text-secondary"
                    : "bg-bg text-border",
                ].join(" ")}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="size-8"
                  fill={filled ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth={filled ? 0 : 2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {ICON[group]}
                </svg>
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
