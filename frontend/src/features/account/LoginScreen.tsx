/**
 * A-2 로그인 — docs/spec/screens.md §A
 *
 * 셸: 좌우 스플릿 (좌 55% 일러스트 / 우 45% 폼). CenteredShell을 쓰지 않는다.
 *
 * ── 소셜 로그인은 카카오만이다 ──────────────────────────────────────
 * 명세는 카카오·구글·네이버 3종을 그렸지만, PRD M-01은 **카카오만** 구현 대상이다.
 * 단일 정본은 PRD이므로 카카오만 노출한다. 누를 수 없는 버튼을 늘어놓으면
 * 심사·시연에서 "안 되는 기능"으로 보인다. (screens.md A-2 체크리스트, Q-02)
 */

"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { resetAllMockSessions } from "@/lib/api/mock";
import { mockAccountApi, resetMockAccount } from "@/lib/api/mock-account";
import type { AccountApi } from "@/lib/api/types";
import {
  clearClientStore,
  setAccessToken,
  setConsentDraft,
} from "@/lib/client-store";

export function LoginScreen({ api = mockAccountApi }: { api?: AccountApi }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  const signIn = useCallback(async () => {
    if (pending) return;
    setPending(true);
    setFailed(false);
    try {
      // 실제로는 카카오 인가 코드를 리다이렉트로 받아 온다.
      // 리다이렉트 복귀 시 무한 루프가 없는지는 실제 연동 때 확인한다. (체크리스트)
      const result = await api.signIn("kakao", {
        authorizationCode: "mock-authorization-code",
      });
      setAccessToken(result.accessToken);

      // 서버가 내려준 값으로만 분기한다. 프론트가 추측하지 않는다.
      if (result.hasCompletedOnboarding) router.replace("/profiles");
      else router.replace("/onboarding/consent");
    } catch {
      setFailed(true);
      setPending(false);
    }
  }, [api, pending, router]);

  const resetDemo = useCallback(() => {
    clearClientStore();
    setConsentDraft(null);
    resetMockAccount();
    // 아이를 지우면 그 아이의 진행 중 세션도 남을 이유가 없다.
    resetAllMockSessions();
    router.refresh();
  }, [router]);

  return (
    <div className="flex min-h-dvh w-full bg-bg">
      {/* 좌 55% 일러스트 패널 — 일러스트 미수령이라 색면 + 로고타입으로 대체 */}
      <aside className="relative hidden w-[55%] shrink-0 flex-col justify-between bg-primary-soft p-12 lg:flex">
        <span className="flex items-center gap-3">
          <span
            aria-hidden
            className="flex size-12 items-center justify-center rounded-bubble bg-primary text-2xl font-bold text-white"
          >
            Q
          </span>
          <span className="text-2xl font-bold text-primary">굿퀘스천</span>
        </span>

        <p className="max-w-md text-parent-title leading-relaxed font-bold text-text">
          옛이야기 속 인물과 이야기를 나누며
          <br />
          아이가 자기 생각을 말로 꺼냅니다.
        </p>

        <p className="text-parent-body text-muted">
          {/* 일러스트가 도착하면 이 패널을 이미지로 교체한다. (assets.md §3-1) */}
          일러스트 준비 중
        </p>
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
            onClick={() => void signIn()}
            disabled={pending}
            className="mt-10 flex min-h-14 w-full items-center justify-center gap-3 rounded-pill bg-[#FEE500] px-6 text-parent-body font-bold text-[#191600] transition-all hover:brightness-105 disabled:opacity-70"
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

          {process.env.NODE_ENV === "development" ? (
            <button
              type="button"
              onClick={resetDemo}
              className="mt-10 text-sm text-muted underline"
            >
              데모 상태 초기화 (개발용)
            </button>
          ) : null}
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
