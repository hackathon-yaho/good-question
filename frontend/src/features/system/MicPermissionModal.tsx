/**
 * I-1 마이크 권한 요청 — docs/spec/screens.md §I
 *
 * 형태: 모달 600px · **닫기 버튼 없음**
 * 마이크는 필수 정책이다. 건너뛰기를 만들지 않는다. 이 화면을 벗어나는 유일한 방법은
 * 브라우저 뒤로가기다.
 */

"use client";

import { useCallback, useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { PillButton } from "@/components/ui/PillButton";
import { requestMic } from "@/lib/mic-permission";
import { rem } from "@/lib/rem";

export function MicPermissionModal({
  open,
  onGranted,
  onDenied,
}: {
  open: boolean;
  onGranted: () => void;
  onDenied: () => void;
}) {
  const [asking, setAsking] = useState(false);

  const ask = useCallback(async () => {
    if (asking) return;
    setAsking(true);
    const granted = await requestMic();
    setAsking(false);
    if (granted) onGranted();
    else onDenied();
  }, [asking, onDenied, onGranted]);

  return (
    <Modal open={open} width={600} dismissible={false} label="마이크 권한 요청">
      <div className="flex flex-col items-center gap-5 text-center">
        {/* 캐릭터 일러스트 160px 미수령 — 규격 자리를 유지한다 (assets.md §3-1) */}
        <div
          aria-hidden
          style={{ width: rem(160), height: rem(160) }}
          className="flex items-center justify-center rounded-bubble bg-primary-soft text-6xl"
        >
          🎤
        </div>

        <h2 className="text-headline font-bold text-text">
          목소리로 이야기할 거예요
        </h2>

        <p className="text-kid-body leading-relaxed text-text">
          마이크를 켜야 친구와 이야기를 시작할 수 있어요.
          <br />
          목소리는 저장되지 않고 글자로만 바뀌어요.
        </p>

        <p className="flex items-center gap-2 rounded-bubble bg-secondary-soft px-5 py-3 text-parent-body font-bold text-text">
          <span aria-hidden>🛡️</span>
          녹음 파일은 어디에도 남지 않아요
        </p>

        <PillButton
          size="kid"
          fullWidth
          disabled={asking}
          onClick={() => void ask()}
        >
          {asking ? "확인하고 있어요…" : "마이크 켜기"}
        </PillButton>

        <p className="text-parent-body text-muted">
          이야기를 시작하려면 마이크 허용이 꼭 필요해요.
        </p>
      </div>
    </Modal>
  );
}
