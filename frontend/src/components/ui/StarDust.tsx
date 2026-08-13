/**
 * 별가루 — 팀이 추가한 보상 표시 (백엔드 B-20 · open-questions Q-12)
 *
 * ⚠️ **값이 없으면 아무것도 그리지 않는다.**
 * 백엔드가 이야기 완료 시 `children.star_dust`를 올리지만 **어떤 응답 DTO에도
 * 노출되지 않는다**(2026-08-13 확인). 그래서 실서버에서는 값이 오지 않는다.
 * "별가루 0"을 보여주면 아이가 모은 것이 사라진 것처럼 읽히므로 숨기는 쪽을 택했다.
 * 백엔드가 필드를 추가하면 코드 변경 없이 나타난다.
 *
 * 아이콘은 파일이 아니라 인라인 SVG다. `currentColor`를 쓰므로 활성/비활성 색을
 * CSS로 제어할 수 있고, 완료 화면의 낙하 효과에도 같은 모양을 재사용한다.
 */

import { rem } from "@/lib/rem";

export function StarDustIcon({
  size = 20,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      style={{ width: rem(size), height: rem(size) }}
      className={className}
      fill="currentColor"
    >
      {/* 오각별 + 가운데 반짝임. 각진 별보다 부드럽게 보이도록 꼭짓점을 둥글게 굴린다 */}
      <path
        d="M12 2.6l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.1l6.1-.9z"
        strokeLinejoin="round"
        strokeWidth={1.4}
        stroke="currentColor"
      />
    </svg>
  );
}

/**
 * 홈 · 마이페이지 프로필의 별가루 칩.
 *
 * @param amount 서버가 준 누적 별가루. `undefined`면 렌더하지 않는다
 */
export function StarDustChip({
  amount,
  size = 20,
}: {
  amount?: number | null;
  size?: number;
}) {
  if (typeof amount !== "number") return null;

  return (
    <span className="flex shrink-0 items-center gap-2 rounded-pill bg-accent-soft px-4 py-2 text-parent-body font-bold text-text">
      <StarDustIcon size={size} className="text-accent" />
      별가루 {amount.toLocaleString("ko-KR")}
    </span>
  );
}
