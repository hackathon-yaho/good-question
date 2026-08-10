/**
 * 마이크 권한 게이트 — docs/spec/screens.md §2 라우트 가드, B-3 동작
 *
 *   granted             → 통과
 *   denied              → I-4 (하드 블록)
 *   prompt / unsupported → I-1 (모달, 닫기 없음)
 *
 * B-3 "이야기 시작하기"와 `/play` 직접 진입 두 경로가 같은 판단을 해야 한다.
 * 그래서 판단을 컴포넌트 하나에 모아 두고 양쪽에서 쓴다.
 */

"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { CenteredShell } from "@/components/shells/CenteredShell";
import { MicBlockedScreen } from "@/features/system/MicBlockedScreen";
import { MicPermissionModal } from "@/features/system/MicPermissionModal";
import { queryMicPermission } from "@/lib/mic-permission";

type GateState = "checking" | "granted" | "asking" | "blocked";

export function MicGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<GateState>("checking");

  useEffect(() => {
    let alive = true;
    void queryMicPermission().then((permission) => {
      if (!alive) return;
      if (permission === "granted") setState("granted");
      else if (permission === "denied") setState("blocked");
      else setState("asking");
    });
    return () => {
      alive = false;
    };
  }, []);

  const exit = useCallback(() => router.replace("/home"), [router]);

  if (state === "granted") return <>{children}</>;

  if (state === "blocked") {
    return (
      <MicBlockedScreen
        onGranted={() => setState("granted")}
        onExit={exit}
      />
    );
  }

  return (
    <CenteredShell width="narrow" centerY>
      <p className="text-center text-kid-body text-muted">
        마이크를 확인하고 있어요…
      </p>
      <MicPermissionModal
        open={state === "asking"}
        onGranted={() => setState("granted")}
        onDenied={() => setState("blocked")}
      />
    </CenteredShell>
  );
}
