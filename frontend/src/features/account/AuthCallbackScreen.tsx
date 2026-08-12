/**
 * 로그인 콜백 — docs/request/frontend/kakao-login-flow.md
 *
 * 백엔드가 JWT 쿠키를 설정한 뒤 여기로 302로 보낸다.
 *
 *   {프론트}/auth/callback?hasCompletedOnboarding=false   → /onboarding/consent
 *   {프론트}/auth/callback?hasCompletedOnboarding=true    → /profiles
 *   {프론트}/auth/callback?error=login_failed             → 실패 안내 후 /login
 *
 * **토큰을 다루지 않는다.** HttpOnly 쿠키라 JS에서 읽을 수 없고 읽을 필요도 없다.
 * 쿼리 파라미터만 보고 분기한다.
 *
 * 쿼리 없이 직접 들어온 경우(주소창 입력·새로고침)는 `GET /api/auth/me`로 확인한다.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { CenteredShell } from "@/components/shells/CenteredShell";
import { PillButton } from "@/components/ui/PillButton";
import { authApi } from "@/lib/api/auth";

export function AuthCallbackScreen() {
  const router = useRouter();
  const params = useSearchParams();
  /** `/auth/me`까지 물어봤는데도 인증이 아닌 경우 */
  const [lookupFailed, setLookupFailed] = useState(false);

  const error = params.get("error");
  const flag = params.get("hasCompletedOnboarding");

  // error 쿼리는 렌더 중에 알 수 있다. state로 옮기면 연쇄 렌더가 난다.
  const failed = Boolean(error) || lookupFailed;

  useEffect(() => {
    if (error) return;

    // 쿼리가 있으면 그대로 믿는다. 백엔드가 방금 만들어 보낸 값이다.
    if (flag === "true" || flag === "false") {
      router.replace(flag === "true" ? "/profiles" : "/onboarding/consent");
      return;
    }

    // 쿼리가 없다 — 주소를 직접 입력했거나 새로고침했다. 서버에 물어본다.
    let alive = true;
    authApi
      .me()
      .then((me) => {
        if (!alive) return;
        router.replace(
          me.hasCompletedOnboarding ? "/profiles" : "/onboarding/consent"
        );
      })
      .catch(() => {
        if (alive) setLookupFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [error, flag, router]);

  if (failed) {
    return (
      <CenteredShell width="narrow" centerY>
        <div className="flex flex-col items-center gap-5 text-center">
          <span aria-hidden className="text-5xl">
            🔑
          </span>
          <h1 className="text-parent-title font-bold text-text">
            로그인하지 못했어요
          </h1>
          <p className="text-parent-body text-muted">
            다시 시도해 주세요. 계속 안 되면 잠시 후에 열어 주세요.
          </p>
          <PillButton onClick={() => router.replace("/login")}>
            로그인 화면으로
          </PillButton>
        </div>
      </CenteredShell>
    );
  }

  return (
    <CenteredShell width="narrow" centerY>
      <div className="flex flex-col items-center gap-5 text-center">
        <div aria-label="불러오는 중" className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{ animationDelay: `${i * 0.15}s` }}
              className="size-2.5 animate-bounce rounded-full bg-primary"
            />
          ))}
        </div>
        <p className="text-parent-body text-muted">로그인하고 있어요…</p>
      </div>
    </CenteredShell>
  );
}
