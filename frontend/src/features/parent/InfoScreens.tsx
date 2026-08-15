/**
 * H-3 공지사항 · H-4 고객센터 · H-5 이용 안내 — docs/spec/screens.md §H
 *
 * H-3은 목록만 설계되어 있고 본문을 볼 화면이 없다. 명세가 권한 대로 **아코디언**으로
 * 펼친다. 상세 라우트를 새로 만들면 목록·상세 두 곳을 관리해야 한다.
 *
 * H-4 "1:1 문의하기"의 연결 대상은 미정이다. 눌렀을 때 아무 일도 안 일어나는 버튼을
 * 두는 대신, 대상이 정해질 때까지 안내 문구로 대체했다.
 */

"use client";

import { useCallback, useEffect, useState } from "react";

import { CenteredShell } from "@/components/shells/CenteredShell";
import { BackButton } from "@/components/ui/BackButton";
import { PillButton } from "@/components/ui/PillButton";
import { parentApi } from "@/lib/api";
import type { NoticeItem, ParentApi } from "@/lib/api/types";

const BACK = <BackButton label="뒤로 가기" />;

/* ── H-3 공지사항 ──────────────────────────────────────────────────── */

const CATEGORY_CLASS: Record<NoticeItem["category"], string> = {
  안내: "bg-primary-soft text-text",
  업데이트: "bg-secondary-soft text-text",
};

