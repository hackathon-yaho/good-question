/**
 * A-3 약관 · 아동 개인정보 동의 — docs/spec/screens.md §A
 *
 * ⚠️ screens.md §6 구현 순서의 2단계 목록에는 A-3이 없다. 그런데도 여기서 만든다.
 *    A-4의 `POST /api/children`이 **A-3의 동의 값을 함께** 받는 계약이고
 *    (api.md 3.2), 동의 없는 아이는 세션을 시작할 수 없다(라우트 가드).
 *    A-3을 빼면 동의 값을 프론트가 임의로 만들어 넣게 되는데 그건 요건 위반이다.
 *
 * 동의 값은 여기서 저장하지 않는다. child_consents가 child_id를 요구하므로
 * A-4 제출 시점에 아이 정보와 함께 보낸다. 그때까지 sessionStorage에 들고 있는다.
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { CenteredShell } from "@/components/shells/CenteredShell";
import { Modal } from "@/components/ui/Modal";
import { PillButton } from "@/components/ui/PillButton";
import { setConsentDraft } from "@/lib/client-store";
import type { ConsentValues } from "@/lib/api/types";

type ItemKey = keyof ConsentValues;

const ITEMS: {
  key: ItemKey;
  label: string;
  required: boolean;
  /** 약관 전문 미수령. 도착하면 이 자리를 실제 텍스트로 바꾼다. (assets.md §3-4) */
  body: string;
}[] = [
  {
    key: "termsOfService",
    label: "서비스 이용약관",
    required: true,
    body: "약관 전문을 아직 받지 못했습니다. 정식 문안이 도착하면 이 자리에 그대로 들어갑니다.",
  },
  {
    key: "privacyPolicy",
    label: "개인정보 처리방침",
    required: true,
    body: "약관 전문을 아직 받지 못했습니다. 정식 문안이 도착하면 이 자리에 그대로 들어갑니다.",
  },
  {
    key: "childDataProcessing",
    label: "아동 개인정보 처리 동의",
    required: true,
    body: "만 14세 미만 아동의 개인정보는 보호자의 동의를 받은 뒤에만 처리합니다. 아이의 음성 원본은 저장하지 않고, 문자로 변환한 내용만 대화 기록으로 남습니다.",
  },
  {
    key: "marketing",
    label: "마케팅 정보 수신",
    required: false,
    body: "새로운 이야기와 기능 소식을 받아볼 수 있습니다. 동의하지 않아도 서비스를 이용할 수 있습니다.",
  },
];

const REQUIRED_KEYS = ITEMS.filter((i) => i.required).map((i) => i.key);

const INITIAL: ConsentValues = {
  termsOfService: false,
  privacyPolicy: false,
  childDataProcessing: false,
  marketing: false,
};

export function ConsentScreen() {
  const router = useRouter();
  const [values, setValues] = useState<ConsentValues>(INITIAL);
  const [openItem, setOpenItem] = useState<ItemKey | null>(null);

  const allChecked = useMemo(
    () => ITEMS.every((item) => values[item.key]),
    [values]
  );
  const requiredMet = REQUIRED_KEYS.every((key) => values[key]);

  const toggleAll = useCallback((next: boolean) => {
    setValues({
      termsOfService: next,
      privacyPolicy: next,
      childDataProcessing: next,
      marketing: next,
    });
  }, []);

  const submit = useCallback(() => {
    if (!requiredMet) return;
    setConsentDraft(values);
    router.push("/onboarding/child");
  }, [requiredMet, router, values]);

  const detail = ITEMS.find((item) => item.key === openItem);

  return (
    <CenteredShell width="card" centerY>
      <div className="rounded-card border border-border bg-surface p-8 shadow-soft">
        <h1 className="text-parent-title font-bold text-text">
          시작하기 전에 동의가 필요해요
        </h1>

        <label className="mt-6 flex min-h-touch cursor-pointer items-center gap-3 rounded-bubble bg-primary-soft px-5 py-4">
          <Checkbox
            checked={allChecked}
            onChange={(next) => toggleAll(next)}
            label="전체 동의합니다"
          />
          <span className="text-parent-body font-bold text-text">
            전체 동의합니다
          </span>
        </label>

        <ul className="mt-4 flex flex-col">
          {ITEMS.map((item) => (
            <li
              key={item.key}
              className="flex min-h-touch items-center gap-3 border-b border-border py-3 last:border-b-0"
            >
              <label className="flex flex-1 cursor-pointer items-center gap-3">
                <Checkbox
                  checked={values[item.key]}
                  onChange={(next) =>
                    setValues((prev) => ({ ...prev, [item.key]: next }))
                  }
                  label={item.label}
                />
                <span className="text-parent-body text-text">
                  <span
                    className={
                      item.required ? "font-bold text-primary" : "text-muted"
                    }
                  >
                    [{item.required ? "필수" : "선택"}]
                  </span>{" "}
                  {item.label}
                </span>
              </label>

              <button
                type="button"
                onClick={() => setOpenItem(item.key)}
                aria-label={`${item.label} 전문 보기`}
                className="flex size-touch items-center justify-center rounded-full text-xl text-muted hover:bg-primary-soft"
              >
                {"›"}
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-6 rounded-bubble bg-accent-soft px-5 py-4 text-parent-body text-text">
          만 14세 미만 아동의 정보는 보호자 동의 후에만 처리됩니다.
        </p>

        <PillButton
          className="mt-8"
          fullWidth
          onClick={submit}
          disabled={!requiredMet}
        >
          동의하고 계속하기
        </PillButton>
      </div>

      <Modal
        open={detail !== undefined}
        label={detail?.label}
        onClose={() => setOpenItem(null)}
      >
        <h2 className="text-parent-title font-bold text-text">
          {detail?.label}
        </h2>
        <p className="mt-4 text-parent-body leading-relaxed text-text">
          {detail?.body}
        </p>
        <PillButton
          className="mt-8"
          variant="outlined"
          fullWidth
          onClick={() => setOpenItem(null)}
        >
          닫기
        </PillButton>
      </Modal>
    </CenteredShell>
  );
}

/** 체크박스 자체는 접근성을 위해 native input을 쓰고, 표시만 커스텀한다. */
function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <span className="relative flex size-7 shrink-0 items-center justify-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
        className="peer size-7 cursor-pointer appearance-none rounded-lg border-2 border-border bg-surface checked:border-primary checked:bg-primary"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute text-base font-bold text-white opacity-0 peer-checked:opacity-100"
      >
        {"✓"}
      </span>
    </span>
  );
}
