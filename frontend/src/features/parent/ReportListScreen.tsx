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
import { BackButton } from "@/components/ui/BackButton";
import { FilterChipRow } from "@/components/ui/FilterChipRow";
import { parentApi } from "@/lib/api";
import type { ParentApi, ReportListResult } from "@/lib/api/types";
import { setSelectedChildId, useSelectedChildId } from "@/lib/client-store";
import type { SessionStatus } from "@/lib/play-state";

const STATUS_CHIP: Record<SessionStatus, { label: string; className: string }> = {
  completed: { label: "완료", className: "bg-secondary text-white" },
  stopped: { label: "중단", className: "bg-border text-muted" },
  in_progress: { label: "진행 중", className: "bg-primary-soft text-text" },
  post_activity: { label: "진행 중", className: "bg-primary-soft text-text" },
};

export function ReportListScreen({ api = parentApi }: { api?: ParentApi }) {
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
      <BackButton href="/parent" label="보호자 홈" />
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
            /**
             * 리포트는 **완료된 세션에만 존재한다.** 목록의 필터 기준은 "완료 여부"가
             * 아니라 "아이 발화가 1건이라도 있는지"라서 진행 중·중단된 세션도 함께
             * 온다. 그 행을 누르면 상세가 404다.
             * (backend/docs/api-spec.md 10.2 · 10.3)
             *
             * 그래서 열 수 있는 행만 링크로 만든다. 링크로 두고 404 화면을 보여주는
             * 것보다, 애초에 눌리지 않고 이유를 적어 두는 편이 낫다.
             */
            const openable = report.status === "completed";
            const body = (
              <>
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
                  <span className="block text-sm text-muted">
                    {report.date}
                    {openable ? null : " · 이야기를 마치면 리포트가 만들어져요"}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-pill px-3 py-1 text-sm font-bold ${chip.className}`}
                >
                  {chip.label}
                </span>
              </>
            );
            const shared =
              "flex min-h-touch items-center gap-4 rounded-card border border-border p-4";

            return (
              <li key={report.sessionId}>
                {openable ? (
                  <Link
                    href={`/parent/reports/${report.sessionId}?tab=analysis`}
                    className={`${shared} bg-surface shadow-soft transition-transform hover:-translate-y-0.5`}
                  >
                    {body}
                  </Link>
                ) : (
                  <div className={`${shared} bg-bg`} aria-disabled="true">
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </CenteredShell>
  );
}
