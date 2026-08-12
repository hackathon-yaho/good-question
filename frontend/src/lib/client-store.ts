/**
 * 브라우저 보관소 — docs/spec/screens.md §A
 *
 * 여기 있는 값은 **서버 상태가 아니다.** 선택한 아이는 나중에 서버 세션으로 옮긴다.
 *
 * ⚠️ **토큰은 여기 없다.** JWT가 HttpOnly 쿠키로 오면서 프론트가 토큰을 보관하지
 *    않는다. 로그인 여부는 `GET /api/auth/me`가 답한다.
 *    (docs/request/frontend/kakao-login-flow.md)
 *
 * 지금 localStorage에 남은 것은 화면 상태뿐이다.
 *   - A-5 체크리스트: "선택한 childId가 새로고침 후에도 유지되는지"
 *   - A-3 → A-4 동의 값 임시 보관
 *
 * ⚠️ 읽기는 반드시 클라이언트에서만 한다. 서버 렌더 중에 부르면 window가 없다.
 */

"use client";

import { useSyncExternalStore } from "react";

const CHILD_KEY = "gq.selectedChildId";
/** A-3 → A-4 동의 값 임시 보관. 탭을 닫으면 사라져야 하므로 sessionStorage다. */
const CONSENT_KEY = "gq.consentDraft";

import type { ConsentValues } from "@/lib/api/types";

function read(storage: "local" | "session", key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const store = storage === "local" ? window.localStorage : window.sessionStorage;
    return store.getItem(key);
  } catch {
    // 시크릿 모드에서 storage 접근이 막힐 수 있다. 없는 것으로 취급한다.
    return null;
  }
}

function write(storage: "local" | "session", key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    const store = storage === "local" ? window.localStorage : window.sessionStorage;
    if (value === null) store.removeItem(key);
    else store.setItem(key, value);
  } catch {
    // 저장에 실패해도 화면은 계속 동작해야 한다.
  }
}

export function getSelectedChildId(): string | null {
  return read("local", CHILD_KEY);
}

/**
 * 선택한 아이. 이 값이 **B·C·D·E·F 전 화면의 기준**이 된다. (A-5)
 * 아이를 바꾸면 진행 중 세션도 다른 아이의 것이므로 화면을 다시 불러야 한다.
 */
export function setSelectedChildId(childId: string | null) {
  write("local", CHILD_KEY, childId);
}

export function getConsentDraft(): ConsentValues | null {
  const raw = read("session", CONSENT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ConsentValues>;
    // 필수 3개가 true가 아니면 유효한 동의가 아니다. 없는 것으로 본다.
    if (
      parsed.termsOfService !== true ||
      parsed.privacyPolicy !== true ||
      parsed.childDataProcessing !== true
    ) {
      return null;
    }
    return {
      termsOfService: true,
      privacyPolicy: true,
      childDataProcessing: true,
      marketing: parsed.marketing === true,
    };
  } catch {
    return null;
  }
}

export function setConsentDraft(consents: ConsentValues | null) {
  write("session", CONSENT_KEY, consents ? JSON.stringify(consents) : null);
}

/**
 * 선택된 아이를 렌더 중에 안전하게 읽는다.
 *
 * 이펙트에서 setState로 옮겨 담으면 연쇄 렌더가 나고 React 19 린트가 막는다
 * (`react-hooks/set-state-in-effect`). useSyncExternalStore는 서버 스냅샷과
 * 클라이언트 스냅샷을 나눠 주므로 하이드레이션 불일치 없이 읽을 수 있다.
 *
 * 반환값 세 가지를 구분해야 한다.
 *   `undefined` — 아직 모른다(서버 렌더·하이드레이션 중). 판단을 미룬다
 *   `null`      — 선택된 아이가 없다. /profiles로 보낸다
 *   문자열      — 선택된 childId
 */
export function useSelectedChildId(): string | null | undefined {
  return useSyncExternalStore(
    subscribeToStorage,
    () => getSelectedChildId(),
    () => undefined
  );
}

/** 다른 탭에서 아이를 바꾸면 이 탭도 따라가야 한다. */
function subscribeToStorage(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** 로그아웃 · 데모 초기화 */
export function clearClientStore() {
  setSelectedChildId(null);
  setConsentDraft(null);
}
