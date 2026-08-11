/**
 * 전역 404
 *
 * 아직 만들지 않은 화면(B-2·B-3·E·F·G·H)으로 가는 링크가 명세대로 살아 있다.
 * 기본 404를 그대로 두면 시연 중에 "고장난 화면"으로 보인다. 준비 중임을 알리고
 * 되돌아갈 길을 준다.
 */

import Link from "next/link";

import { CenteredShell } from "@/components/shells/CenteredShell";

export default function NotFound() {
  return (
    <CenteredShell width="narrow" centerY>
      <div className="flex flex-col items-center gap-5 text-center">
        <span aria-hidden className="text-5xl">
          🚧
        </span>
        <h1 className="text-parent-title font-bold text-text">
          아직 준비 중인 화면이에요
        </h1>
        <p className="text-parent-body text-muted">
          곧 만나요. 홈으로 돌아가서 이야기를 계속해 주세요.
        </p>
        <Link
          href="/home"
          className="mt-2 inline-flex min-h-touch items-center rounded-pill bg-primary px-6 text-parent-body font-bold text-white"
        >
          홈으로 가기
        </Link>
      </div>
    </CenteredShell>
  );
}
