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
 * ── 높이가 모자랄 때 무엇을 접는가 ──────────────────────────────────
 * 우측 패널은 미션과 대화를 함께 담아야 해서 카드 높이가 제한된다.
 * 처음에는 카드 전체를 스크롤 상자에 넣었는데, **"알겠어요" 버튼이 접힌 아래로
 * 내려가 아이가 미션을 닫을 방법을 못 찾았다.**
 *
 * 그래서 제목과 버튼은 고정하고 **체크리스트만** 스크롤한다. 무엇을 해야 하는지와
 * 어떻게 넘어가는지는 언제나 보여야 한다.
 *
 * 제목 줄은 우측에 자리를 비워 둔다. 셸의 "잠시 멈춤" 버튼이 그 위에 떠 있다.
 *
 * ── 체크리스트를 2×2로 놓는 이유 ────────────────────────────────────
 * 세로 1열로 놓으면 4개 중 2개만 보이고 나머지는 스크롤 아래로 숨는다. 미션은
 * 4단계를 함께 보면서 생각하는 장치라서 절반만 보이면 의미가 없다.
 * 명세 C-11도 카드 4장을 **가로 배열**로 그렸다. 900px 오버레이를 40% 패널로
 * 옮긴 만큼(Q-04) 4열은 못 쓰고, 2×2가 그 의도에 가장 가깝다.
 */

"use client";

import { PillButton } from "@/components/ui/PillButton";
import type { MissionTrigger } from "@/lib/api/types";

type Props = {
  mission: MissionTrigger;
  onDismiss: () => void;
};

export function MissionCard({ mission, onDismiss }: Props) {
  return (
    <section className="mx-6 mb-4 flex max-h-full min-h-0 flex-col rounded-card border-2 border-accent bg-accent-soft p-5">
      {/* pr-28: 셸의 "잠시 멈춤" 버튼이 이 자리 위에 떠 있다 */}
      <div className="shrink-0 pr-28">
        <p className="mb-1 text-sm font-bold text-primary">미션</p>
        <h3 className="mb-4 text-kid-button font-bold text-text">
          {mission.title}
        </h3>
      </div>

      {/* 2×2. 자리가 더 모자라면 이 격자만 스크롤한다. 제목과 버튼은 늘 보인다. */}
      <ul className="grid min-h-0 flex-1 grid-cols-2 content-start gap-2 overflow-y-auto">
        {mission.checklist.map((item, index) => (
          <li
            key={item.label}
            className="flex min-w-0 items-start gap-2 rounded-bubble bg-surface px-3 py-2.5"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-text">
              {index + 1}
            </span>
            {/* 사고 요소 칩(마음·이유·생각·방법)을 여기 넣지 않는다.
                별 줄로 빼면 칸마다 한 줄씩 늘어나 2행이 안 들어가고, 글에 흐르게
                붙이면 해상도에 따라 라벨이 3줄로 밀려 행 높이가 불안정해졌다.
                (1280×800에서만 4개 중 2개만 보이는 현상이 그래서 났다.)
                같은 정보는 C-7·C-12의 별 뱃지가 이미 보여준다. */}
            <span className="min-w-0 text-kid-body leading-snug text-text">
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex shrink-0 justify-end">
        <PillButton variant="outlined" onClick={onDismiss}>
          알겠어요
        </PillButton>
      </div>
    </section>
  );
}
