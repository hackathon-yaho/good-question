/**
 * API 입구 — 화면은 여기서만 가져온다
 *
 * `NEXT_PUBLIC_API_MODE`로 목과 실서버를 고른다. 어느 쪽이 골라졌는지 화면 코드는
 * 모른다 — 인터페이스가 같기 때문이다(`types.ts`).
 *
 * ⚠️ 화면이 `mockXxxApi`를 직접 import하지 않도록 한다. 그러면 모드 스위치를
 *    지나치고 목이 실서버 빌드에 남는다. 고르는 곳은 이 파일 하나여야 한다.
 *
 * 목은 개발·검증용으로 남긴다. 백엔드가 죽어 있어도 화면을 만들 수 있고,
 * `npm run verify` 275건이 백엔드 없이 돈다.
 */

"use client";

import { API_MODE } from "@/lib/api/http";
import { activityApiClient, playApiClient } from "@/lib/api/client";
import { accountApiClient } from "@/lib/api/client-account";
import { contentApiClient } from "@/lib/api/client-content";
import { parentApiClient } from "@/lib/api/client-parent";
import { mockActivityApi, mockPlayApi } from "@/lib/api/mock";
import { mockAccountApi } from "@/lib/api/mock-account";
import { mockContentApi } from "@/lib/api/mock-content";
import { mockParentApi } from "@/lib/api/mock-parent";
import type {
  AccountApi,
  ActivityApi,
  ContentApi,
  ParentApi,
  PlayApi,
} from "@/lib/api/types";

const backend = API_MODE === "backend";

export const playApi: PlayApi = backend ? playApiClient : mockPlayApi;
export const activityApi: ActivityApi = backend
  ? activityApiClient
  : mockActivityApi;
export const accountApi: AccountApi = backend
  ? accountApiClient
  : mockAccountApi;
export const contentApi: ContentApi = backend
  ? contentApiClient
  : mockContentApi;
export const parentApi: ParentApi = backend ? parentApiClient : mockParentApi;

export { API_MODE };
