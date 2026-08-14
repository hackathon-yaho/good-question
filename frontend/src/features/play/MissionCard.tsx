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
 * ── 미션 1 진행 방식 ──────────────────────────────────────────────
 * 4가지 항목은 아이가 보고 생각할 수 있도록 방향을 유도하는 가이드입니다.
 * 별도의 체크 표시 없이 4개 항목을 리스트로 노출합니다.
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

"use client";

import type { MissionTrigger } from "@/lib/api/types";

type Props = {
  mission: MissionTrigger;
  /** 한 번 해보고 어려울 때 힌트를 붙인다 */
  showHint?: boolean;
};

export function MissionCard({ mission, showHint = false }: Props) {
  return (
    <section className="flex max-h-full min-h-0 w-full flex-col overflow-y-auto rounded-card border-2 border-accent bg-accent-soft p-4">
      {/* 미션 헤더 */}
      <div className="shrink-0">
        <p className="mb-1 w-fit rounded-pill bg-primary px-3 py-0.5 text-sm font-bold text-white">
          미션
        </p>
        <h3 className="mb-3 text-parent-title font-bold text-text">
          {mission.title}
        </h3>
      </div>

      {/* 4가지 관찰/생각 항목 가이드 리스트 */}
      <ul className="flex shrink-0 flex-col gap-2">
        {mission.checklist.map((item, index) => (
          <li
            key={item.label || index}
            className="flex min-w-0 items-center gap-2.5 rounded-bubble bg-surface px-3.5 py-2.5 ring-1 ring-accent/50"
          >
            <span className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
              {index + 1}
            </span>
            <span className="min-w-0 text-kid-body font-bold text-text">
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      {/* 힌트 영역 */}
      {showHint ? (
        <p className="mt-3 shrink-0 rounded-bubble bg-surface px-3.5 py-2.5 text-parent-body leading-snug text-text">
          <span className="font-bold text-primary">힌트 </span>
          위의 내용을 생각해보면서 마이크를 누르고 자유롭게 말해보자!
        </p>
      ) : null}
    </section>
  );
}