/**
 * C-13 일시정지 시트 — docs/spec/screens.md C-13
 *
 * 어느 상태에서든 열린다. 진입 시 TTS를 즉시 멈추고, 녹음 중이면 중단한다.
 * "이야기 나가기"는 세션을 stopped로 저장한 뒤 /home으로 보낸다.
 */

"use client";

import { Modal } from "@/components/ui/Modal";
import { PillButton } from "@/components/ui/PillButton";
import type { TtsRate } from "@/lib/speech";

export type FontScale = 1 | 1.15 | 1.3;

export type PlaySettings = {
  volume: number;
  rate: TtsRate;
  /** 글씨 크기 배수. 루트 font-size에 곱해진다. */
  fontScale: FontScale;
};

export const DEFAULT_PLAY_SETTINGS: PlaySettings = {
  volume: 1,
  rate: "normal",
  fontScale: 1,
};

const RATE_OPTIONS: { value: TtsRate; label: string }[] = [
  { value: "slow", label: "느리게" },
  { value: "normal", label: "보통" },
  { value: "fast", label: "빠르게" },
];

const FONT_OPTIONS: { value: FontScale; label: string }[] = [
  { value: 1, label: "보통" },
  { value: 1.15, label: "크게" },
  { value: 1.3, label: "아주 크게" },
];

/** 세그먼트 3단 컨트롤. 말하기 속도·글씨 크기가 같은 모양을 쓴다. */
function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-parent-body font-bold">{label}</span>
      <div className="flex gap-2">
        {options.map((option) => (
          <button
            key={String(option.value)}
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={[
              "min-h-touch flex-1 rounded-pill text-parent-body font-bold transition-colors",
              value === option.value
                ? "bg-primary text-white"
                : "border border-border bg-surface text-muted",
            ].join(" ")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type Props = {
  open: boolean;
  settings: PlaySettings;
  onChange: (settings: PlaySettings) => void;
  onResume: () => void;
  onExit: () => void;
};

export function PauseSheet({
  open,
  settings,
  onChange,
  onResume,
  onExit,
}: Props) {
  return (
    <Modal open={open} onClose={onResume} width={620} label="잠시 멈춤">
      <h2 className="mb-6 text-parent-title font-bold">잠시 멈췄어요</h2>

      <div className="flex flex-col gap-6">
        <label className="flex flex-col gap-2">
          <span className="text-parent-body font-bold">소리 크기</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={settings.volume}
            onChange={(event) =>
              onChange({ ...settings, volume: Number(event.target.value) })
            }
            className="accent-primary"
          />
        </label>

        <Segmented
          label="말하기 속도"
          options={RATE_OPTIONS}
          value={settings.rate}
          onChange={(rate) => onChange({ ...settings, rate })}
        />

        {/* 토큰을 rem으로 바꾸면서 살아난 기능이다. 루트 font-size에 배수를 곱하면
            C·D 화면의 글자·버튼·마이크가 함께 커진다. */}
        <Segmented
          label="글씨 크기"
          options={FONT_OPTIONS}
          value={settings.fontScale}
          onChange={(fontScale) => onChange({ ...settings, fontScale })}
        />
      </div>

      <div className="mt-8 flex gap-3">
        <PillButton variant="outlined" className="basis-2/5" onClick={onExit}>
          이야기 나가기
        </PillButton>
        <PillButton className="basis-3/5" onClick={onResume}>
          이어서 하기
        </PillButton>
      </div>
    </Modal>
  );
}
