/**
 * B-1 홈 — docs/spec/screens.md §B
 *
 * 셸: SidebarShell. 하단 탭바가 아니라 좌측 사이드바다. (체크리스트)
 *
 * ── 배치 ────────────────────────────────────────────────────────────
 *   [프로필 바 — 아바타 · 이름 ······················· 별가루]   전체 1줄
 *
 *   이어하기 있음:  이어하기 히어로(58%) | 오늘의 추천 이야기(42%)
 *   이어하기 없음:  오늘의 추천 이야기만 (최대 3열 그리드)
 *
 * 프로필을 우상단이 아니라 **상단 1줄 전체**에 둔다. 아이가 자기 자리를 먼저 알아보고
 * 그 아래에서 이야기를 고르는 순서다.
 *
 * ── 이어하기가 없을 때 ──────────────────────────────────────────────
 * 예전에는 "오늘의 이야기" 큰 카드에 **바로 시작 CTA**를 달았다. B-3(이야기 상세)이
 * 없어서 명세대로 B-3으로만 보내면 막다른 길이었기 때문이다. **B-3이 생겼으므로
 * 그 CTA를 없애고** 추천 카드 → B-3 → 시작하기의 정상 경로만 남긴다.
 * 카드를 거치면 아이가 도입·상황·등장인물을 보고 고를 수 있다.
 *
 * ── 별가루 ──────────────────────────────────────────────────────────
 * 서버가 값을 줄 때만 칩을 그린다. 백엔드가 `starDust`를 실어 주므로(D-33)
 * 실서버에서도 뜬다. 필드가 없는 응답에서는 칩을 그리지 않는다. (계획 D4)
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SidebarShell } from "@/components/shells/SidebarShell";
import { KidLoadingScreen } from "@/components/ui/KidLoadingScreen";
import { ChildAvatar } from "@/components/ui/ChildAvatar";
import { PillButton } from "@/components/ui/PillButton";
import { StarDustChip } from "@/components/ui/StarDust";
import { StoryCard } from "@/components/ui/StoryCard";
import { StoryListRow } from "@/components/ui/StoryListRow";
import { accountApi } from "@/lib/api";
import type { AccountApi, HomeSnapshot, HomeStory } from "@/lib/api/types";
import { useSelectedChildId } from "@/lib/client-store";
import { TOTAL_SCREEN_SCENES } from "@/mocks/story-banggui";
import { getStoryCoverImage } from "@/lib/story-images";

const RECOMMEND_TITLE = "오늘의 추천 이야기";

/**
 * 개발 중에만 동작하는 화면 전환 — `/home?home=fresh` · `/home?recommend=3`
 *
 * `?api=`(`lib/api/http.ts`) · `?speech=`(`lib/speech/mode.ts`)와 같은 장치다.
 * 새 방식을 만들지 않는다.
 *
 * 이어하기가 없는 화면을 보려면 `/login`의 데모 초기화로 계정·아이·세션을 전부 지우고
 * 온보딩을 다시 해야 했다. 확인 한 번에 로그인부터 다시 하는 셈이었다.
 *
 * ⚠️ **서버 데이터를 조작하지 않는다.** 받아온 스냅샷을 **그리는 단계**에서만 가린다.
 *    세션은 살아 있고 파라미터를 떼면 원래대로 돌아온다.
 * ⚠️ 프로덕션 빌드에서는 `NODE_ENV` 비교가 상수로 접혀 이 함수 전체가 사라진다.
 */
function devHomeOverride(): { hideInProgress: boolean; recommendCount: number | null } {
  const off = { hideInProgress: false, recommendCount: null };
  if (process.env.NODE_ENV !== "development") return off;
  if (typeof window === "undefined") return off;

  const params = new URLSearchParams(window.location.search);
  const count = Number(params.get("recommend"));
  return {
    hideInProgress: params.get("home") === "fresh",
    recommendCount: Number.isInteger(count) && count > 0 ? count : null,
  };
}

/**
 * 개발 전환이 켜졌음을 화면에 알린다. 점선으로 그려 실제 UI와 구별한다.
 *
 * ⚠️ `?home=fresh`에는 칩을 **띄우지 않는다** (2026-08-13 지시). 주소에 이미
 *    `home=fresh`가 보이고, 빈 상태 레이아웃을 확인하려는 화면에 안내 칩이 끼면
 *    그 레이아웃을 그대로 보지 못한다.
 *
 * `?recommend=`는 남긴다 — 그쪽은 **없는 이야기를 늘려 보여주는** 것이라
 * 실제 데이터로 오인하면 안 된다. 성격이 다르다.
 */
