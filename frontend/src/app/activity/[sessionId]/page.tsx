/**
 * /activity/{sessionId} — 말하기 후 활동 (D-1 ~ D-7)
 *
 * D-1 ~ D-7은 이 한 페이지의 단계다. 라우트를 더 만들지 않는다. (§0-1)
 * /play의 마지막 장면이 여기로 넘어온다.
 *
 * TODO 라우트 가드 — /play와 동일 조건. 인증 방식 확정 후 붙인다. (Q-01)
 */

import { ActivityScreen } from "@/features/activity/ActivityScreen";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  // 서버 구현체는 ActivityScreen이 클라이언트에서 고른다.
  // 메서드를 가진 객체는 서버 → 클라이언트 prop으로 넘길 수 없다.
  return <ActivityScreen sessionId={sessionId} />;
}
