/**
 * A-4 아이 프로필 등록 — docs/spec/screens.md §A
 *
 * 진입: A-3(온보딩), A-5 "+ 아이 추가", H-2 "+ 아이 추가하기"
 * 이탈: /profiles
 *
 * ── 명세의 모순 하나를 정리했다 ──────────────────────────────────────
 * A-4 체크리스트에는 "'나중에 추가하기' 클릭 시에도 동의 값은 저장되는지"가 있고
 * A-5 체크리스트에는 "아이가 0명일 때 A-4로 자동 이동하는지"가 있다. 둘 다 지키면
 * 온보딩에서 건너뛰기를 눌러도 곧바로 이 화면으로 되돌아온다. 그래서
 * **아이가 이미 있을 때만 "취소"를 노출**한다. 온보딩 첫 등록에는 빠져나갈 길이 없다.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CenteredShell } from "@/components/shells/CenteredShell";
import { AVATAR_IDS, ChildAvatar } from "@/components/ui/ChildAvatar";
import { PillButton } from "@/components/ui/PillButton";
import { useToast } from "@/components/ui/Toast";
import { errorCodeOf } from "@/lib/api/errors";
import { mockAccountApi } from "@/lib/api/mock-account";
import type { AccountApi } from "@/lib/api/types";
import {
  getConsentDraft,
  setConsentDraft,
  setSelectedChildId,
} from "@/lib/client-store";

/** 출생 연도 선택 범위. 대상은 7세~초2다. (PRD 1.2) 여유를 두고 ±3년 */
function birthYearOptions(): number[] {
  const thisYear = new Date().getFullYear();
  const youngest = thisYear - 5;
  const oldest = thisYear - 12;
  const years: number[] = [];
  for (let year = youngest; year >= oldest; year -= 1) years.push(year);
  return years;
}

const NAME_MAX = 10;

export function ChildRegisterScreen({
  api = mockAccountApi,
}: {
  api?: AccountApi;
}) {
  const router = useRouter();
  const toast = useToast();

  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  /** 이미 등록된 아이 수. 3명이면 이 화면에 머물지 않는다. */
  const [existingCount, setExistingCount] = useState<number | null>(null);
  const [limit, setLimit] = useState(3);

  const years = birthYearOptions();

  useEffect(() => {
    let alive = true;
    api
      .listChildren()
      .then(({ children, limit: max }) => {
        if (!alive) return;
        setExistingCount(children.length);
        setLimit(max);
        // 정원이 찼으면 진입 자체를 막는다. (A-4 상태 표)
        if (children.length >= max) {
          toast.show(`아이는 최대 ${max}명까지 등록할 수 있어요.`, "danger");
          router.replace("/profiles");
        }
      })
      .catch(() => {
        if (alive) setExistingCount(0);
      });
    return () => {
      alive = false;
    };
  }, [api, router, toast]);

  const trimmed = name.trim();
  const filled =
    avatarId !== null &&
    trimmed.length >= 1 &&
    trimmed.length <= NAME_MAX &&
    typeof birthYear === "number";

  const submit = useCallback(async () => {
    if (!filled || saving || avatarId === null) return;
    if (typeof birthYear !== "number") return;

    // 동의 값 없이는 아이를 만들 수 없다. A-3을 거치지 않았다면 되돌려보낸다.
    const consents = getConsentDraft();
    if (!consents) {
      toast.show("동의 절차를 먼저 진행해 주세요.", "danger");
      router.replace("/onboarding/consent");
      return;
    }

    setSaving(true);
    try {
      const child = await api.createChild({
        name: trimmed,
        birthYear,
        avatarId,
        consents,
      });
      // 등록한 아이를 바로 선택 상태로 둔다. 곧바로 홈으로 갈 수 있다.
      setSelectedChildId(child.id);
      setConsentDraft(null);
      router.replace("/profiles");
    } catch (error) {
      if (errorCodeOf(error) === "CHILD_LIMIT_EXCEEDED") {
        toast.show(`아이는 최대 ${limit}명까지 등록할 수 있어요.`, "danger");
        router.replace("/profiles");
        return;
      }
      toast.show("등록에 실패했어요. 다시 시도해 주세요.", "danger");
      setSaving(false);
    }
  }, [api, avatarId, birthYear, filled, limit, router, saving, toast, trimmed]);

  return (
    <CenteredShell width="card" centerY>
      <div className="rounded-card border border-border bg-surface p-8 shadow-soft">
        <h1 className="text-parent-title font-bold text-text">
          아이를 등록해 주세요
        </h1>
        <p className="mt-2 text-parent-body text-muted">
          아이 화면에서 이 이름으로 불러 줄 거예요.
        </p>

        <fieldset className="mt-8">
          <legend className="text-parent-body font-bold text-text">
            캐릭터 선택
          </legend>
          {/* 아바타 일러스트 6종 미수령. 색상 6종으로 대체한다. (assets.md §3-3) */}
          <ul className="mt-3 grid grid-cols-6 gap-3">
            {AVATAR_IDS.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  aria-label={`캐릭터 ${id}`}
                  aria-pressed={avatarId === id}
                  onClick={() => setAvatarId(id)}
                  className="flex min-h-touch w-full items-center justify-center rounded-bubble p-1"
                >
                  <ChildAvatar
                    name={trimmed || "?"}
                    avatarId={id}
                    size={56}
                    selected={avatarId === id}
                  />
                </button>
              </li>
            ))}
          </ul>
        </fieldset>

        <div className="mt-8">
          <label
            htmlFor="child-name"
            className="text-parent-body font-bold text-text"
          >
            아이 이름
          </label>
          <input
            id="child-name"
            value={name}
            maxLength={NAME_MAX}
            onChange={(event) => setName(event.target.value)}
            placeholder="예: 민준"
            className="mt-2 min-h-touch w-full rounded-bubble border-2 border-border bg-surface px-5 text-parent-body text-text outline-none focus:border-primary"
          />
          <p className="mt-2 text-sm text-muted">
            실명이 아니어도 괜찮아요. 최대 {NAME_MAX}자.
          </p>
        </div>

        <div className="mt-6">
          <label
            htmlFor="child-birth-year"
            className="text-parent-body font-bold text-text"
          >
            출생 연도
          </label>
          <select
            id="child-birth-year"
            value={birthYear}
            onChange={(event) =>
              setBirthYear(event.target.value ? Number(event.target.value) : "")
            }
            className="mt-2 min-h-touch w-full rounded-bubble border-2 border-border bg-surface px-5 text-parent-body text-text outline-none focus:border-primary"
          >
            <option value="">선택해 주세요</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}년 ({new Date().getFullYear() - year}세)
              </option>
            ))}
          </select>
        </div>

        <PillButton
          className="mt-8"
          fullWidth
          onClick={() => void submit()}
          disabled={!filled || saving}
        >
          {saving ? "등록하고 있어요…" : "등록 완료"}
        </PillButton>

        {/* 아이가 이미 있을 때만 빠져나갈 길을 준다. 위 주석 참조. */}
        {existingCount !== null && existingCount > 0 ? (
          <PillButton
            className="mt-3"
            variant="outlined"
            fullWidth
            onClick={() => router.replace("/profiles")}
            disabled={saving}
          >
            취소
          </PillButton>
        ) : null}
      </div>
    </CenteredShell>
  );
}
