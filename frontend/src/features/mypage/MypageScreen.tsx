/**
 * F-1 아이 마이페이지 — docs/spec/screens.md §F
 *
 * ── 명세와 다르게 한 것 ─────────────────────────────────────────────
 * 1. "별가루 칩"을 넣지 않았다. B-1과 같은 이유다. (Q-12)
 * 2. "내 이야기 들어보기"의 재생 버튼은 **TTS로 텍스트를 읽어 준다.**
 *    아이 목소리를 저장하지 않기 때문이다. 그래서 라벨도 "내 목소리로"가 아니라
 *    "다시 들어보기"다. (Q-07, PRD 10.3)
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SidebarShell } from "@/components/shells/SidebarShell";
import { ChildAvatar } from "@/components/ui/ChildAvatar";
import { StarDustChip } from "@/components/ui/StarDust";
import { PillButton } from "@/components/ui/PillButton";
import { contentApi } from "@/lib/api";
import type { ContentApi, MypageSnapshot } from "@/lib/api/types";
import { useSelectedChildId } from "@/lib/client-store";
import { useCharacterVoice } from "@/lib/speech";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function MypageScreen({ api = contentApi }: { api?: ContentApi }) {
  const router = useRouter();
  const childId = useSelectedChildId();
  const { speak, cancel, speaking } = useCharacterVoice();

  const [data, setData] = useState<MypageSnapshot | null>(null);

  useEffect(() => {
    if (childId === null) router.replace("/profiles");
  }, [childId, router]);

  useEffect(() => {
    if (!childId) return;
    let alive = true;
    api
      .getMypage(childId)
      .then((snapshot) => {
        if (alive) setData(snapshot);
      })
      .catch(() => {
        if (alive) router.replace("/profiles");
      });
    return () => {
      alive = false;
    };
  }, [api, childId, router]);

  // 화면을 벗어날 때 읽던 것을 멈춘다.
  useEffect(() => cancel, [cancel]);

  if (!data) {
    return (
      <SidebarShell>
        <p className="text-parent-body text-muted">불러오고 있어요…</p>
      </SidebarShell>
    );
  }

  const { child, stats, completedStories, retellings } = data;

  const STATS = [
    { label: "완료한 이야기", value: `${stats.completedStories}편` },
    { label: "모은 단어", value: `${stats.savedWords}개` },
    { label: "함께한 날", value: `${stats.activeDays}일` },
  ];

  return (
    <SidebarShell>
      <section className="flex items-center gap-5 rounded-card border border-border bg-surface p-6 shadow-soft">
        <ChildAvatar name={child.name} avatarId={child.avatarId} size={120} />
        <div className="min-w-0 flex-1">
          <h1 className="text-parent-title font-bold text-text">{child.name}</h1>
          <p className="mt-1 text-parent-body text-muted">{child.age}세</p>
        </div>
        {/* 별가루 — 서버가 값을 줄 때만 보인다 */}
        <StarDustChip amount={child.starDust} size={24} />
      </section>

      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STATS.map((stat) => (
          <li
            key={stat.label}
            className="rounded-card border border-border bg-surface p-5 text-center"
          >
            <p className="text-parent-body text-muted">{stat.label}</p>
            <p className="mt-1 text-parent-title font-bold text-text">
              {stat.value}
            </p>
          </li>
        ))}
      </ul>

      <section className="mt-8">
        <h2 className="text-parent-body font-bold text-text">내가 끝낸 이야기</h2>
        {completedStories.length === 0 ? (
          <p className="mt-3 text-parent-body text-muted">
            아직 끝낸 이야기가 없어요. 오늘 하나 끝내 볼까요?
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-4">
            {completedStories.map((story) => (
              <li
                key={story.sessionId}
                className="flex w-64 flex-col gap-3 rounded-card border border-border bg-surface p-4"
              >
                <div className="flex aspect-[4/3] items-center justify-center rounded-bubble bg-primary-soft text-parent-body font-bold text-muted">
                  표지 준비 중
                </div>
                <p className="text-parent-body font-bold text-text">
                  {story.title}
                </p>
                <p className="text-sm text-muted">
                  {formatDate(story.completedAt)} 완료
                </p>
                <PillButton
                  variant="outlined"
                  onClick={() => router.push(`/stories/${story.storyId}`)}
                >
                  다시 듣기
                </PillButton>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-parent-body font-bold text-text">
          내 이야기 들어보기
        </h2>
        {/* 아이 목소리를 저장하지 않으므로 읽어 주는 것이다. 라벨을 정확히 쓴다. */}
        <p className="mt-1 text-sm text-muted">
          내가 다시 말한 이야기를 글로 남겨 두고 읽어 줘요. 목소리는 저장하지 않아요.
        </p>

        {retellings.length === 0 ? (
          <p className="mt-3 text-parent-body text-muted">
            이야기를 끝까지 하면 여기에 담겨요.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {retellings.map((item) => (
              <li
                key={item.sessionId}
                className="flex items-start gap-4 rounded-card border border-border bg-surface p-5"
              >
                <button
                  type="button"
                  aria-label={`${item.storyTitle} 다시 들어보기`}
                  disabled={speaking}
                  onClick={() => speak({ text: item.text })}
                  className="flex size-touch shrink-0 items-center justify-center rounded-full bg-primary-soft text-xl disabled:opacity-50"
                >
                  🔊
                </button>
                <div className="min-w-0">
                  <p className="text-parent-body font-bold text-text">
                    {item.storyTitle}
                  </p>
                  <p className="mt-1 text-parent-body leading-relaxed text-muted">
                    {item.text}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {formatDate(item.createdAt)} · {item.text.length}자
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </SidebarShell>
  );
}
