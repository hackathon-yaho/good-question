import { Suspense } from "react";

import { ReportDetailScreen } from "@/features/parent/ReportDetailScreen";

export const metadata = { title: "리포트 상세 — 굿퀘스천" };

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  // useSearchParams를 쓰는 클라이언트 컴포넌트는 Suspense 경계가 필요하다.
  return (
    <Suspense fallback={null}>
      <ReportDetailScreen sessionId={sessionId} />
    </Suspense>
  );
}
