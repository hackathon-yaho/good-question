/**
 * "최근 활동" 상대 표기 — docs/spec/screens.md A-5
 *
 * 명세가 규칙을 못 박아 두었다. 임의로 바꾸지 않는다.
 *   오늘 → "오늘 활동", 1일 → "어제 활동", 2~6일 → "N일 전 활동",
 *   7일 이상 → "지난주 활동", 활동 없음 → "아직 시작 전"
 *
 * 경과 시간이 아니라 **날짜 차이**로 센다. 어제 23시와 오늘 1시는 2시간 차이지만
 * "어제 활동"이 맞다.
 */

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function relativeActivity(
  lastActivityAt: string | null | undefined,
  now: Date = new Date()
): string {
  if (!lastActivityAt) return "아직 시작 전";

  const then = new Date(lastActivityAt);
  if (Number.isNaN(then.getTime())) return "아직 시작 전";

  const days = Math.round((startOfDay(now) - startOfDay(then)) / DAY_MS);

  if (days <= 0) return "오늘 활동";
  if (days === 1) return "어제 활동";
  if (days < 7) return `${days}일 전 활동`;
  return "지난주 활동";
}
