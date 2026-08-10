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
 */

"use client";

import { PillButton } from "@/components/ui/PillButton";
import { toKidGroup, type ThinkingElement } from "@/lib/thinking-elements";
import type { MissionTrigger } from "@/lib/api/types";

type Props = {
  mission: MissionTrigger;
  onDismiss: () => void;
};

export function MissionCard({ mission, onDismiss }: Props) {
  return (
    <section className="mx-6 mb-4 rounded-card border-2 border-accent bg-accent-soft p-5">
      <p className="mb-1 text-sm font-bold text-primary">미션</p>
      <h3 className="mb-4 text-kid-button font-bold text-text">
        {mission.title}
      </h3>

      <ul className="flex flex-col gap-2">
        {mission.checklist.map((item, index) => (
          <li
            key={item.label}
            className="flex items-center gap-3 rounded-bubble bg-surface px-4 py-3"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-text">
              {index + 1}
            </span>
            <span className="text-kid-body text-text">{item.label}</span>
            {/* 영문 코드를 노출하지 않는다. 4그룹 한글로만 보여준다. (§1-7) */}
            <span className="ml-auto shrink-0 rounded-pill bg-accent-soft px-2.5 py-1 text-sm font-bold text-muted">
              {toKidGroup(item.element as ThinkingElement) ?? ""}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex justify-end">
        <PillButton variant="outlined" onClick={onDismiss}>
          알겠어요
        </PillButton>
      </div>
    </section>
  );
}
