/**
 * B-1 홈 — docs/spec/screens.md §B
 *
 * 셸: SidebarShell. 하단 탭바가 아니라 좌측 사이드바다. (체크리스트)
 * 좌 58% 이어하기 히어로 / 우 42% 추천.
 *
 * ── 명세와 다르게 한 것 두 가지 ──────────────────────────────────────
 * 1. "별가루 N" 칩을 넣지 않았다. 포인트 시스템은 DB에도 요건에도 없다.
 *    (screens.md §7-2 #11, open-questions Q-12) 화면에만 있는 숫자는 거짓말이 된다.
 * 2. 진행 중 세션이 없을 때의 "오늘의 이야기" 카드에 **바로 시작하는 CTA**를 달았다.
 *    명세대로 B-3으로만 보내면 B-3이 없는 지금은 막다른 길이다. B-3(8단계)이
 *    생기면 이 CTA를 B-3 이동으로 바꾼다.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SidebarShell } from "@/components/shells/SidebarShell";
import { ChildAvatar } from "@/components/ui/ChildAvatar";
import { PillButton } from "@/components/ui/PillButton";
import { StoryCard } from "@/components/ui/StoryCard";
import { useToast } from "@/components/ui/Toast";
import { accountApi } from "@/lib/api";
import { playApi as defaultPlayApi } from "@/lib/api";
import type { AccountApi, HomeSnapshot, PlayApi } from "@/lib/api/types";
import { useSelectedChildId } from "@/lib/client-store";

export function HomeScreen({
  api = accountApi,
  playApi = defaultPlayApi,
}: {
  api?: AccountApi;
  playApi?: PlayApi;
}) {
  const router = useRouter();
  const toast = useToast();

  const childId = useSelectedChildId();
  const [home, setHome] = useState<HomeSnapshot | null>(null);
  const [starting, setStarting] = useState(false);

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

  const startStory = useCallback(
    async (storyId: string) => {
      if (!childId || starting) return;
      setStarting(true);
      try {
        const session = await playApi.createSession({ childId, storyId });
        router.push(`/play/${session.sessionId}`);
      } catch {
        toast.show("이야기를 시작하지 못했어요. 다시 시도해 주세요.", "danger");
        setStarting(false);
      }
    },
    [childId, playApi, router, starting, toast]
  );

  if (!home) {
    return (
      <SidebarShell>
        <p className="text-parent-body text-muted">불러오고 있어요…</p>
      </SidebarShell>
    );
  }

  const { child, inProgress, recommended } = home;
  const todayStory = recommended[0];

  return (
    <SidebarShell
      header={
        <Link
          href="/profiles"
          className="flex min-h-touch items-center gap-3 rounded-pill px-3 hover:bg-primary-soft"
        >
          <ChildAvatar name={child.name} avatarId={child.avatarId} size={44} />
          <span className="text-parent-body font-bold text-text">
            {child.name}
          </span>
        </Link>
      }
    >
      <h1 className="text-parent-title font-bold text-text">
        {child.name}, 오늘도 이야기해 볼까?
      </h1>

      <div className="mt-6 flex flex-col gap-6 xl:flex-row">
        {/* 좌 58% */}
        <section className="min-w-0 xl:w-[58%]">
          {inProgress ? (
            <article className="flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-soft">
              <div className="flex aspect-[16/9] w-full items-center justify-center bg-primary-soft text-parent-body font-bold text-muted">
                {/* 표지 미수령 — 규격 폴백 (assets.md §3-1) */}
                표지 준비 중
              </div>

              <div className="flex flex-col gap-4 p-6">
                <p className="text-parent-body font-bold text-primary">
                  이어서 하기
                </p>
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
                  className="flex gap-1.5"
                >
                  {Array.from(
                    { length: inProgress.sceneProgress.total },
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
                </div>

                <PillButton
                  size="kid"
                  className="mt-2"
                  fullWidth
                  onClick={() => router.push(`/play/${inProgress.sessionId}`)}
                >
                  이어서 이야기하기
                </PillButton>
              </div>
            </article>
          ) : todayStory ? (
            // 진행 중 세션이 없어도 빈 영역을 남기지 않는다. (B-1 상태 표)
            <article className="flex flex-col overflow-hidden rounded-card border border-border bg-surface shadow-soft">
              <div className="flex aspect-[16/9] w-full items-center justify-center bg-accent-soft text-parent-body font-bold text-muted">
                표지 준비 중
              </div>

              <div className="flex flex-col gap-4 p-6">
                <p className="text-parent-body font-bold text-accent">
                  오늘의 이야기
                </p>
                <h2 className="text-parent-title font-bold text-text">
                  {todayStory.title}
                </h2>
                {todayStory.estimatedMinutes ? (
                  <p className="text-parent-body text-muted">
                    약 {todayStory.estimatedMinutes}분
                  </p>
                ) : null}

                <PillButton
                  size="kid"
                  className="mt-2"
                  fullWidth
                  disabled={starting}
                  onClick={() => void startStory(todayStory.id)}
                >
                  {starting ? "준비하고 있어요…" : "이야기 시작하기"}
                </PillButton>
              </div>
            </article>
          ) : null}
        </section>

        {/* 우 42% */}
        <section className="min-w-0 xl:w-[42%]">
          <h2 className="text-parent-body font-bold text-text">
            이런 이야기도 있어요
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {recommended.map((story) => (
              <li key={story.id}>
                <StoryCard
                  storyId={story.id}
                  title={story.title}
                  imageUrl={story.coverImageUrl}
                  estimatedMinutes={story.estimatedMinutes}
                  topics={story.topics}
                />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </SidebarShell>
  );
}
