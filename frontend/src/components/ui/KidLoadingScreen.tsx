/**
 * KidLoadingScreen — 백엔드 데이터를 기다리는 모든 화면의 로딩 상태
 *
 * 예전에는 빈 화면에 "불러오고 있어요…" 한 줄만 좌상단에 작게 떴다(셸의 `main`이
 * flex-1일 뿐 내부를 가운데 정렬하지 않아서다). 이 컴포넌트가 그 자리를 대신한다 —
 * 화면 중앙에 별가루(StarDustIcon) 3개가 순서대로 튀어 오른다. 별가루는 이미
 * 완료 화면·보상 칩에 쓰는 아이콘이라 "이 앱의 반짝임"으로 이미 익숙하다.
 *
 * ── 보호자 화면(CenteredShell)에도 쓴다 (팀 결정, 2026-08-16) ──────────
 * 처음에는 보호자 쪽엔 차분한 텍스트만 남기기로 했었지만, 화면마다 로딩 처리가
 * 제각각(텍스트만/점 3개 애니메이션/아예 없음)이던 것을 통일하기로 하면서
 * 이야기 진행 화면(C·D, `play`/`activity`)만 빼고 전부 이 컴포넌트로 맞췄다.
 * 이야기 진행 중에는 장면 전환마다 짧게 스치듯 나타나 오히려 산만해지므로
 * 그 두 화면만 원래의 화면별 로딩 문구를 그대로 둔다.
 */

import { StarDustIcon } from "@/components/ui/StarDust";

const STARS = [
  { color: "text-primary", delay: 0 },
  { color: "text-accent", delay: 0.15 },
  { color: "text-secondary", delay: 0.3 },
] as const;

export function KidLoadingScreen({
  label = "불러오고 있어요",
  className = "",
}: {
  label?: string;
  /** 배치용 여백·높이 추가 클래스. 셸 전체를 채울 땐 "h-full", 헤더 아래 끼워 넣을 땐 "mt-8" 등 */
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={`flex min-h-[12rem] flex-col items-center justify-center gap-4 ${className}`}
    >
      <div aria-hidden className="flex gap-3">
        {STARS.map(({ color, delay }, i) => (
          <span
            key={i}
            style={{ animationDelay: `${delay}s` }}
            className={`animate-kid-loading-bounce ${color}`}
          >
            <StarDustIcon size={30} />
          </span>
        ))}
      </div>
      <p className="text-kid-body font-bold text-muted">{label}</p>
    </div>
  );
}
