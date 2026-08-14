/**
 * StoryCard — docs/spec/screens.md §1-6
 * 사용처: B-1 추천, B-2 목록, F-1 완료 이야기
 *
 * 표지 이미지는 아직 미수령이다. imageUrl이 없으면 규격에 맞는 플레이스홀더를 그린다.
 * (docs/spec/assets.md §3-1) 규격을 맞춰 두면 파일 도착 시 교체만 하면 된다.
 */

import Link from "next/link";

type Props = {
  storyId: string;
  title: string;
  imageUrl?: string | null;
  estimatedMinutes?: number | null;
  topics?: readonly string[];
  /** B-2 상태 배지 — 해당 아이의 세션 상태 */
  sessionStatus?: "in_progress" | "post_activity" | "completed" | "stopped" | null;
};

const BADGE: Record<string, { label: string; className: string }> = {
  in_progress: { label: "진행 중", className: "bg-primary-soft text-text" },
  post_activity: { label: "진행 중", className: "bg-primary-soft text-text" },
  completed: { label: "완료", className: "bg-secondary text-white" },
  stopped: { label: "중단", className: "bg-border text-muted" },
};

export function StoryCard({
  storyId,
  title,
  imageUrl,
  estimatedMinutes,
  topics = [],
  sessionStatus,
}: Props) {
  const badge = sessionStatus ? BADGE[sessionStatus] : undefined;

  // 1. 최대 표시할 개수 설정 및 태그 분할
  const MAX_TAGS = 2;
  const visibleTopics = topics.slice(0, MAX_TAGS);
  const extraCount = topics.length - MAX_TAGS;

  return (
    <Link
      href={`/stories/${storyId}`}
      className="group flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-soft transition-transform hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-primary-soft">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 외부 이미지 도메인 미확정
          <img
            src={imageUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center px-4 text-center text-parent-body font-bold text-muted">
            표지 준비 중
          </div>
        )}

        {badge ? (
          <span
            className={`absolute top-3 left-3 rounded-pill px-3 py-1 text-sm font-bold ${badge.className}`}
          >
            {badge.label}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-parent-title font-bold text-text">{title}</h3>

        {estimatedMinutes ? (
          <p className="text-parent-body text-muted">약 {estimatedMinutes}분</p>
        ) : null}

        {/* 2. 태그 렌더링 영역 수정 */}
        {topics.length > 0 ? (
          <ul className="mt-auto flex flex-wrap items-center gap-2 pt-2">
            {visibleTopics.map((topic) => (
              <li
                key={topic}
                className="rounded-pill bg-accent-soft px-3 py-1 text-sm font-bold text-text"
              >
                {topic}
              </li>
            ))}

            {/* 3. 남은 태그가 있을 때 +n 배지 표시 */}
            {extraCount > 0 ? (
              <li className="rounded-pill bg-border/50 px-2.5 py-1 text-sm font-bold text-muted">
                +{extraCount}
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </Link>
  );
}