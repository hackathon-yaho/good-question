import { Suspense } from "react";

import { AuthCallbackScreen } from "@/features/account/AuthCallbackScreen";

export const metadata = { title: "로그인 중 — 굿퀘스천" };

export default function AuthCallbackPage() {
  // useSearchParams를 쓰는 클라이언트 컴포넌트는 Suspense 경계가 필요하다.
  return (
    <Suspense fallback={null}>
      <AuthCallbackScreen />
    </Suspense>
  );
}
