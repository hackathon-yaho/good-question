/**
 * G-2 / G-3 / G-4 — docs/spec/screens.md §G
 *
 * 한 페이지의 탭 쿼리(`?tab=analysis|quotes|guide`)로 나뉜다.
 *
 * ── 절대 만들지 않는 것 ─────────────────────────────────────────────
 * 점수·등급·백분위. [리포트 가이드 8절](../../../docs/reference/guardian-report-guide.md)이
 * 금지했고 인터뷰 원칙도 "점수보다 아이가 실제로 어떤 말을 했는지"다.
 *
 * ── 4점 dot을 넣지 않았다 ───────────────────────────────────────────
 * 화면 명세 G-2에는 역량별 4점 dot이 있지만 산출 기준이 어디에도 없다(§7-2 #14).
 * 기준 없이 칠하면 없는 측정을 만드는 것이다. 대신 가이드 4절의 5단 구성
 * (역량명 → 특징 → 근거 발화 → 잘한 점 → 보완할 부분)을 그대로 그린다.
 *
 * ── 대표 발화는 1개다 ───────────────────────────────────────────────
 * 명세 G-3은 3개 카드지만 가이드 5절은 1개 + 선정 이유 한 문장이다. (Q-08)
 * 명세 G 도입부가 "구현 시 기준은 보호자 리포트 가이드를 따릅니다"라고 했으므로
 * 가이드를 따랐다.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { CenteredShell } from "@/components/shells/CenteredShell";
import { PillButton } from "@/components/ui/PillButton";
import { useToast } from "@/components/ui/Toast";
import { mockParentApi } from "@/lib/api/mock-parent";
import type { ParentApi, ReportDetail } from "@/lib/api/types";

const TABS = [
  { id: "analysis", label: "말하기 역량" },
  { id: "quotes", label: "대표 발화" },
  { id: "guide", label: "가정 가이드" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ReportDetailScreen({
  sessionId,
  api = mockParentApi,
}: {
  sessionId: string;
  api?: ParentApi;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  const raw = params.get("tab");
  const tab: TabId = TABS.some((t) => t.id === raw) ? (raw as TabId) : "analysis";

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .getReport(sessionId)
      .then((detail) => {
        if (alive) setReport(detail);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [api, sessionId]);

  if (failed) {
    return (
      <CenteredShell width="wide">
        <p className="text-parent-body text-muted">
          리포트를 불러오지 못했어요.
        </p>
      </CenteredShell>
    );
  }

  if (!report) {
    return (
      <CenteredShell width="wide">
        <p className="text-parent-body text-muted">불러오고 있어요…</p>
      </CenteredShell>
    );
  }

  return (
    <CenteredShell width="wide">
      <Link
        href="/parent/reports"
        className="text-parent-body text-muted underline"
      >
        ← 리포트 목록
      </Link>

      <h1 className="mt-4 text-parent-title font-bold text-text">
        {report.storyTitle}
      </h1>
      <p className="text-parent-body text-muted">{report.date}</p>

      <div role="tablist" className="mt-5 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={item.id === tab}
            onClick={() =>
              router.replace(`/parent/reports/${sessionId}?tab=${item.id}`)
            }
            className={[
              "min-h-touch rounded-pill px-5 text-parent-body font-bold transition-colors",
              item.id === tab
                ? "bg-primary text-white"
                : "border border-border bg-surface text-muted hover:bg-primary-soft hover:text-text",
            ].join(" ")}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "analysis" ? <Analysis report={report} /> : null}
      {tab === "quotes" ? <Quotes report={report} /> : null}
      {tab === "guide" ? (
        <Guide
          report={report}
          onShare={() => toast.show("리포트 공유는 준비 중이에요")}
        />
      ) : null}
    </CenteredShell>
  );
}

/** G-2 말하기 역량 분석 */
function Analysis({ report }: { report: ReportDetail }) {
  const max = Math.max(1, ...report.elementCounts.map((e) => e.count));

  return (
    <>
      <p className="mt-6 rounded-card bg-accent-soft p-5 text-parent-body leading-relaxed text-text">
        {report.summary}
      </p>

      <section className="mt-6 rounded-card border border-border bg-surface p-6">
        <h2 className="text-parent-body font-bold text-text">어휘</h2>
        {report.vocabulary.mainWords.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {report.vocabulary.mainWords.map((word) => (
              <li
                key={word}
                className="rounded-pill bg-primary-soft px-3 py-1 text-sm font-bold text-text"
              >
                {word}
              </li>
            ))}
          </ul>
        ) : null}
        {report.vocabulary.repeated.length > 0 ? (
          <p className="mt-3 text-parent-body text-muted">
            자주 쓴 말: {report.vocabulary.repeated.join(", ")}
          </p>
        ) : null}
        <p className="mt-3 text-parent-body leading-relaxed text-text">
          {report.vocabulary.feedback}
        </p>
      </section>

      {/* 가이드 4절의 5단 구성 순서를 그대로 따른다. */}
      <ul className="mt-6 flex flex-col gap-4">
        {report.competencies.map((card) => (
          <li
            key={card.name}
            className="rounded-card border border-border bg-surface p-6"
          >
            <h3 className="text-parent-body font-bold text-text">{card.name}</h3>
            <p className="mt-2 text-parent-body leading-relaxed text-text">
              {card.feature}
            </p>

            {card.evidence ? (
              <blockquote className="mt-3 flex gap-3 rounded-bubble bg-bg p-4">
                <span aria-hidden className="w-1 shrink-0 rounded-pill bg-info" />
                <p className="text-parent-body leading-relaxed text-muted">
                  “{card.evidence}”
                </p>
              </blockquote>
            ) : null}

            <dl className="mt-3 flex flex-col gap-2">
              <div>
                <dt className="text-sm font-bold text-secondary">잘한 점</dt>
                <dd className="text-parent-body leading-relaxed text-text">
                  {card.strength}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-bold text-muted">
                  이렇게 더 해볼 수 있어요
                </dt>
                <dd className="text-parent-body leading-relaxed text-text">
                  {card.next}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      <section className="mt-6 rounded-card border border-border bg-surface p-6">
        <h2 className="text-parent-body font-bold text-text">
          어떤 이야기를 많이 했나요
        </h2>
        <ul className="mt-4 flex flex-col gap-3">
          {report.elementCounts.map((item) => (
            <li key={item.label} className="flex items-center gap-3">
              <span className="w-12 shrink-0 text-parent-body text-muted">
                {item.label}
              </span>
              <span
                aria-hidden
                style={{ width: `${(item.count / max) * 100}%` }}
                className="h-4 min-w-1 rounded-pill bg-primary"
              />
              <span className="text-sm font-bold text-muted">{item.count}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">
          많고 적음이 잘함과 못함을 뜻하지 않아요. 이번 이야기에서 어떤 이야기를
          주로 했는지 보여주는 값이에요.
        </p>
      </section>
    </>
  );
}

/** G-3 대표 발화 — 1개 + 선정 이유 (가이드 5절) */
function Quotes({ report }: { report: ReportDetail }) {
  if (!report.representative) {
    return (
      <p className="mt-6 text-parent-body text-muted">
        아직 대표 발화를 고를 만큼 이야기가 모이지 않았어요.
      </p>
    );
  }

  return (
    <section className="mt-6 rounded-card border border-border bg-surface p-6">
      <div className="flex gap-4">
        <span aria-hidden className="w-1 shrink-0 rounded-pill bg-secondary" />
        <div>
          <span className="rounded-pill bg-secondary-soft px-3 py-1 text-sm font-bold text-text">
            {report.representative.sceneLabel}
          </span>
          <p className="mt-3 text-[1.1875rem] leading-relaxed font-bold text-text">
            “{report.representative.text}”
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-bubble bg-bg p-4">
        <p className="text-sm font-bold text-muted">이 발화를 고른 이유</p>
        <p className="mt-1 text-parent-body leading-relaxed text-text">
          {report.representative.reason}
        </p>
      </div>
    </section>
  );
}

/** G-4 가정 학습 가이드 — 가이드 6·7절 */
function Guide({
  report,
  onShare,
}: {
  report: ReportDetail;
  onShare: () => void;
}) {
  return (
    <>
      <p className="mt-6 rounded-card bg-accent-soft p-5 text-parent-body leading-relaxed text-text">
        {report.guide.intro}
      </p>

      <section className="mt-6">
        <h2 className="text-parent-body font-bold text-text">
          이렇게 물어보세요 — 이야기 이어가기
        </h2>
        <ul className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {report.guide.storyQuestions.map((question) => (
            <li
              key={question}
              className="rounded-card border border-border bg-surface p-5 text-parent-body leading-relaxed text-text"
            >
              {question}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-parent-body font-bold text-text">
          함께 해보세요 — 일상으로 연결하기
        </h2>
        <ul className="mt-3 flex flex-col gap-3">
          {report.guide.dailyQuestions.map((question) => (
            <li
              key={question}
              className="rounded-card bg-secondary-soft p-5 text-parent-body leading-relaxed text-text"
            >
              {question}
            </li>
          ))}
        </ul>
      </section>

      <PillButton className="mt-6" variant="outlined" onClick={onShare}>
        리포트 공유하기
      </PillButton>
    </>
  );
}
