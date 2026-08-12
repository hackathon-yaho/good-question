/**
 * A-5 아이 프로필 선택 — docs/spec/screens.md §A
 *
 * 여기서 고른 childId가 **B·C·D·E·F 전 화면의 기준**이 된다.
 * 그래서 값을 localStorage에 남긴다. 새로고침 후에도 유지되어야 한다. (체크리스트)
 *
 * ── "+ 아이 추가"를 A-4가 아니라 A-3으로 보낸다 ─────────────────────
 * 명세는 A-5 → A-4 직행으로 그렸지만, `child_consents`는 **아이 한 명당 한 건**이다
 * (api.md 3.2). 둘째·셋째 아이도 자기 동의 레코드가 필요하므로 동의를 먼저 받는다.
 * A-4로 곧장 보내면 동의 값이 없어 A-3으로 되튕기고 화면이 한 번 번쩍인다.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CenteredShell } from "@/components/shells/CenteredShell";
import { ChildAvatar } from "@/components/ui/ChildAvatar";
import { PillButton } from "@/components/ui/PillButton";
import { accountApi } from "@/lib/api";
import type { AccountApi, Child } from "@/lib/api/types";
import { setSelectedChildId } from "@/lib/client-store";
import { rem } from "@/lib/rem";
import { relativeActivity } from "@/lib/relative-date";

export function ProfileSelectScreen({
  api = accountApi,
}: {
  api?: AccountApi;
}) {
  const router = useRouter();
  const [children, setChildren] = useState<Child[] | null>(null);
  const [limit, setLimit] = useState(3);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .listChildren()
      .then((result) => {
        if (!alive) return;
        setLimit(result.limit);
        // 아이가 0명이면 고를 것이 없다. 등록 흐름으로 보낸다. (체크리스트)
        if (result.children.length === 0) {
          router.replace("/onboarding/consent");
          return;
        }
        setChildren(result.children);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [api, router]);

  const select = useCallback(
    (childId: string) => {
      setSelectedChildId(childId);
      router.push("/home");
    },
    [router]
  );

  if (failed) {
    return (
      <CenteredShell width="wide" centerY>
        <p className="text-center text-parent-body text-muted">
          아이 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      </CenteredShell>
    );
  }

  if (!children) {
    return (
      <CenteredShell width="wide" centerY>
        <p className="text-center text-parent-body text-muted">
          불러오고 있어요…
        </p>
      </CenteredShell>
    );
  }

  return (
    <CenteredShell width="wide" centerY>
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-parent-title font-bold text-text">
          누가 이야기할까요?
        </h1>

        <ul className="flex flex-wrap items-stretch justify-center gap-5">
          {children.map((child) => (
            <li key={child.id}>
              <button
                type="button"
                onClick={() => select(child.id)}
                style={{ width: rem(220), height: rem(260) }}
                className="flex flex-col items-center justify-center gap-4 rounded-card border border-border bg-surface p-5 shadow-soft transition-transform hover:-translate-y-1"
              >
                <ChildAvatar name={child.name} avatarId={child.avatarId} size={96} />
                <span className="text-parent-title font-bold text-text">
                  {child.name}
                </span>
                <span className="text-parent-body text-muted">
                  {child.age}세 · {relativeActivity(child.lastActivityAt)}
                </span>
              </button>
            </li>
          ))}

          {children.length < limit ? (
            <li>
              <button
                type="button"
                onClick={() => router.push("/onboarding/consent")}
                style={{ width: rem(220), height: rem(260) }}
                className="flex flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-border bg-surface/60 p-5 text-muted transition-colors hover:border-primary hover:text-primary"
              >
                <span aria-hidden className="text-5xl leading-none">
                  +
                </span>
                <span className="text-parent-body font-bold">아이 추가</span>
              </button>
            </li>
          ) : null}
        </ul>

        <PillButton
          variant="outlined"
          leading={<span aria-hidden>🔒</span>}
          onClick={() => router.push("/parent")}
        >
          보호자 모드
        </PillButton>
      </div>
    </CenteredShell>
  );
}
