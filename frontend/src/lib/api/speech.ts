/**
 * 음성 엔드포인트 — docs/request/frontend/stt-tts-integration.md
 *
 *   ① POST /api/stt              오디오 → 텍스트        최대 8초
 *   ③ GET  /api/tts?messageId=   대사 → 오디오
 *
 * ②(`POST /messages`)는 대화 계약이라 `mock.ts`/`PlayApi` 쪽에 있다.
 *
 * ⚠️ **원본 오디오를 저장하지 않는다.** 여기서 Blob을 만들어 바로 올리고 참조를 버린다.
 *    localStorage·IndexedDB·파일로 남기는 경로가 없다. (PRD 10.3)
 */

import { ApiError } from "@/lib/api/errors";
import { API_BASE } from "@/lib/api/http";

/** ① 변환 예산. 요청 문서 "최대 8초" */
export const STT_TIMEOUT_MS = 8_000;
/** ② 응답 예산. 요청 문서 "최대 10초" */
export const RESPOND_TIMEOUT_MS = 10_000;

/**
 * ① 오디오 업로드 → 텍스트.
 *
 * 반환값이 **빈 문자열일 수 있다.** 인식 결과가 없다는 뜻이고, 이때 ②를 부르면
 * 안 된다. 호출부가 I-2로 보낸다.
 *
 * 포맷은 브라우저 기본값 그대로 보낸다. Chrome은 webm, iOS Safari는 mp4를 주는데
 * 백엔드가 그대로 Whisper에 넘긴다. (요청 문서 "녹음" 절)
 */
export async function transcribeAudio(
  audio: Blob,
  signal?: AbortSignal
): Promise<string> {
  const form = new FormData();
  // 파트 이름은 `audio`로 고정이다. 확장자는 MIME에서 뽑아 붙인다 —
  // Whisper가 파일명 확장자로 컨테이너를 판단하는 경우가 있다.
  form.append("audio", audio, `utterance.${extensionOf(audio.type)}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/stt`, {
      method: "POST",
      credentials: "include",
      body: form,
      signal,
    });
  } catch (error) {
    // AbortController로 끊은 것은 타임아웃이다. 네트워크 장애와 구분해야
    // 호출부가 I-3(재시도)과 I-2(다시 말하기)를 나눠 띄울 수 있다.
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("TIMEOUT", "변환이 제 시간에 끝나지 않았습니다");
    }
    throw new ApiError("NETWORK", "백엔드에 연결할 수 없습니다");
  }

  if (!response.ok) {
    throw new ApiError(
      response.status === 401 ? "UNAUTHORIZED" : "UNKNOWN",
      `STT 실패 (${response.status})`
    );
  }

  const parsed = (await response.json()) as { text?: unknown };
  return typeof parsed.text === "string" ? parsed.text : "";
}

/**
 * ③ 대사 오디오 URL.
 *
 * `messageId`가 있으면 그것으로 캐시를 탄다. 없는 대사(도입·전개 내레이션,
 * 단어 발음)는 텍스트로 요청한다 — 백엔드에 추가 요청해 둔 경로다.
 * (docs/request/backend/tts-text-endpoint.md)
 */
export function ttsUrl(cue: { text: string; messageId?: string | null }): string {
  const params = new URLSearchParams();
  if (cue.messageId) params.set("messageId", cue.messageId);
  else params.set("text", cue.text);
  return `${API_BASE}/tts?${params.toString()}`;
}

function extensionOf(mimeType: string): string {
  // "audio/webm;codecs=opus" → "webm"
  const subtype = mimeType.split(";")[0]?.split("/")[1] ?? "";
  if (subtype.includes("mp4")) return "mp4";
  if (subtype.includes("mpeg")) return "mp3";
  if (subtype.includes("webm")) return "webm";
  if (subtype.includes("ogg")) return "ogg";
  if (subtype.includes("wav")) return "wav";
  // 알 수 없으면 webm으로 둔다. Chrome 기본값이고, 백엔드가 실제 바이트를 본다.
  return "webm";
}
