/**
 * 미션 종료 오버레이 — C-10·C-11 공통
 *
 * 미션 1(체크리스트 완료/기회 소진)과 미션 2(성공/재시도 소진) 네 경우 모두
 * **같은 화면**을 쓴다. "미션이 끝났어요"는 결과를 안 가리는 사실 진술이라
 * 축하이지 평가가 아니다(§ steps.tsx:419, SceneTransition.tsx:7 — 잘했어요/
 * 아쉬워요 같은 평가 표현 금지). 그래서 네 경우를 가릴 필요가 없다 — 실제로
 * 몇 개를 채웠는지는 이 화면이 뜨기 직전까지 미션 카드가 이미 보여줬다.
 *
 * ⚠️ 버튼이 없다. `show`가 꺼지면(호출부가 타이머로 끈다) 그냥 사라지고 대화가
 *    이어진다 — 미션을 전체 화면 모달로 만들지 않는다는 원칙(PRD 5.2)과, 흐름을
 *    안 끊는다는 요청을 같이 지키는 방법이다.
 * ⚠️ `pointer-events-none` — 장식 레이어라 클릭을 삼키면 안 된다. 이 화면이 떠
 *    있는 동안에도 아이가 마이크를 누르거나 다음 상호작용을 할 수 있어야 한다.
 *
 * 별 조각 위치는 StarDustRain(D-7 완료 화면)과 같은 이유로 **고정 배열**이다 —
 * Math.random()을 쓰면 서버 렌더와 클라이언트 렌더가 달라져 하이드레이션이 어긋난다.
 */

"use client";

import { StarDustIcon } from "@/components/ui/StarDust";

/** [좌측 %, 상단 %, 크기 px, 지연 s] */
const FLECKS: readonly [number, number, number, number][] = [
  [9, 14, 15, 0],
  [85, 12, 15, 1.1],
  [14, 78, 15, 0.6],
  [90, 74, 11, 1.8],
];

export function MissionCompleteOverlay({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center px-6"
    >
      <div className="absolute inset-0 bg-text/45" />

      <div
        className="animate-mission-pop relative flex w-full max-w-[27rem] flex-col items-center gap-3 overflow-hidden rounded-sheet px-8 pt-10 pb-8 text-center shadow-soft"
        style={{
          background:
            "radial-gradient(120% 90% at 50% -10%, var(--color-accent-soft) 0%, var(--color-surface) 62%)",
        }}
      >
        {FLECKS.map(([left, top, size, delay], i) => (
          <span
            key={i}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              animationDelay: `${delay}s`,
            }}
            className="animate-mission-fleck absolute text-accent"
          >
            <StarDustIcon size={size} />
          </span>
        ))}

        <span className="relative flex size-[4.4em] items-center justify-center rounded-full bg-surface text-[1rem] shadow-soft">
          <span
            aria-hidden
            className="animate-mission-glow absolute -inset-1.5 rounded-full bg-accent/45 blur-md"
          />
          <StarDustIcon size={34} className="relative text-primary" />
        </span>

        <p className="text-headline leading-snug font-bold text-text">
          미션이
          <br />
          끝났어요
        </p>
        <p className="-mt-1 text-kid-body text-muted">이야기가 이어져요</p>

        <span className="mt-2 flex items-center gap-2 rounded-pill bg-primary/8 px-4 py-1.5 text-sm font-bold text-muted">
          <span
            aria-hidden
            className="animate-mission-ring size-[1.1em] rounded-full"
            style={{
              background:
                "conic-gradient(var(--color-primary) 0deg, var(--color-primary) 180deg, var(--color-border) 180deg)",
            }}
          />
          잠시 후 자동으로 이어져요
        </span>
      </div>
    </div>
  );
}
