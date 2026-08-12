/**
 * H-1 설정 + H-7 회원 탈퇴 확인 모달 — docs/spec/screens.md §H
 *
 * 탈퇴는 "탈퇴합니다"를 정확히 입력해야만 버튼이 열린다. 되돌릴 수 없는 동작이라
 * 실수로 눌리는 경로를 막는 것이 목적이다.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CenteredShell } from "@/components/shells/CenteredShell";
import { Modal } from "@/components/ui/Modal";
import { PillButton } from "@/components/ui/PillButton";
import { parentApi } from "@/lib/api";
import type { ParentAccount, ParentApi } from "@/lib/api/types";
import { authApi } from "@/lib/api/auth";
import { clearClientStore } from "@/lib/client-store";

const PROVIDER_LABEL: Record<string, string> = { kakao: "카카오" };

const TERMS = [
  {
    title: "서비스 이용약관",
    body: "약관 전문을 아직 받지 못했습니다. 정식 문안이 도착하면 이 자리에 그대로 들어갑니다.",
  },
  {
    title: "개인정보 처리방침",
    body: "약관 전문을 아직 받지 못했습니다. 정식 문안이 도착하면 이 자리에 그대로 들어갑니다.",
  },
] as const;

const WITHDRAW_PHRASE = "탈퇴합니다";

export function SettingsScreen({ api = parentApi }: { api?: ParentApi }) {
  const router = useRouter();
  const [parent, setParent] = useState<ParentAccount | null>(null);
  const [notify, setNotify] = useState(true);
  const [openTerm, setOpenTerm] = useState<number | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .getParent()
      .then((result) => {
        if (alive) setParent(result);
      })
      .catch(() => {
        if (alive) setParent(null);
      });
    return () => {
      alive = false;
    };
  }, [api]);

  // 쿠키를 지우는 것은 서버만 할 수 있다(HttpOnly). 반드시 호출해야 한다.
  // 실패해도 화면은 로그인으로 보낸다. 여기서 아이를 붙잡아 둘 이유가 없다.
  const logout = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await authApi.logout();
    } catch {
      // 무시 — 쿠키가 남아도 다음 요청에서 401로 정리된다
    }
    clearClientStore();
    router.replace("/login");
  }, [busy, router]);

  const withdraw = useCallback(async () => {
    if (phrase !== WITHDRAW_PHRASE || busy) return;
    setBusy(true);
    try {
      await api.withdraw();
      await authApi.logout().catch(() => {});
      clearClientStore();
      router.replace("/login");
    } catch {
      setBusy(false);
    }
  }, [api, busy, phrase, router]);

  return (
    <CenteredShell width="column">
      <Link href="/parent" className="text-parent-body text-muted underline">
        ← 보호자 홈
      </Link>
      <h1 className="mt-4 text-parent-title font-bold text-text">설정</h1>

      <Group title="계정">
        <Row label="이메일" value={parent?.email ?? "—"} />
        <Row
          label="연결된 로그인"
          value={parent ? (PROVIDER_LABEL[parent.provider] ?? parent.provider) : "—"}
        />
        <LinkRow label="아이 프로필 관리" href="/parent/settings/children" />
      </Group>

      <Group title="이용">
        <LinkRow label="공지사항" href="/parent/notices" />
        <LinkRow label="고객센터" href="/parent/support" />
        <LinkRow label="이용 안내" href="/parent/guide" />
        <div className="flex min-h-touch items-center justify-between gap-4 border-b border-border px-1 py-3 last:border-b-0">
          <span className="text-parent-body text-text">알림 받기</span>
          <button
            type="button"
            role="switch"
            aria-checked={notify}
            aria-label="알림 받기"
            onClick={() => setNotify((prev) => !prev)}
            className={[
              "flex h-8 w-14 shrink-0 items-center rounded-pill px-1 transition-colors",
              notify ? "justify-end bg-primary" : "justify-start bg-border",
            ].join(" ")}
          >
            <span aria-hidden className="size-6 rounded-full bg-white" />
          </button>
        </div>
      </Group>

      <Group title="약관">
        {TERMS.map((term, index) => (
          <button
            key={term.title}
            type="button"
            onClick={() => setOpenTerm(index)}
            className="flex min-h-touch w-full items-center justify-between gap-4 border-b border-border px-1 py-3 text-left last:border-b-0"
          >
            <span className="text-parent-body text-text">{term.title}</span>
            <span aria-hidden className="text-muted">
              ›
            </span>
          </button>
        ))}
        <div className="flex min-h-touch items-center justify-between gap-4 px-1 py-3">
          <span className="text-parent-body text-text">
            아동 개인정보 처리 동의
          </span>
          <span className="rounded-pill bg-secondary-soft px-3 py-1 text-sm font-bold text-text">
            동의함
          </span>
        </div>
      </Group>

      <div className="mt-8 flex flex-col gap-3">
        <PillButton variant="outlined" fullWidth onClick={() => void logout()}>
          로그아웃
        </PillButton>
        <button
          type="button"
          onClick={() => {
            setPhrase("");
            setWithdrawOpen(true);
          }}
          className="min-h-touch text-parent-body font-bold text-danger underline"
        >
          회원 탈퇴
        </button>
      </div>

      <Modal
        open={openTerm !== null}
        label={openTerm !== null ? TERMS[openTerm].title : undefined}
        onClose={() => setOpenTerm(null)}
      >
        {openTerm !== null ? (
          <>
            <h2 className="text-parent-title font-bold text-text">
              {TERMS[openTerm].title}
            </h2>
            <p className="mt-4 text-parent-body leading-relaxed text-text">
              {TERMS[openTerm].body}
            </p>
            <PillButton
              className="mt-8"
              variant="outlined"
              fullWidth
              onClick={() => setOpenTerm(null)}
            >
              닫기
            </PillButton>
          </>
        ) : null}
      </Modal>

      {/* H-7 회원 탈퇴 확인 */}
      <Modal
        open={withdrawOpen}
        width={480}
        dismissible={false}
        label="회원 탈퇴 확인"
      >
        <div className="flex flex-col gap-4">
          <span
            aria-hidden
            className="flex size-14 items-center justify-center rounded-full bg-danger/10 text-2xl"
          >
            ⚠️
          </span>
          <h2 className="text-parent-title font-bold text-text">
            정말 탈퇴하시겠어요?
          </h2>
          <p className="text-parent-body leading-relaxed text-text">
            아이 프로필과 활동 기록이 모두 삭제돼요.
            <br />
            리포트와 단어장도 함께 사라져요.
            <br />
            삭제한 뒤에는 되돌릴 수 없어요.
          </p>

          <label
            htmlFor="withdraw-phrase"
            className="text-parent-body font-bold text-text"
          >
            확인을 위해 “{WITHDRAW_PHRASE}”를 입력해 주세요
          </label>
          <input
            id="withdraw-phrase"
            value={phrase}
            onChange={(event) => setPhrase(event.target.value)}
            className="min-h-touch w-full rounded-bubble border-2 border-border bg-surface px-5 text-parent-body text-text outline-none focus:border-danger"
          />

          <PillButton
            variant="danger"
            fullWidth
            disabled={phrase !== WITHDRAW_PHRASE || busy}
            onClick={() => void withdraw()}
          >
            정말 탈퇴할게요
          </PillButton>
          <PillButton
            variant="outlined"
            fullWidth
            disabled={busy}
            onClick={() => setWithdrawOpen(false)}
          >
            취소
          </PillButton>
        </div>
      </Modal>
    </CenteredShell>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="text-parent-body font-bold text-muted">{title}</h2>
      <div className="mt-2 rounded-card border border-border bg-surface px-5 py-2">
        {children}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-touch items-center justify-between gap-4 border-b border-border px-1 py-3 last:border-b-0">
      <span className="text-parent-body text-text">{label}</span>
      <span className="truncate text-parent-body text-muted">{value}</span>
    </div>
  );
}

function LinkRow({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-touch items-center justify-between gap-4 border-b border-border px-1 py-3 last:border-b-0"
    >
      <span className="text-parent-body text-text">{label}</span>
      <span aria-hidden className="text-muted">
        ›
      </span>
    </Link>
  );
}
