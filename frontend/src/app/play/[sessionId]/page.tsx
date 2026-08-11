/**
 * /play/{sessionId} — docs/spec/screens.md §C
 *
 * C-1 ~ C-7, C-12는 이 **한 페이지의 상태**다. 라우트를 더 만들지 않는다.
 * 페이지를 새로 그리면 TTS가 끊기고 애니메이션이 튄다. (§0-1)
 *
 * 라우트 가드(§2): 마이크 권한은 MicGate가 본다. B-3에서 들어오는 정상 경로에서는
 * 이미 확인이 끝나 통과하고, 주소를 직접 입력한 경우에만 I-1/I-4가 뜬다.
 *
 * TODO 로그인·아이 선택·child_consents 가드는 서버 세션이 붙어야 제대로 걸 수 있다.
 *      (open-questions Q-01) 동의 가드가 빠지면 요건 위반이므로 백엔드에서도 막는다.
 */

import { MicGate } from "@/features/system/MicGate";
import { PlayScreen } from "@/features/play/PlayScreen";

export default async function PlayPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  // 서버 구현체는 PlayScreen이 클라이언트에서 직접 고른다.
  // 메서드를 가진 객체는 서버 → 클라이언트 prop으로 넘길 수 없다.
  return (
    <MicGate>
      <PlayScreen sessionId={sessionId} />
    </MicGate>
  );
}
