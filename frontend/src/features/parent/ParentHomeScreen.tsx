/**
 * A-6 보호자 홈 — docs/spec/screens.md §A
 *
 * 타일 4개는 **모두** 각자의 페이지로 연결되어야 한다. 초기 설계에서 3개가 빠져
 * 있었다는 것이 체크리스트에 적혀 있다.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CenteredShell } from "@/components/shells/CenteredShell";
import { ChildAvatar } from "@/components/ui/ChildAvatar";
import { PillButton } from "@/components/ui/PillButton";
import { parentApi } from "@/lib/api";
import type { ParentApi, ParentSummary } from "@/lib/api/types";
import { useSelectedChildId } from "@/lib/client-store";

const TILES = [
  { href: "/parent/reports", label: "리포트 보기", icon: "📊" },
  { href: "/parent/settings/children", label: "아이 프로필 관리", icon: "👧" },
  { href: "/parent/guide", label: "이용 안내", icon: "📖" },
  { href: "/parent/settings", label: "설정", icon: "⚙️" },
] as const;

export function ParentHomeScreen({ api = parentApi }: { api?: ParentApi }) {
  const router = useRouter();
  const childId = useSelectedChildId();
  const [summary, setSummary] = useState<ParentSummary | null>(null);

  useEffect(() => {
    if (childId === null) router.replace("/profiles");
  }, [childId, router]);

  useEffect(() => {
    if (!childId) return;
    let alive = true;
    api
      .getSummary(childId)
      .then((result) => {
        if (alive) setSummary(result);
      })
      .catch(() => {
        if (alive) router.replace("/profiles");
      });
    return () => {
      alive = false;
    };
  }, [api, childId, router]);

  if (!summary) {
    return (
      <CenteredShell width="wide">
        <p className="text-parent-body text-muted">불러오고 있어요…</p>
      </CenteredShell>
    );
  }

  const { child, hasRecords } = summary;

  return (
    <CenteredShell width="wide">
      <header className="flex items-center gap-4">
        <ChildAvatar name={child.name} avatarId={child.avatarId} size={56} />
        <div>
          <h1 className="text-parent-title font-bold text-text">
            {child.name} 보호자님
          </h1>
          <p className="text-parent-body text-muted">{child.age}세</p>
        </div>
        <PillButton
          className="ml-auto"
          variant="outlined"
          onClick={() => router.push("/profiles")}
        >
          다른 아이 보기
        </PillButton>
      </header>

      <section className="mt-6 rounded-card border border-border bg-surface p-6 shadow-soft">
        {/* 첫 사용이면 0을 늘어놓지 않는다. (A-6 체크리스트) */}
        {hasRecords ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <li className="text-center">
              <p className="text-parent-body text-muted">이번 주</p>
              <p className="mt-1 text-parent-title font-bold text-text">
                {summary.thisWeekCount}회
              </p>
            </li>
            <li className="text-center">
              <p className="text-parent-body text-muted">완료한 이야기</p>
              <p className="mt-1 text-parent-title font-bold text-text">
                {summary.completedStories}편
              </p>
            </li>
            <li className="text-center">
              <p className="text-parent-body text-muted">평균 말하기</p>
              <p className="mt-1 text-parent-title font-bold text-text">
                {summary.avgChildSentences}문장
              </p>
            </li>
          </ul>
        ) : (
          <p className="text-center text-parent-body text-muted">
            아직 기록이 없어요. 아이와 이야기를 한 편 마치면 여기에 담겨요.
          </p>
        )}
      </section>

      <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {TILES.map((tile) => (
          <li key={tile.href}>
            <Link
              href={tile.href}
              className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-card border border-border bg-surface p-5 text-center shadow-soft transition-transform hover:-translate-y-0.5"
            >
              <span aria-hidden className="text-3xl">
                {tile.icon}
              </span>
              <span className="text-parent-body font-bold text-text">
                {tile.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </CenteredShell>
  );
}
