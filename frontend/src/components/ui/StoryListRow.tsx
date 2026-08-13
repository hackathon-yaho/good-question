/**
 * StoryListRow — 좁은 폭에서 쓰는 이야기 한 행
 * 사용처: B-1 홈의 **이어하기가 있을 때** 우측 추천 열 (계획 D3)
 *
 * ── `StoryCard`를 고치지 않고 따로 만든 이유 ────────────────────────
 * `StoryCard`는 B-2 목록과 F-1 마이페이지가 함께 쓴다. 거기는 본문 전체를 쓰므로
 * 표지를 크게 보여주는 게 아이에게 유리하다. 이 행은 **우측 42%(1133px에서 331px)**
 * 전용이고, 같은 자리에 카드를 넣으면 표지만 248px을 먹어 한 장밖에 안 들어간다.
 *
 * 즉 카드 형식을 대체하는 게 아니라 **좁은 폭에서만 쓰는 대안**이다.
 *
 * ── 규격 ────────────────────────────────────────────────────────────
 *   썸네일 88×66 (4:3) — 표지 규격 비율을 지킨다. 도착하면 파일만 교체된다
 *   행 높이 96px       — 터치 최소 44px(§1-4)의 두 배 이상
 *   제목 1줄           — 넘치면 잘린다. 두 줄이 되면 행 높이가 흔들린다
 *   주제 칩 최대 2개    — 331px에서 3개는 넘친다
 */

import Link from "next/link";

type Props = {
  storyId: string;
  title: string;
  imageUrl?: string | null;
  estimatedMinutes?: number | null;
  topics?: readonly string[];
  className?: string;
};

/** 331px에 들어가는 칩 수. 서버가 더 줘도 여기서 자른다. */
const MAX_TOPICS = 2;

export function StoryListRow({
  storyId,
  title,
  imageUrl,
  estimatedMinutes,
  topics = [],
  className = "",
}: Props) {
  return (
    <Link
      href={`/stories/${storyId}`}
      className={[
        /* items-center 유지: 세로 중앙 정렬 */
        "flex h-full w-full items-center gap-3.5 rounded-card border border-border bg-surface p-3.5 shadow-soft transition-transform hover:-translate-y-0.5",
        className,
      ].join(" ")}
    >
      {/* 🟢 h-full과 aspect-[4/3]을 지정해 늘어난 카드 높이에 맞춰 표지 영역이 자연스럽게 커집니다 */}
      <span className="flex aspect-[4/3] h-full shrink-0 items-center justify-center overflow-hidden rounded-bubble bg-primary-soft">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 이미지 도메인 미확정
          <img src={imageUrl} alt="" className="size-full object-cover" />
        ) : (
          /* 표지 미수령 (assets.md §3-1) */
          <span className="text-xs font-bold text-muted">표지</span>
        )}
      </span>

      {/* 🟢 gap-1.5로 요소를 살짝 넓히고 세로 중앙에 균형 있게 위치시킵니다 */}
      <span className="flex min-w-0 flex-col justify-center gap-1.5">
        <span className="truncate text-parent-body font-bold text-text">
          {title}
        </span>

        {estimatedMinutes ? (
          <span className="text-sm text-muted">
            <span aria-hidden>⏱ </span>약 {estimatedMinutes}분
          </span>
        ) : null}

        {topics.length > 0 ? (
          <span className="flex gap-1.5">
            {topics.slice(0, MAX_TOPICS).map((topic) => (
              <span
                key={topic}
                className="rounded-pill bg-accent-soft px-2.5 py-0.5 text-xs font-bold text-text"
              >
                {topic}
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </Link>
  );
}