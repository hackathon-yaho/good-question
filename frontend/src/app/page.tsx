/**
 * A-1 스플래시 — docs/spec/screens.md §A
 *
 * 라우트: /
 * 진입 즉시 세션 토큰을 확인해 /profiles 또는 /login으로 보낸다.
 * 최소 노출 시간 800ms를 보장해 화면이 깜빡이지 않게 한다.
 *
 * TODO 인증 방식이 확정되면(open-questions Q-01) 세션 확인 로직을 붙인다.
 *      지금은 화면만 그린다.
 */

import { CenteredShell } from "@/components/shells/CenteredShell";

export default function SplashPage() {
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