export function NoticesScreen({ api = parentApi }: { api?: ParentApi }) {
  const [notices, setNotices] = useState<NoticeItem[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [read, setRead] = useState<readonly string[]>([]);

  useEffect(() => {
    let alive = true;
    api
      .listNotices()
      .then((result) => {
        if (alive) setNotices(result);
      })
      .catch(() => {
        if (alive) setNotices([]);
      });
    return () => {
      alive = false;
    };
  }, [api]);

  const toggle = useCallback((id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
    setRead((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  return (
    <CenteredShell width="column">
      {BACK}
      <h1 className="mt-4 text-parent-title font-bold text-text">공지사항</h1>

      {notices === null ? (
        <p className="mt-6 text-parent-body text-muted">불러오고 있어요…</p>
      ) : notices.length === 0 ? (
        // 실서버 모드에서는 공지 엔드포인트가 없어 빈 배열이 온다.
        // 빈 <ul>을 그리면 테두리만 남은 상자가 보인다. (client-parent.ts)
        <p className="mt-6 text-parent-body text-muted">
          아직 공지가 없어요. 새 소식이 생기면 여기에 올려 드려요.
        </p>
      ) : (
        <ul className="mt-6 rounded-card border border-border bg-surface px-5">
          {notices.map((notice) => {
            const open = openId === notice.id;
            const unread = notice.unread && !read.includes(notice.id);
            return (
              <li key={notice.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => toggle(notice.id)}
                  className="flex min-h-touch w-full items-center gap-3 py-4 text-left"
                >
                  <span
                    className={`shrink-0 rounded-pill px-3 py-1 text-sm font-bold ${CATEGORY_CLASS[notice.category]}`}
                  >
                    {notice.category}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-parent-body text-text">
                    {notice.title}
                  </span>
                  {unread ? (
                    <span
                      aria-label="읽지 않음"
                      className="size-2 shrink-0 rounded-full bg-danger"
                    />
                  ) : null}
                  <span className="shrink-0 text-sm text-muted">{notice.date}</span>
                </button>

                {open ? (
                  <p className="pb-5 text-parent-body leading-relaxed text-muted">
                    {notice.body}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </CenteredShell>
  );
}

/* ── H-4 고객센터 ──────────────────────────────────────────────────── */

const FAQ = [
  {
    q: "마이크가 작동하지 않아요",
    a: "주소창 왼쪽의 자물쇠 아이콘을 눌러 '마이크'를 '허용'으로 바꿔 주세요. 바꾼 뒤 화면의 '권한 다시 확인하기'를 누르면 이어서 진행할 수 있어요.",
  },
  {
    q: "아이 목소리를 잘 인식하지 못해요",
    a: "조용한 곳에서 마이크에 가까이 대고 또박또박 말하면 인식이 좋아져요. 인식이 잘 안 되면 '다시 말하기'를 눌러 한 번 더 시도할 수 있어요.",
  },
  {
    q: "이야기를 이어서 할 수 있나요?",
    a: "네. 홈 화면의 '이어서 이야기하기'를 누르면 마지막으로 이야기한 장면부터 이어집니다.",
  },
  {
    q: "아이를 몇 명까지 등록할 수 있나요?",
    a: "한 계정에 최대 3명까지 등록할 수 있어요. 설정 > 아이 프로필 관리에서 추가하거나 지울 수 있습니다.",
  },
  {
    q: "구독은 어떻게 하나요?",
    a: "베타 기간에는 무료로 이용할 수 있어요. 유료 요금제는 아직 준비 중입니다.",
  },
] as const;

export function SupportScreen() {
  const [open, setOpen] = useState(0);

  return (
    <CenteredShell width="column">
      {BACK}
      <h1 className="mt-4 text-parent-title font-bold text-text">고객센터</h1>

      <section className="mt-6 flex items-center gap-4 rounded-card bg-accent-soft p-6">
        <span aria-hidden className="text-4xl">
          🙋
        </span>
        <p className="text-parent-body leading-relaxed text-text">
          궁금한 점이 있으면 아래에서 찾아보세요. 자주 묻는 질문을 모아 두었어요.
        </p>
      </section>

      <ul className="mt-6 rounded-card border border-border bg-surface px-5">
        {FAQ.map((item, index) => (
          <li key={item.q} className="border-b border-border last:border-b-0">
            <button
              type="button"
              aria-expanded={open === index}
              onClick={() => setOpen((prev) => (prev === index ? -1 : index))}
              className="flex min-h-touch w-full items-center justify-between gap-4 py-4 text-left"
            >
              <span className="text-parent-body text-text">{item.q}</span>
              <span aria-hidden className="shrink-0 text-muted">
                {open === index ? "−" : "+"}
              </span>
            </button>
            {open === index ? (
              <p className="pb-5 text-parent-body leading-relaxed text-muted">
                {item.a}
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      {/* 연결 대상 미정. 눌러도 아무 일 없는 버튼보다 안내가 정직하다. */}
      <p className="mt-6 rounded-bubble bg-bg px-5 py-4 text-parent-body text-muted">
        1:1 문의 창구는 준비 중이에요. 급한 문의는 서비스 담당자에게 직접 전해 주세요.
      </p>
    </CenteredShell>
  );
}

/* ── H-5 이용 안내 ─────────────────────────────────────────────────── */

const GUIDE_CARDS = [
  {
    title: "어떤 서비스인가요?",
    body: "아이가 이야기 속 친구와 목소리로 대화하며 자기 생각을 말해보는 서비스예요.",
    icon: "💬",
  },
  {
    title: "무엇을 누르면 되나요?",
    body: "화면 테두리가 주황색으로 반짝일 때 마이크를 누르고 말한 뒤 '보내기'를 누르면 돼요.",
    icon: "🎤",
  },
  {
    title: "마이크가 안 될 때는요?",
    body: "주소창 왼쪽 자물쇠 아이콘에서 '마이크'를 '허용'으로 바꿔 주세요.",
    icon: "🔧",
  },
] as const;

export function UsageGuideScreen() {
  return (
    <CenteredShell width="full">
      {BACK}
      <h1 className="mt-4 text-parent-title font-bold text-text">이용 안내</h1>

      <ul className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {GUIDE_CARDS.map((card, index) => (
          <li
            key={card.title}
            className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface p-6 text-center"
          >
            <span aria-hidden className="text-5xl">
              {card.icon}
            </span>
            <span className="rounded-pill bg-primary px-3 py-1 text-sm font-bold text-white">
              {index + 1}
            </span>
            <h2 className="text-parent-body font-bold text-text">{card.title}</h2>
            <p className="text-parent-body leading-relaxed text-muted">
              {card.body}
            </p>
          </li>
        ))}
      </ul>

    </CenteredShell>
  );
}
