/**
 * 마이크 권한 — docs/spec/screens.md I-1 · I-4, §2 라우트 가드
 *
 * 이 서비스는 목소리가 입력 수단 전부다. 권한이 없으면 아무것도 할 수 없어서
 * 명세도 "건너뛰기 옵션 없음"으로 못 박았다.
 *
 * ⚠️ getUserMedia로 얻은 스트림은 **즉시 끊는다.**
 *    Web Speech API가 자기 스트림을 따로 열기 때문에 여기서 붙잡고 있을 이유가 없고,
 *    붙잡고 있으면 탭에 녹음 표시가 계속 떠서 아이·보호자가 불안해한다.
 *    원본 음성을 다루지 않는다는 정책(PRD 10.3)과도 어긋나 보인다.
 */

export type MicPermission =
  | "granted"
  | "prompt"
  | "denied"
  /** Permissions API가 없거나 microphone을 모른다. 물어봐야 안다. */
  | "unsupported";

export function isMicSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

/**
 * 사전 확인. 명세 B-3 체크리스트가 요구하는 대로 권한 창을 띄우지 않고 상태만 본다.
 * Safari·Firefox는 `microphone`을 모르므로 "unsupported"가 나온다. 그때는 물어본다.
 */
export async function queryMicPermission(): Promise<MicPermission> {
  if (!isMicSupported()) return "unsupported";
  if (typeof navigator.permissions?.query !== "function") return "unsupported";

  try {
    const status = await navigator.permissions.query({
      name: "microphone" as PermissionName,
    });
    if (status.state === "granted" || status.state === "denied") {
      return status.state;
    }
    return "prompt";
  } catch {
    return "unsupported";
  }
}

/** I-1 "마이크 켜기". 성공하면 true, 거부되면 false(→ I-4). */
export async function requestMic(): Promise<boolean> {
  if (!isMicSupported()) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    for (const track of stream.getTracks()) track.stop();
    return true;
  } catch {
    return false;
  }
}
