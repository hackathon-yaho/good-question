/**
 * G-1 리포트 목록 — docs/spec/screens.md §G
 *
 * 추이 문구는 **실제로 늘었을 때만** 보여준다. 데이터가 한 주뿐인데
 * "늘고 있어요"라고 쓰면 거짓말이 된다.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CenteredShell } from "@/components/shells/CenteredShell";
import { FilterChipRow } from "@/components/ui/FilterChipRow";
import { mockParentApi } from "@/lib/api/mock-parent";
import type { ParentApi, ReportListResult } from "@/lib/api/types";
import { setSelectedChildId, useSelectedChildId } from "@/lib/client-store";
import type { SessionStatus } from "@/lib/play-state";

const STATUS_CHIP: Record<SessionStatus, { label: string; className: string }> = {
  completed: { label: "완료", className: "bg-secondary text-white" },
  stopped: { label: "중단", className: "bg-border text-muted" },
  in_progress: { label: "진행 중", className: "bg-primary-soft text-text" },
  post_activity: { label: "진행 중", className: "bg-primary-soft text-text" },
};

export function ReportListScreen({ api = mockParentApi }: { api?: ParentApi }) {
  const router = useRouter();
  const childId = useSelectedChildId();
  const [data, setData] = useState<ReportListResult | null>(null);

  useEffect(() => {
    if (childId === null) router.replace("/profiles");
  }, [childId, router]);

  useEffect(() => {
    if (!childId) return;
    let alive = true;
    api
      .listReports(childId)
      .then((result) => {
        if (alive) setData(result);
      })
      .catch(() => {
        if (alive) router.replace("/profiles");
      });
    return () => {
      alive = false;
    };
  }, [api, childId, router]);

  if (!data) {
    return (
      <CenteredShell width="wide">
        <p className="text-parent-body text-muted">불러오고 있어요…</p>
      </CenteredShell>
    );
  }

  const max = Math.max(1, ...data.weeklyTrend.map((w) => w.utteranceCount));

  return (
    <CenteredShell width="wide">
      <Link href="/parent" className="text-parent-body text-muted underline">
        ← 보호자 홈
      </Link>
      <h1 className="mt-4 text-parent-title font-bold text-text">리포트</h1>

      {data.children.length > 1 ? (
        <div className="mt-4">
          <FilterChipRow
            options={data.children.map((c) => ({ value: c.id, label: c.name }))}
            value={childId ?? ""}
            includeAll={false}
            onChange={(next) => {
              // 아이를 바꾸면 이후 모든 화면의 기준이 바뀐다. (A-5)
              setSelectedChildId(next);
              router.refresh();
            }}
          />
        </div>
      ) : null}

      <section className="mt-6 rounded-card border border-border bg-surface p-6 shadow-soft">
        <h2 className="text-parent-body font-bold text-text">최근 4주</h2>

        {/* 라인차트 대신 막대로 그린다. 4개 점을 잇는 선은 값이 없을 때 오해를 만든다. */}
        <ul className="mt-4 flex items-end gap-4" aria-label="주별 말하기 횟수">
          {data.weeklyTrend.map((week) => (
            <li key={week.weekLabel} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-sm font-bold text-muted">
                {week.utteranceCount}
              </span>
              <span
                aria-hidden
                style={{ height: `${Math.max(6, (week.utteranceCount / max) * 96)}px` }}
                className="w-full rounded-pill bg-primary-soft"
              />
              <span className="text-sm text-muted">{week.weekLabel}</span>
            </li>
          ))}
        </ul>

        <p className="mt-4 text-parent-body text-text">
          {data.trendMessage ?? "아직 기록이 모이는 중이에요."}
        </p>
      </section>

      {data.reports.length === 0 ? (
        <p className="mt-8 text-parent-body text-muted">
          아직 리포트가 없어요. 아이가 이야기를 한 편 진행하면 만들어져요.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {data.reports.map((report) => {
            const chip = STATUS_CHIP[report.status];
            return (
              <li key={report.sessionId}>
                <Link
                  href={`/parent/reports/${report.sessionId}?tab=analysis`}
                  className="flex min-h-touch items-center gap-4 rounded-card border border-border bg-surface p-4 shadow-soft transition-transform hover:-translate-y-0.5"
                >
                  <span
                    aria-hidden
                    className="flex size-16 shrink-0 items-center justify-center rounded-bubble bg-primary-soft text-sm font-bold text-muted"
                  >
                    표지
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-parent-body font-bold text-text">
                      {report.storyTitle}
                    </span>
                    <span className="block text-sm text-muted">{report.date}</span>
                  </span>
                  <span
                    className={`shrink-0 rounded-pill px-3 py-1 text-sm font-bold ${chip.className}`}
                  >
                    {chip.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </CenteredShell>
  );
}
