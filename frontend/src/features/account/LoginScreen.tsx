/**
 * A-2 로그인 — docs/spec/screens.md §A
 *
 * 셸: 좌우 스플릿 (좌 55% 일러스트 / 우 45% 폼). CenteredShell을 쓰지 않는다.
 *
 * ── 소셜 로그인은 카카오만이다 ──────────────────────────────────────
 * 명세는 카카오·구글·네이버 3종을 그렸지만, PRD M-01은 **카카오만** 구현 대상이다.
 * (Q-02, 백엔드 D-06) 누를 수 없는 버튼을 늘어놓으면 시연에서 "안 되는 기능"으로 보인다.
 *
 * ── 리다이렉트 방식이다 ─────────────────────────────────────────────
 * 버튼은 **API 호출이 아니라 `window.location.href` 이동**이다.
 * 카카오 동의 화면으로 넘어가야 하므로 fetch로는 동작하지 않는다.
 * (docs/request/frontend/kakao-login-flow.md · 백엔드 D-18)
 *
 * 카카오 SDK를 넣지 않는다. 백엔드가 로그인 전 과정을 처리하고, 끝나면
 * `/auth/callback`으로 되돌려 보낸다.
 */

"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { resetAllMockSessions } from "@/lib/api/mock";
import { resetMockAccount } from "@/lib/api/mock-account";
import { resetMockWordbook } from "@/lib/api/mock-content";
import { STORY_COVER_IMAGE } from "@/lib/story-images";
import {
  authApi,
  clearMockSession,
  loginStartUrl,
  mockLoginRedirectPath,
} from "@/lib/api/auth";
import { API_MODE } from "@/lib/api/http";
import { clearClientStore, setConsentDraft } from "@/lib/client-store";

export function LoginScreen() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const startLogin = useCallback(() => {
    if (pending) return;
    setPending(true);
    setFailed(false);

    if (API_MODE === "backend") {
      // 여기서 페이지를 떠난다. 되돌아오는 곳은 /auth/callback이다.
      window.location.href = loginStartUrl();
      return;
    }

    // 목 모드 — 백엔드가 만들 콜백 URL과 같은 주소로 이동해 같은 코드를 태운다.
    router.replace(mockLoginRedirectPath());
  }, [pending, router]);

  /** 카카오 앱 등록 전 개발용. 백엔드 dev-login으로 쿠키만 받아 흐름을 검증한다. */
  const devLogin = useCallback(async () => {
    if (pending) return;
    setPending(true);
    setFailed(false);
    try {
      await authApi.devLogin();
      const me = await authApi.me();
      router.replace(
        me.hasCompletedOnboarding ? "/profiles" : "/onboarding/consent"
      );
    } catch {
      setFailed(true);
      setPending(false);
    }
  }, [pending, router]);

  const resetDemo = useCallback(() => {
    clearClientStore();
    setConsentDraft(null);
    clearMockSession();
    resetMockAccount();
    resetMockWordbook();
    // 아이를 지우면 그 아이의 진행 중 세션도 남을 이유가 없다.
    resetAllMockSessions();
    router.refresh();
  }, [router]);

  return (
    <div className="flex min-h-dvh w-full bg-bg">
      {/* 좌 55% 일러스트 패널 — 일러스트 미수령이라 색면 + 로고타입으로 대체 */}
      <aside className="relative hidden w-[55%] shrink-0 flex-col justify-between bg-primary-soft p-12 lg:flex">
        {/* eslint-disable-next-line @next/next/no-img-element -- public 정적 파일 */}
        <img
          src="/logo-wordmark.webp"
          alt="굿퀘스천"
          width={200}
          height={72}
          className="h-auto w-50"
        />

        <p className="max-w-md text-parent-title leading-relaxed font-bold text-text">
          옛이야기 속 인물과 이야기를 나누며
          <br />
          아이가 자기 생각을 말로 꺼냅니다.
        </p>

        <div className="relative h-48 w-full max-w-md">
          <Image
            src={STORY_COVER_IMAGE}
            alt=""
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      </aside>

      {/* 우 45% 폼 */}
      <main className="flex min-w-0 flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-shell-narrow">
          {failed ? (
            <p
              role="alert"
              className="mb-6 rounded-bubble bg-danger px-5 py-4 text-parent-body font-bold text-white"
            >
              로그인에 실패했어요. 다시 시도해 주세요.
            </p>
          ) : null}

          <h1 className="text-[1.875rem] leading-tight font-bold text-text">
            아이의 생각을 여는 첫 걸음
          </h1>
          <p className="mt-3 text-parent-body text-muted">
            보호자 계정으로 시작해 주세요
          </p>

          <button
            type="button"
            onClick={startLogin}
            disabled={pending}
            className="mt-10 flex min-h-14 w-full max-w-xs items-center justify-center gap-3 rounded-pill bg-[#FEE500] px-6 text-parent-body font-bold text-[#191600] transition-all hover:brightness-105 disabled:opacity-70"
          >
            {pending ? (
              <>
                <Spinner />
                연결하고 있어요…
              </>
            ) : (
              "카카오로 시작하기"
            )}
          </button>

          <p className="mt-8 text-sm leading-relaxed text-muted">
            로그인하면 서비스 이용약관과 개인정보 처리방침에 동의하는 것으로
            봅니다.
            <br />
            아동 개인정보는 보호자 동의 후에만 처리합니다.
          </p>

          <div className="mt-10 flex flex-col items-start gap-3 border-t border-border pt-6">
            <p className="text-sm text-muted">
              연동 모드 <b>{API_MODE}</b>
            </p>
            {API_MODE === "backend" ? (
              <button
                type="button"
                onClick={() => void devLogin()}
                disabled={pending}
                className="text-sm text-muted underline"
              >
                카카오 없이 로그인 (dev-login)
              </button>
            ) : null}
            <button
              type="button"
              onClick={resetDemo}
              className="text-sm text-muted underline"
            >
              데모 상태 초기화
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}
