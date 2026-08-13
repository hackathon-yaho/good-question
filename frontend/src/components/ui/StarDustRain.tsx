/**
 * 별가루 낙하 — 이야기 완료 화면(D-7)
 *
 * 이미지 파일 없이 인라인 SVG 별을 여러 개 띄우고 CSS로 떨어뜨린다. (계획 D8)
 * 파일이면 오히려 어렵다 — 색을 CSS로 못 바꾸고, 개수만큼 요청이 늘어난다.
 *
 * 위치·크기·속도는 **고정 배열**이다. `Math.random()`을 쓰면 서버 렌더와 클라이언트
 * 렌더가 달라져 하이드레이션이 어긋난다.
 *
 * `prefers-reduced-motion`에서는 애니메이션이 멈춘다(globals.css). 별은 그대로
 * 보이므로 화면이 비지 않는다.
 */

import { StarDustIcon } from "@/components/ui/StarDust";

/** [좌측 %, 지름 px, 지속 s, 지연 s] */
const FLAKES: readonly [number, number, number, number][] = [
  [6, 18, 7.5, 0],
  [14, 12, 9, 1.4],
  [23, 22, 6.5, 0.6],
  [31, 14, 8.5, 2.2],
  [39, 16, 7, 3.1],
  [47, 24, 9.5, 0.3],
  [55, 13, 8, 1.9],
  [63, 19, 6.8, 2.7],
  [71, 15, 9.2, 0.9],
  [79, 21, 7.3, 3.6],
  [86, 12, 8.8, 1.1],
  [93, 17, 6.6, 2.4],
];

export function StarDustRain() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {FLAKES.map(([left, size, duration, delay], i) => (
        <span
          key={i}
          style={{
            left: `${left}%`,
            animationDuration: `${duration}s`,
            animationDelay: `${delay}s`,
          }}
          className="animate-stardust absolute top-0 text-accent"
        >
          <StarDustIcon size={size} />
        </span>
      ))}
    </div>
  );
}
