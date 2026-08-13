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
};

/** 331px에 들어가는 칩 수. 서버가 더 줘도 여기서 자른다. */
const MAX_TOPICS = 2;

export function StoryListRow({
  storyId,
  title,
  imageUrl,
  estimatedMinutes,
  topics = [],
}: Props) {
  return (
    <Link
      href={`/stories/${storyId}`}
      className="flex items-center gap-3.5 rounded-card border border-border bg-surface p-3.5 shadow-soft transition-transform hover:-translate-y-0.5"
    >
      {/* 88 × 66px = 4:3. rem으로 두어 글자 크기 배율(설정 H-2)을 따라 커진다 */}
      <span className="flex h-[4.125rem] w-[5.5rem] shrink-0 items-center justify-center overflow-hidden rounded-bubble bg-primary-soft">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- 이미지 도메인 미확정
          <img src={imageUrl} alt="" className="size-full object-cover" />
        ) : (
          /* 표지 미수령 (assets.md §3-1). 규격 자리를 지켜 행 높이가 흔들리지 않게 한다 */
          <span className="text-xs font-bold text-muted">표지</span>
        )}
      </span>

      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-parent-body font-bold text-text">
          {title}
        </span>

        {estimatedMinutes ? (
          <span className="text-sm text-muted">
            <span aria-hidden>⏱ </span>약 {estimatedMinutes}분
          </span>
        ) : null}

        {topics.length > 0 ? (
          <span className="mt-1 flex gap-1.5">
            {topics.slice(0, MAX_TOPICS).map((topic) => (
              <span
                key={topic}
                className="rounded-pill bg-accent-soft px-2.5 py-0.5 text-sm font-bold text-text"
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
