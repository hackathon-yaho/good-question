/**
 * /play/{sessionId} — docs/spec/screens.md §C
 *
 * C-1 ~ C-7, C-12는 이 **한 페이지의 상태**다. 라우트를 더 만들지 않는다.
 * 페이지를 새로 그리면 TTS가 끊기고 애니메이션이 튄다. (§0-1)
 *
 * TODO 라우트 가드 — 로그인 + 아이 선택 + child_consents 유효 + 마이크 권한.
 *      인증 방식이 확정되면(open-questions Q-01) 붙인다. 동의 가드가 빠지면 요건 위반이다.
 */

import { PlayScreen } from "@/features/play/PlayScreen";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  // 서버 구현체는 PlayScreen이 클라이언트에서 직접 고른다.
  // 메서드를 가진 객체는 서버 → 클라이언트 prop으로 넘길 수 없다.
  return <PlayScreen sessionId={sessionId} />;
}
