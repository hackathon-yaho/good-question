/**
 * B-2 이야기 목록 — docs/spec/screens.md §B
 *
 * 필터 칩을 누르면 목록만 갱신한다. 페이지 이동이 없다.
 * MVP는 이야기 1편뿐이라 카드 1장만 나온다. 그리드가 깨지지 않는지가 체크리스트다.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SidebarShell } from "@/components/shells/SidebarShell";
import { FilterChipRow } from "@/components/ui/FilterChipRow";
import { StoryCard } from "@/components/ui/StoryCard";
import { contentApi } from "@/lib/api";
import type { ContentApi, StoryListResult } from "@/lib/api/types";
import { useSelectedChildId } from "@/lib/client-store";

/** FilterChipRow는 "전체"를 빈 문자열로 다룬다. */
const ALL = "";

export function StoryListScreen({ api = contentApi }: { api?: ContentApi }) {
  const router = useRouter();
  const childId = useSelectedChildId();

  const [topic, setTopic] = useState(ALL);
  const [data, setData] = useState<StoryListResult | null>(null);

  useEffect(() => {
    if (childId === null) router.replace("/profiles");
  }, [childId, router]);

  useEffect(() => {
    if (!childId) return;
    let alive = true;
    api
      .listStories(childId, topic || undefined)
      .then((result) => {
        if (alive) setData(result);
      })
      .catch(() => {
        if (alive) setData({ stories: [], availableTopics: [] });
      });
    return () => {
      alive = false;
    };
  }, [api, childId, topic]);

  const onSelect = useCallback((next: string) => setTopic(next), []);

  return (
    <SidebarShell>
      <h1 className="text-parent-title font-bold text-text">이야기</h1>

      <div className="mt-5">
        <FilterChipRow
          options={(data?.availableTopics ?? []).map((t) => ({
            value: t,
            label: t,
          }))}
          value={topic}
          onChange={onSelect}
        />
      </div>

      {data === null ? (
        <p className="mt-8 text-parent-body text-muted">불러오고 있어요…</p>
      ) : data.stories.length === 0 ? (
        <p className="mt-8 text-parent-body text-muted">
          이 주제의 이야기는 아직 없어요.
        </p>
      ) : (
        // 카드가 1장이어도 3열 그리드에서 늘어나지 않게 한다. (체크리스트)
        //
        // ⚠️ 3열 분기는 `lg:`(1024px)다. `xl:`(1280px)로 두면 지원 태블릿
        //    1133·1180px이 미달해 2열로 떨어진다. 사이드바 240px과 여백 80px을 빼도
        //    1133px에서 카드 1장이 255px이라 3열이 들어간다.
        <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.stories.map((story) => (
            <li key={story.id}>
              <StoryCard
                storyId={story.id}
                title={story.title}
                imageUrl={story.coverImageUrl}
                estimatedMinutes={story.estimatedMinutes}
                topics={story.topics}
                sessionStatus={story.sessionStatus}
              />
            </li>
          ))}
        </ul>
      )}
    </SidebarShell>
  );
}
