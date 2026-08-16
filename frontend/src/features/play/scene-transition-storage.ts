/**
 * C-12(장면 전환) 새로고침 복원 — sessionStorage
 *
 * dialogue 장면이 끝나면 서버가 `POST /messages` 응답 안에서 **이미 다음 장면으로
 * 세션을 옮겨 놓는다** (`PlayScreen.tsx`의 `advanceScene` 주석 · backend/docs/api-spec.md
 * 5.3·6.1). 그래서 이 화면(마무리 대사 + 별)을 보다가 새로고침하면, 다시 읽은 세션은
 * 이미 다음 장면이고 방금 본 별 화면은 서버 어디에도 남아있지 않아 되찾을 방법이 없다.
 *
 * 여기서는 화면을 다시 그리는 데 필요한 값 — 전부 서버가 이미 내려준 값이고
 * 새로 계산하는 것은 없다 — 을 브라우저에 잠깐 들고 있다가, 아이가 실제로
 * "계속하기"를 눌러 다음 장면으로 넘어갈 때 지운다.
 *
 * ⚠️ 새로고침에서만 쓰인다. 다른 기기·다른 세션에서는 안 보여도 된다 —
 *    그때는 지금처럼 다음 장면으로 곧장 진입한다(고치기 전과 같은 동작이다).
 */

import type { SceneInfo } from "@/lib/api/types";

export type PendingTransition = {
  /** 방금 닫힌 장면. 다음 장면이 아니라 **이 장면**의 캐릭터·이미지로 그려야 한다 */
  scene: SceneInfo;
  closingText: string;
  characterMessageId: string | null;
  accumulatedElements: string[];
  nextSceneId: string | null;
};

function storageKey(sessionId: string): string {
  return `gq:play:${sessionId}:transition`;
}

/** 시크릿 모드·저장공간 꽉 참 등으로 실패해도 화면은 그대로 동작해야 한다 — 복원만 못 할 뿐이다. */
export function saveTransition(sessionId: string, data: PendingTransition): void {
  try {
    sessionStorage.setItem(storageKey(sessionId), JSON.stringify(data));
  } catch {
    // 무시한다
  }
}

export function loadTransition(sessionId: string): PendingTransition | null {
  try {
    const raw = sessionStorage.getItem(storageKey(sessionId));
    return raw ? (JSON.parse(raw) as PendingTransition) : null;
  } catch {
    return null;
  }
}

export function clearTransition(sessionId: string): void {
  try {
    sessionStorage.removeItem(storageKey(sessionId));
  } catch {
    // 무시한다
  }
}
