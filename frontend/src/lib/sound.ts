/**
 * 효과음 — docs/spec/screens.md §1-5, C-4
 *
 * "캐릭터 발화가 끝나면 효과음과 화면 변화를 통해 아이가 말할 차례임을 안내한다." (PRD F-05)
 *
 * 음원 파일을 받지 못했으므로 WebAudio로 두 음 차임을 합성한다. (assets.md §3-5)
 * 파일이 도착하면 이 함수만 Audio 재생으로 바꾸면 된다.
 *
 * ⚠️ 브라우저 자동재생 정책 때문에 **첫 사용자 제스처 이후에만** 소리가 난다.
 *    C-1의 "다음" 버튼이 그 제스처 역할을 한다.
 */

let context: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    try {
      context = new AudioContext();
    } catch {
      return null;
    }
  }
  return context;
}

/** 아이 차례 안내 — 딩동 */
export function playTurnChime(volume = 0.6) {
  const ctx = getContext();
  if (!ctx) return;

  // 사용자 제스처 전에는 suspended 상태다. 재개를 시도하고 실패하면 조용히 넘어간다.
  void ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  // 딩(E5) → 동(A5)
  [
    { freq: 659.25, at: 0 },
    { freq: 880, at: 0.16 },
  ].forEach(({ freq, at }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, now + at);
    gain.gain.linearRampToValueAtTime(volume * 0.35, now + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + at + 0.3);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now + at);
    osc.stop(now + at + 0.32);
  });
}
