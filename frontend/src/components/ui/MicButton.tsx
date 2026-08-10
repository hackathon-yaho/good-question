/**
 * MicButton — docs/spec/screens.md §1-6, C-4, D-5
 *
 * 크기: C-4는 180px, D-5는 200px, 비활성 상태는 96px.
 *
 * state 별 의미 (§1-5):
 *   idle      아이 차례. 마이크 활성, 아직 녹음 전
 *   recording 녹음 중. 웨이브폼 실시간 반응
 *   busy      변환 중(TRANSCRIBING). 녹음은 끝났고 STT 대기
 *   disabled  캐릭터 발화 중. 여기서 켜면 캐릭터 음성이 녹음된다
 */

"use client";

import { rem } from "@/lib/rem";

export type MicState = "idle" | "recording" | "busy" | "disabled";

type Props = {
  state: MicState;
  onClick?: () => void;
  /**
   * 지름. screens.md에 적힌 설계 px를 그대로 넣는다 (C-4 180, D-5 200, 비활성 96).
   * 내부에서 rem으로 바꿔 해상도에 비례하게 만든다.
   */
  size?: number;
  /** 0~1 정규화된 입력 레벨. 웨이브폼 바 높이에 쓴다. */
  level?: number;
};

const LABEL: Record<MicState, string> = {
  idle: "말하기 시작",
  recording: "말하는 중",
  busy: "듣고 있어요",
  disabled: "지금은 들을 차례예요",
};

export function MicButton({ state, onClick, size, level = 0 }: Props) {
  const disabled = state === "disabled" || state === "busy";
  const diameter = size ?? (disabled ? 96 : 180);

  return (
    <div className="relative flex items-center justify-center">
      {/* 동심원 펄스 링 2개 — idle/recording에서만 (§C-4) */}
      {!disabled ? (
        <>
          <span
            aria-hidden
            style={{ width: rem(diameter * 1.35), height: rem(diameter * 1.35) }}
            className="absolute animate-ping rounded-full bg-primary/20"
          />
          <span
            aria-hidden
            style={{ width: rem(diameter * 1.15), height: rem(diameter * 1.15) }}
            className="absolute rounded-full bg-primary/15"
          />
        </>
      ) : null}

      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={LABEL[state]}
        style={{ width: rem(diameter), height: rem(diameter) }}
        className={[
          "relative z-10 flex flex-col items-center justify-center gap-2 rounded-full transition-colors",
          disabled
            ? "cursor-not-allowed bg-border text-muted"
            : "bg-primary text-white hover:brightness-105",
        ].join(" ")}
      >
        <MicGlyph size={rem(diameter * 0.34)} />

        {/* 실시간 웨이브폼 바 */}
        {state === "recording" ? (
          <span aria-hidden className="flex items-end gap-1">
            {[0.4, 0.75, 1, 0.65, 0.35].map((weight, i) => (
              <span
                key={i}
                style={{
                  height: rem(
                    Math.max(4, weight * level * (diameter * 0.18)) + 4
                  ),
                }}
                className="w-1.5 rounded-pill bg-white/90 transition-[height] duration-75"
              />
            ))}
          </span>
        ) : null}

        {state === "busy" ? (
          <span aria-hidden className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{ animationDelay: `${i * 0.15}s` }}
                className="size-2 animate-bounce rounded-full bg-muted"
              />
            ))}
          </span>
        ) : null}
      </button>
    </div>
  );
}

function MicGlyph({ size }: { size: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
      <path d="M5 11v1a7 7 0 0 0 14 0v-1M12 19v3" />
    </svg>
  );
}
