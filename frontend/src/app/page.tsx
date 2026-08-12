/**
 * A-1 스플래시 — docs/spec/screens.md §A
 *
 * 라우트: /
 * 진입 즉시 로그인 여부를 확인해 /profiles 또는 /login으로 보낸다.
 *
 * 확인 방법이 바뀌었다. 예전에는 localStorage의 토큰을 봤지만, JWT가 HttpOnly 쿠키로
 * 오면서 프론트가 토큰을 볼 수 없다. 대신 `GET /api/auth/me`에 물어본다.
 * (docs/request/frontend/kakao-login-flow.md)
 *
 * 지켜야 할 세 가지 (명세 + 체크리스트)
 *   - 최소 노출 800ms. 인증이 즉시 끝나도 화면이 깜빡이지 않게
 *   - 확인이 3초를 넘기면 타임아웃 처리 후 /login
 *   - replace로 이동. 뒤로가기로 이 화면에 다시 오지 않게
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { CenteredShell } from "@/components/shells/CenteredShell";
import { authApi } from "@/lib/api/auth";

const MIN_VISIBLE_MS = 800;
const AUTH_TIMEOUT_MS = 3000;

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    let done = false;

    const go = (path: string) => {
      if (done) return;
      done = true;
      router.replace(path);
    };

    // 로그인 여부를 서버에 물어본다. 온보딩까지 끝냈으면 /profiles, 아니면 동의부터.
    const check = authApi
      .me()
      .then((me) =>
        me.hasCompletedOnboarding ? "/profiles" : "/onboarding/consent"
      )
      .catch(() => "/login");

    const minWait = new Promise<void>((resolve) =>
      setTimeout(resolve, MIN_VISIBLE_MS)
    );

    const timeout = setTimeout(() => go("/login"), AUTH_TIMEOUT_MS);

    void Promise.all([check, minWait])
      .then(([path]) => go(path))
      .catch(() => go("/login"))
      .finally(() => clearTimeout(timeout));

    return () => {
      done = true;
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <CenteredShell width="narrow" centerY>
      <div className="flex flex-col items-center gap-6 text-center">
        {/* 로고 원본 미수령 — 텍스트 로고타입으로 대체 (assets.md §3-2) */}
        <div
          aria-hidden
          className="flex size-24 items-center justify-center rounded-bubble bg-primary text-5xl font-bold text-white"
        >
          Q
        </div>

        <h1 className="text-hero leading-tight font-bold text-text">
          굿퀘스천
        </h1>

        <p className="text-lg text-muted">좋은 질문이 좋은 생각을 만들어요</p>

        <div aria-label="불러오는 중" className="mt-4 flex gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{ animationDelay: `${i * 0.15}s` }}
              className="size-2.5 animate-bounce rounded-full bg-primary"
            />
          ))}
        </div>
      </div>
    </CenteredShell>
  );
}
