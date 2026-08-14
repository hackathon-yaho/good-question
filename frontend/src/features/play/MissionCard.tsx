/**
 * 미션 카드 — docs/spec/screens.md C-10, C-11
 *
 * ⚠️ 화면 명세 원문은 "중앙 오버레이 900px"로 되어 있으나 그대로 만들면 **요건 위반**이다.
 *    주최측 콘텐츠 흐름 자료: "전개·대화·미션은 각각 별도 화면이 아니라 같은 장면 화면 안에서
 *    순차적으로 진행되는 콘텐츠 단계"이며 "전체 화면 모달로 구성하지 않는다".
 *    (PRD 5.2, 작업 분장 2.4, open-questions Q-04)
 *
 *    그래서 대화 패널 안의 인라인 카드로 만든다. 대화 흐름이 끊기지 않는다.
 *
 * 미션은 처음부터 노출하지 않는다. 서버가 노출 시점을 판단해 내려준다.
 * 프론트는 신호를 받아 표시만 한다. (작업 분장 3.7)
 *
 * ── 한 항목씩 순차로 진행한다 ────────────────────────────────────────
 * 4항목을 한 번에 다 말하게 하지 않는다. 1번을 말하면 2번, 그렇게 4번까지 간다.
 * 카드는 [브리프 → 발화 → 브리프 → …]로 **네 번 돌아온다.**
 *
 * 그래서 체크리스트가 **1열 4행**이다. 예전엔 2×2였고 근거는 "세로 1열은 4개 중
 * 2개만 보인다"였는데, 브리프에서는 마이크를 그리지 않아 우측 패널 전체가 카드
 * 자리가 됐다 — 그 근거가 사라졌다. 한 줄에 하나면 **읽는 순서가 곧 말하는 순서**다.
 *
 * ── 구성 ────────────────────────────────────────────────────────────
 *   [미션] 칩 + 미션 이름
 *   4가지 확인 항목 (1열) — 완료 / 현재 / 대기를 색으로 구분
 *   지금 말해볼 것 (라벨 행 / 칩 행) — 현재 항목 하나만
 *
 * `말해볼래요` 버튼은 **이 카드 안에 없다.** 호출부가 카드 밖 하단에 놓는다.
 * "카드는 읽을 것, 버튼은 할 것"으로 역할을 나눈다. (계획 D23)
 *
 * ── 완료 판정은 어디서 오나 ──────────────────────────────────────────
 * `machine.ts`의 `missionDoneCount()`가 정한다. 프론트가 아이 발화를 채점하지
 * 않는다(§0-2). 완료 표시의 뜻은 "맞았어요"가 아니라 **"말했어요"** 다.
 *
 * ── 키워드는 어디서 오나 ────────────────────────────────────────────
 * 서버가 주는 것은 `label`(문장)과 `element`(영문 코드)뿐이다. label은 길어서 키워드가
 * 못 되고 영문 코드는 **노출 금지**다. 그래서 `thinking-elements.ts`를 거쳐 나온
 * **4그룹 한글 이름**(마음·이유·생각·방법)을 키워드로 쓴다. (계획 D14)
 */

/**
 * 미션 카드 — docs/spec/screens.md C-10, C-11
 */

"use client";

import type { MissionTrigger } from "@/lib/api/types";
import { toKidGroup, type ThinkingElement } from "@/lib/thinking-elements";

type Props = {
  mission: MissionTrigger;
  /** 완료로 표시할 항목 수. `machine.ts`의 `missionDoneCount()` 결과 */
  doneCount: number;
  /** 미션 2처럼 한 번 해보고 어려울 때 힌트를 붙인다 */
  showHint?: boolean;
};

/** 항목 상태별 표시 — 색·링·굵기로만 구분한다. `[완료]` 텍스트는 쓰지 않는다 */
const ROW = {
  done: {
    row: "bg-secondary-soft",
    badge: "bg-secondary text-white",
    label: "text-muted",
    sr: "말했어요",
  },
  current: {
    row: "bg-surface ring-2 ring-primary",
    badge: "bg-primary text-white",
    label: "font-bold text-text",
    sr: "지금 말할 차례예요",
  },
  waiting: {
    row: "bg-surface/60",
    badge: "bg-primary-soft text-muted",
    label: "text-muted",
    sr: "아직이에요",
  },
} as const;

export function MissionCard({ mission, doneCount, showHint = false }: Props) {
  /** 지금 말할 항목. 다 채웠으면 없다 */
  const current = mission.checklist[doneCount] ?? null;

  /** 
   * 지금 말해볼 것 — 현재 항목을 기반으로 3개의 주요 키워드를 구성합니다.
   * (실제 키워드 모음/fallback 데이터를 통해 3개 그룹을 제공)
   */
  const currentGroup = current
    ? toKidGroup(current.element as ThinkingElement)
    : null;

  // 💡 3개의 키워드 목록을 만듭니다. (현재 그룹을 포함하여 총 3줄)
  const defaultKeywords = ["마음", "생각", "방법"];
  const keywords = currentGroup
    ? Array.from(new Set([currentGroup, ...defaultKeywords])).slice(0, 3)
    : defaultKeywords;

  return (
    <section className="flex max-h-full min-h-0 w-full flex-col overflow-y-auto rounded-card border-2 border-accent bg-accent-soft p-4">
      <div className="shrink-0">
        <p className="mb-1 w-fit rounded-pill bg-primary px-3 py-0.5 text-sm font-bold text-white">
          미션
        </p>
        <h3 className="mb-3 text-parent-title font-bold text-text">
          {mission.title}
        </h3>
      </div>

      <ul className="flex shrink-0 flex-col gap-2">
        {mission.checklist.map((item, index) => {
          const state =
            index < doneCount
              ? ROW.done
              : index === doneCount
                ? ROW.current
                : ROW.waiting;
          return (
            <li
              key={item.label}
              className={`flex min-w-0 items-center gap-2.5 rounded-bubble px-3.5 py-2.5 transition-colors ${state.row}`}
            >
              <span
                className={`flex size-6.5 shrink-0 items-center justify-center rounded-full text-sm font-bold ${state.badge}`}
              >
                {index < doneCount ? "✓" : index + 1}
              </span>
              <span className={`min-w-0 text-kid-body ${state.label}`}>
                {item.label}
              </span>
              <span className="sr-only">{state.sr}</span>
            </li>
          );
        })}
      </ul>

      {/* 🟢 지금 말해볼 것 — 3개의 키워드가 각각 fullWidth를 차지하여 3줄로 표시됩니다 */}
      {current ? (
        <div className="mt-4 shrink-0">
          <p className="mb-2 text-parent-body font-bold text-muted">
            지금 말해볼 것
          </p>
          <div className="flex flex-col gap-2">
            {keywords.map((kw, idx) => (
              <div
                key={idx}
                className="flex w-full items-center justify-center rounded-bubble border-2 border-accent bg-surface py-2.5 px-4 text-center text-parent-body font-bold text-text shadow-sm"
              >
                {kw}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 힌트 */}
      {showHint && current ? (
        <p className="mt-3 shrink-0 rounded-bubble bg-surface px-3.5 py-2.5 text-parent-body leading-snug text-text">
          <span className="font-bold text-primary">힌트 </span>
          이런 걸 말해보면 어때? “{current.label}”
        </p>
      ) : null}
    </section>
  );
}