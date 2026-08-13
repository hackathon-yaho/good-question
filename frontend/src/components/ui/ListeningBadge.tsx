/**
 * "이야기를 듣고 있어요" — 나레이션 재생 표시
 *
 * C-1 도입과 C-2 전개의 자막 **위**에 붙는다. 아이에게 "지금은 듣는 차례"를 알려
 * 마이크를 찾지 않게 한다. (screens.md C-2 — "지금은 아니야"가 읽혀야 한다)
 *
 * 웨이브는 이미지가 아니라 막대 4개 + CSS 애니메이션이다. 실제 음량이 아니라
 * "소리가 나고 있다"는 신호다 — 원본 음성을 다루지 않으므로 요건(PRD 10.3)과 무관하다.
 *
 * ── 배치가 두 가지다 ────────────────────────────────────────────────
 *   stacked — 웨이브 행 / 라벨 행. 자막 위에 얹는 C-1·C-2용
 *   inline  — 웨이브와 라벨이 한 알약 안에. C-3의 **캐릭터 이름 옆**용
 *
 * C-3에서는 이름과 상태가 한 줄로 읽혀야 하므로 inline이 계속 필요하다.
 * 하나로 통일하지 않는 이유다.
 *
 * `prefers-reduced-motion`에서는 움직임을 멈춘다. 막대는 그대로 보인다.
 */

const BARS = [0, 1, 2, 3];

export function ListeningBadge({
  label = "이야기를 듣고 있어요",
  layout = "inline",
}: {
  label?: string;
  layout?: "inline" | "stacked";
}) {
  const wave = (
    <span aria-hidden className="flex items-end gap-1">
      {BARS.map((i) => (
        <span
          key={i}
          style={{ animationDelay: `${i * 0.14}s` }}
          className="w-1 animate-wave rounded-pill bg-white/90"
        />
      ))}
    </span>
  );

  if (layout === "stacked") {
    return (
      <span className="flex flex-col items-center gap-2">
        {/* 웨이브만 있는 행. 알약을 씌우지 않아 막대가 그대로 보인다 */}
        <span className="flex h-6 items-end">{wave}</span>
        <p className="w-fit rounded-pill bg-text/45 px-4 py-1.5 text-parent-body font-bold text-white backdrop-blur-sm">
          {label}
        </p>
      </span>
    );
  }

  return (
    <p className="flex w-fit items-center gap-2.5 rounded-pill bg-text/45 px-4 py-2 text-parent-body font-bold text-white backdrop-blur-sm">
      {wave}
      {label}
    </p>
  );
}
