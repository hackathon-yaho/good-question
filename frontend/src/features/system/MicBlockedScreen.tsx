/**
 * I-4 마이크 권한 거부됨 (하드 블록) — docs/spec/screens.md §I
 *
 * 형태: 전체화면. 여기서 나가는 길은 "나가기" 하나다.
 *
 * "권한 다시 확인하기"는 getUserMedia를 다시 부르지 않고 **권한 상태만 조회**한다.
 * 한 번 거부된 오리진에서 getUserMedia를 다시 부르면 브라우저가 창을 띄우지 않고
 * 즉시 거부하므로, 보호자가 설정을 바꿨는지 알아내는 방법이 조회뿐이다.
 */

"use client";

import { useCallback, useState } from "react";

import { PillButton } from "@/components/ui/PillButton";
import { useToast } from "@/components/ui/Toast";
import { queryMicPermission, requestMic } from "@/lib/mic-permission";
import { rem } from "@/lib/rem";

const STEPS = [
  "주소창 왼쪽의 자물쇠 아이콘을 눌러요",
  "'마이크' 항목을 '허용'으로 바꿔요",
  "이 화면에서 아래 버튼을 다시 눌러요",
];

export function MicBlockedScreen({
  onGranted,
  onExit,
}: {
  onGranted: () => void;
  onExit: () => void;
}) {
  const toast = useToast();
  const [checking, setChecking] = useState(false);

  const recheck = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    const state = await queryMicPermission();

    // Permissions API가 없는 브라우저에서는 조회로 알 수 없다. 그때만 다시 물어본다.
    const granted =
      state === "granted" ? true : state === "unsupported" ? await requestMic() : false;

    setChecking(false);
    if (granted) onGranted();
    else toast.show("아직 마이크가 꺼져 있어요", "danger");
  }, [checking, onGranted, toast]);

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-bg px-6 py-10">
      <div className="flex w-full max-w-shell-card flex-col items-center gap-6 text-center">
        {/* 일러스트 180px 미수령 (assets.md §3-1) */}
        <div
          aria-hidden
          style={{ width: rem(180), height: rem(180) }}
          className="flex items-center justify-center rounded-bubble bg-border text-7xl"
        >
          🔇
        </div>

        <h1 className="text-headline font-bold text-text">
          마이크가 꺼져 있어요
        </h1>

        <p className="text-kid-body leading-relaxed text-text">
          목소리로 이야기하는 서비스라 마이크가 꼭 필요해요.
          <br />
          아래 순서대로 켜 주세요.
        </p>

        <ol className="w-full rounded-card bg-accent-soft p-6 text-left">
          {STEPS.map((step, index) => (
            <li
              key={step}
              className="flex items-start gap-3 py-2 text-parent-body text-text"
            >
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-text"
              >
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <PillButton
          size="kid"
          fullWidth
          disabled={checking}
          leading={<span aria-hidden>🔄</span>}
          onClick={() => void recheck()}
        >
          {checking ? "확인하고 있어요…" : "권한 다시 확인하기"}
        </PillButton>

        <PillButton variant="outlined" fullWidth onClick={onExit}>
          나가기
        </PillButton>
      </div>
    </div>
  );
}
