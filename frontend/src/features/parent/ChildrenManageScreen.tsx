/**
 * H-2 아이 프로필 관리 + H-6 삭제 확인 모달 — docs/spec/screens.md §H
 *
 * 체크리스트: 삭제한 아이가 현재 선택된 아이면 `/profiles`로 보낸다.
 * 안 그러면 사라진 아이를 기준으로 B·C·D 화면이 돌아 빈 화면이 나온다.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CenteredShell } from "@/components/shells/CenteredShell";
import { BackButton } from "@/components/ui/BackButton";
import { AVATAR_IDS, AVATAR_LABEL, ChildAvatar } from "@/components/ui/ChildAvatar";
import { Modal } from "@/components/ui/Modal";
import { PillButton } from "@/components/ui/PillButton";
import { useToast } from "@/components/ui/Toast";
import { accountApi as defaultAccountApi } from "@/lib/api";
import { parentApi } from "@/lib/api";
import type { AccountApi, Child, ParentApi } from "@/lib/api/types";
import {
  getSelectedChildId,
  setSelectedChildId,
} from "@/lib/client-store";
import { withChildName } from "@/lib/korean";

const NAME_MAX = 10;

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function ChildrenManageScreen({
  api = parentApi,
  accountApi = defaultAccountApi,
}: {
  api?: ParentApi;
  accountApi?: AccountApi;
}) {
  const router = useRouter();
  const toast = useToast();

  const [children, setChildren] = useState<Child[] | null>(null);
  const [limit, setLimit] = useState(3);
  const [version, setVersion] = useState(0);

  /** 인라인 편집 중인 아이 */
  const [editing, setEditing] = useState<Child | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftAvatar, setDraftAvatar] = useState("");

  const [deleting, setDeleting] = useState<Child | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    accountApi
      .listChildren()
      .then((result) => {
        if (!alive) return;
        setChildren(result.children);
        setLimit(result.limit);
      })
      .catch(() => {
        if (alive) setChildren([]);
      });
    return () => {
      alive = false;
    };
  }, [accountApi, version]);

  const startEdit = useCallback((child: Child) => {
    setEditing(child);
    setDraftName(child.name);
    setDraftAvatar(child.avatarId);
  }, []);

  const save = useCallback(async () => {
    if (!editing || busy) return;
    const name = draftName.trim();
    if (!name || name.length > NAME_MAX) {
      toast.show(`이름은 1~${NAME_MAX}자로 적어 주세요.`, "danger");
      return;
    }
    setBusy(true);
    try {
      await api.updateChild(editing.id, { name, avatarId: draftAvatar });
      setEditing(null);
      setVersion((prev) => prev + 1);
    } catch {
      toast.show("수정하지 못했어요. 다시 시도해 주세요.", "danger");
    } finally {
      setBusy(false);
    }
  }, [api, busy, draftAvatar, draftName, editing, toast]);

  const remove = useCallback(async () => {
    if (!deleting || busy) return;
    setBusy(true);
    try {
      await api.deleteChild(deleting.id);
      // 지운 아이가 지금 선택된 아이면 기준이 사라진다. 선택 화면으로 보낸다.
      if (getSelectedChildId() === deleting.id) {
        setSelectedChildId(null);
        setDeleting(null);
        router.replace("/profiles");
        return;
      }
      setDeleting(null);
      setVersion((prev) => prev + 1);
    } catch {
      toast.show("삭제하지 못했어요. 다시 시도해 주세요.", "danger");
    } finally {
      setBusy(false);
    }
  }, [api, busy, deleting, router, toast]);

  const full = (children?.length ?? 0) >= limit;

  return (
    <CenteredShell width="column">
      <BackButton label="뒤로 가기" />
      <h1 className="mt-4 text-parent-title font-bold text-text">
        아이 프로필 관리
      </h1>

      {children === null ? (
        <p className="mt-6 text-parent-body text-muted">불러오고 있어요…</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {children.map((child) => (
            <li
              key={child.id}
              className="flex min-h-touch items-center gap-4 rounded-card border border-border bg-surface p-4"
            >
              <ChildAvatar name={child.name} avatarId={child.avatarId} size={56} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-parent-body font-bold text-text">
                  {child.name}
                </p>
                <p className="text-sm text-muted">
                  {child.age}세 · {formatDate(child.registeredAt)} 등록
                </p>
              </div>
              <button
                type="button"
                aria-label={`${child.name} 프로필 수정`}
                onClick={() => startEdit(child)}
                className="flex size-touch items-center justify-center rounded-full text-xl hover:bg-primary-soft"
              >
                ✏️
              </button>
              <button
                type="button"
                aria-label={`${child.name} 프로필 삭제`}
                onClick={() => setDeleting(child)}
                className="flex size-touch items-center justify-center rounded-full text-xl hover:bg-danger/10"
              >
                🗑️
              </button>
            </li>
          ))}

          <li>
            <button
              type="button"
              disabled={full}
              onClick={() => router.push("/onboarding/consent")}
              className="flex min-h-touch w-full items-center justify-center gap-2 rounded-card border-2 border-dashed border-border bg-surface/60 p-4 text-parent-body font-bold text-muted transition-colors hover:border-primary hover:text-primary disabled:border-border disabled:text-muted disabled:hover:border-border"
            >
              + 아이 추가하기
            </button>
            {full ? (
              <p className="mt-2 text-sm text-muted">
                아이는 최대 {limit}명까지 등록할 수 있어요.
              </p>
            ) : null}
          </li>
        </ul>
      )}

      <p className="mt-6 rounded-bubble bg-accent-soft px-5 py-4 text-parent-body leading-relaxed text-text">
        아이 이름은 아이 화면에서 부르는 이름이에요. 실명이 아니어도 괜찮아요.
      </p>

      {/* 인라인 편집 (이름 / 아바타) */}
      <Modal
        open={editing !== null}
        label="아이 프로필 수정"
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <div className="flex flex-col gap-5">
            <h2 className="text-parent-title font-bold text-text">
              프로필 수정
            </h2>

            <div>
              <label
                htmlFor="edit-name"
                className="text-parent-body font-bold text-text"
              >
                이름
              </label>
              <input
                id="edit-name"
                value={draftName}
                maxLength={NAME_MAX}
                onChange={(event) => setDraftName(event.target.value)}
                className="mt-2 min-h-touch w-full rounded-bubble border-2 border-border bg-surface px-5 text-parent-body text-text outline-none focus:border-primary"
              />
            </div>

            <fieldset>
              <legend className="text-parent-body font-bold text-text">
                캐릭터
              </legend>
              <ul className="mt-2 grid grid-cols-6 gap-3">
                {AVATAR_IDS.map((id) => (
                  <li key={id}>
                    <button
                      type="button"
                      aria-label={`캐릭터 ${AVATAR_LABEL[id]}`}
                      aria-pressed={draftAvatar === id}
                      onClick={() => setDraftAvatar(id)}
                      className="flex min-h-touch w-full items-center justify-center rounded-bubble p-1"
                    >
                      <ChildAvatar
                        name={draftName || "?"}
                        avatarId={id}
                        size={48}
                        selected={draftAvatar === id}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </fieldset>

            <PillButton fullWidth disabled={busy} onClick={() => void save()}>
              {busy ? "저장하고 있어요…" : "저장"}
            </PillButton>
            <PillButton
              variant="outlined"
              fullWidth
              disabled={busy}
              onClick={() => setEditing(null)}
            >
              취소
            </PillButton>
          </div>
        ) : null}
      </Modal>

      {/* H-6 삭제 확인 */}
      <Modal
        open={deleting !== null}
        width={480}
        dismissible={false}
        label="아이 프로필 삭제 확인"
      >
        {deleting ? (
          <div className="flex flex-col gap-4">
            <span
              aria-hidden
              className="flex size-14 items-center justify-center rounded-full bg-danger/10 text-2xl"
            >
              ⚠️
            </span>
            <h2 className="text-parent-title font-bold text-text">
              {withChildName("{childName}이 프로필을 삭제할까요?", deleting.name)}
            </h2>
            <p className="text-parent-body leading-relaxed text-text">
              지금까지 쌓인 활동 기록과 리포트도 함께 삭제되고 되돌릴 수 없어요.
            </p>

            <PillButton
              variant="danger"
              fullWidth
              disabled={busy}
              onClick={() => void remove()}
            >
              {busy ? "삭제하고 있어요…" : "삭제하기"}
            </PillButton>
            <PillButton
              variant="outlined"
              fullWidth
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              취소
            </PillButton>
          </div>
        ) : null}
      </Modal>
    </CenteredShell>
  );
}