function DevOverrideNotice({
  recommendCount,
}: {
  recommendCount: number | null;
}) {
  if (recommendCount === null) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <span className="rounded-pill border border-dashed border-muted px-3.5 py-1.5 text-sm font-bold text-muted">
        추천 {recommendCount}개 · 레이아웃 확인 전용
      </span>
    </div>
  );
}

export function HomeScreen({ api = accountApi }: { api?: AccountApi }) {
  const router = useRouter();

  const childId = useSelectedChildId();
  const [home, setHome] = useState<HomeSnapshot | null>(null);

  // 라우트 가드 — 아이가 선택되지 않았으면 /profiles로. (§2 라우트 가드)
  // undefined는 "아직 모른다"이므로 그때는 판단하지 않는다.
  useEffect(() => {
    if (childId === null) router.replace("/profiles");
  }, [childId, router]);

  useEffect(() => {
    if (!childId) return;
    let alive = true;
    api
      .getHome(childId)
      .then((snapshot) => {
        if (alive) setHome(snapshot);
      })
      .catch(() => {
        // 선택한 아이가 사라진 경우(다른 브라우저에서 삭제 등)도 여기로 온다.
        if (alive) router.replace("/profiles");
      });
    return () => {
      alive = false;
    };
  }, [api, childId, router]);

  if (!home) {
    return (
      <SidebarShell>
        <KidLoadingScreen className="h-full" />
      </SidebarShell>
    );
  }

  const { child } = home;

  // 개발 전환은 **그리는 단계에서만** 반영한다. 스냅샷은 그대로 둔다.
  const dev = devHomeOverride();
  const inProgress = dev.hideInProgress ? null : home.inProgress;
  const recommended =
    dev.recommendCount === null || home.recommended.length === 0
      ? home.recommended
      : // 서버가 준 편을 순환해 개수만 맞춘다. 없는 이야기를 지어내지 않으므로
        // 눌러도 막다른 길이 아니다. id가 겹치니 렌더링 key는 index를 섞어 쓴다.
        Array.from(
          { length: dev.recommendCount },
          (_, i) => home.recommended[i % home.recommended.length]
        );

  // 조건과 src에서 같은 함수를 두 번 부르지 않도록 한 번만 구한다.
  const inProgressCover = inProgress
    ? getStoryCoverImage(
        inProgress.storyId,
        inProgress.storyTitle,
        inProgress.coverImageUrl
      )
    : null;

  return (
    <SidebarShell>
      {/* 프로필 — 상단 1줄 전체. 아바타·이름은 좌측, 별가루는 우측 끝 */}
      <div className="flex items-center gap-4 rounded-card border border-border bg-surface px-6 py-4 shadow-soft">
        <Link
          href="/mypage"
          aria-label={`${child.name} — 마이페이지`}
          className="flex min-h-touch min-w-0 flex-1 items-center gap-4 rounded-pill"
        >
          <ChildAvatar name={child.name} avatarId={child.avatarId} size={56} />
          <h1 className="truncate text-parent-title font-bold text-text">
            {child.name}
          </h1>
        </Link>

        <StarDustChip amount={child.starDust} />
      </div>

      <DevOverrideNotice recommendCount={dev.recommendCount} />

      {inProgress ? (
        /**
         * 2열 분기는 `lg:`(1024px)다. `xl:`(1280px)로 두면 지원 태블릿 1133·1180px이
         * 미달해 세로로 쌓인다.
         *
         * flex + `w-[58%]`/`w-[42%]`가 아니라 **grid**를 쓴다. flex는 gap 24px을
         * 계산에 넣지 못해 합이 100% + 24px이 되고, `min-w-0`으로 눌려 티가 안 날 뿐이다.
         * grid는 gap을 먼저 빼고 58:42로 나눈다.
         */
        <div className="mt-6 grid gap-6 lg:grid-cols-[58fr_42fr]">
          {/* 좌 58% — 이어하기 */}
          <section className="min-w-0">
            <article className="flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-soft">
              <div className="relative flex aspect-[16/9] w-full items-center justify-center bg-primary-soft">
                {inProgressCover ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 이미지 도메인 미확정
                  <img
                    src={inProgressCover}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  /* 표지 미수령 — 규격 폴백 (assets.md §3-1) */
                  <span className="text-parent-body font-bold text-muted">
                    표지 준비 중
                  </span>
                )}
                <span className="absolute top-4 left-4 rounded-pill bg-primary px-4 py-1.5 text-parent-body font-bold text-white">
                  이어서 하기
                </span>
              </div>

              <div className="flex flex-col gap-4 p-6">
                <h2 className="text-parent-title font-bold text-text">
                  {inProgress.storyTitle}
                </h2>
                <p className="text-parent-body text-muted">
                  장면 {inProgress.sceneProgress.current}까지 이야기했어요
                </p>

                <div
                  role="progressbar"
                  aria-valuenow={inProgress.sceneProgress.current}
                  aria-valuemin={0}
                  aria-valuemax={inProgress.sceneProgress.total}
                  className="flex flex-col gap-1.5"
                >
                  <span className="flex gap-1.5">
                    {Array.from(
                      {
                        length:
                          inProgress.sceneProgress.total || TOTAL_SCREEN_SCENES,
                      },
                      (_, index) => (
                        <span
                          key={index}
                          className={[
                            "h-2 flex-1 rounded-pill",
                            index < inProgress.sceneProgress.current
                              ? "bg-primary"
                              : "bg-border",
                          ].join(" ")}
                        />
                      )
                    )}
                  </span>
                  <span className="flex justify-between text-sm text-muted">
                    <span>시작</span>
                    <span>끝</span>
                  </span>
                </div>

                <PillButton
                  size="kid"
                  className="mt-2"
                  fullWidth
                  onClick={() => router.push(`/play/${inProgress.sessionId}`)}
                >
                  이어서 이야기하기 →
                </PillButton>
              </div>
            </article>
          </section>

          {/* 우 42% — 추천 이야기 (전체 높이를 남김없이 균등 배분) */}
          <section className="flex h-full min-w-0 flex-col gap-2.5">
            <h2 className="shrink-0 flex items-center gap-2 text-parent-body font-bold text-text">
              <span aria-hidden>✨</span> {RECOMMEND_TITLE}
            </h2>

            {/* 행들은 내용물 크기에 맞춰 쌓인다. flex-1로 늘어나면 카드가 위아래로 여백이 생긴다 */}
            <ul className="flex flex-1 flex-col gap-2.5">
              {recommended.map((story, index) => (
                <li key={`${story.id}-${index}`} className="flex">
                  <StoryListRow
                    storyId={story.id}
                    title={story.title}
                    imageUrl={getStoryCoverImage(story.id, story.title, story.coverImageUrl)}
                    estimatedMinutes={story.estimatedMinutes}
                    topics={story.topics}
                  />
                </li>
              ))}
            </ul>
            
            <div className="shrink-0 pt-1">
              <MoreLink />
            </div>
          </section>
        </div>
      ) : (
        /* 이어하기가 없으면 추천만 보여준다. 본문 전체를 쓰므로 **카드 3열**이다 —
           자리가 넉넉하면 표지를 크게 보는 게 아이에게 유리하다.
           [이야기] 페이지와 같은 카드이고 필터만 없다. */
        <section className="mt-6 flex flex-col gap-4">
          <h2 className="flex items-center gap-2 text-parent-title font-bold text-text">
            <span aria-hidden>✨</span> {RECOMMEND_TITLE}
          </h2>

          {recommended.length === 0 ? (
            <p className="text-parent-body text-muted">
              아직 준비된 이야기가 없어요. 조금만 기다려 줄래?
            </p>
          ) : (
            <>
              <RecommendGrid
                stories={recommended}
                columns="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              />
              <MoreLink />
            </>
          )}
        </section>
      )}
    </SidebarShell>
  );
}

/** 서버가 준 개수를 그대로 그린다. 빈 자리를 가짜 카드로 채우지 않는다. (계획 D5) */
function RecommendGrid({
  stories,
  columns,
}: {
  stories: readonly HomeStory[];
  columns: string;
}) {
  return (
    <ul className={`grid gap-4 ${columns}`}>
      {stories.map((story, index) => (
        <li key={`${story.id}-${index}`}>
          <StoryCard
            storyId={story.id}
            title={story.title}
            imageUrl={getStoryCoverImage(story.id, story.title, story.coverImageUrl)}
            estimatedMinutes={story.estimatedMinutes}
            topics={story.topics}
          />
        </li>
      ))}
    </ul>
  );
}

function MoreLink() {
  return (
    <Link
      href="/stories"
      className="flex min-h-touch items-center justify-center gap-2 rounded-card border border-dashed border-border text-parent-body font-bold text-muted transition-colors hover:bg-primary-soft hover:text-text"
    >
      <span aria-hidden>🧭</span> 더 많은 이야기 탐험하기
    </Link>
  );
}
