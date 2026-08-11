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
 *
 * ── adaptive: 공간이 좁으면 줄어든다 ────────────────────────────────
 * `adaptive`를 켜면 설계 크기를 **상한**으로 쓰고 부모가 좁으면 작아진다.
 * 미션 카드가 열려 우측 패널이 좁아질 때 마이크가 줄지 않아 말풍선과 푸터 위로
 * 삐져나와 겹쳤기 때문이다. flex 중앙 정렬은 내용이 넘칠 때 위아래로 삐져나간다.
 *
 * ⚠️ **기본값은 false다.** adaptive는 `height: min(100%, …)`를 쓰므로 부모 높이가
 *    정해져 있어야 한다. 높이가 auto인 푸터 안에서 켜면 순환 참조가 되어 부모가
 *    엉뚱하게 부풀어 오른다(실제로 C-3 푸터가 130px → 354px로 늘어났다).
 *    쓰는 곳은 C-4처럼 **높이가 확정된 flex 칸** 안뿐이다.
 *
 * 내부 요소(펄스 링·글리프·웨이브폼)는 전부 **비율**로 잡는다. 지름과 따로
 * 계산하면 마이크가 줄었을 때 안쪽이 원을 뚫고 나온다.
 *
 * adaptive에서는 §1-4의 72px 하한을 지킨다. 그보다 좁으면 부모가 잘라내는 편이,
 * 누를 수 없는 버튼을 그리는 것보다 낫다.
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
  /**
   * 부모가 좁으면 줄어들게 할지. **부모 높이가 확정된 곳에서만** 켠다.
   * 위 주석의 경고 참조.
   */
  adaptive?: boolean;
};

/** 클릭 타겟 하한 — C·D 화면 72px (§1-4) */
const MIN_TOUCH_PX = 72;

const LABEL: Record<MicState, string> = {
  idle: "말하기 시작",
  recording: "말하는 중",
  busy: "듣고 있어요",
  disabled: "지금은 들을 차례예요",
};

export function MicButton({
  state,
  onClick,
  size,
  level = 0,
  adaptive = false,
}: Props) {
  const disabled = state === "disabled" || state === "busy";
  const diameter = size ?? (disabled ? 96 : 180);

  return (
    <div
      style={
        adaptive
          ? {
              // 높이를 먼저 정하고 aspect-square로 폭을 따라오게 한다.
              // width와 maxHeight를 따로 주면 좁아질 때 폭만 남아 **타원**이 된다.
              height: `min(100%, ${rem(diameter)})`,
              maxWidth: "100%",
              minHeight: rem(MIN_TOUCH_PX),
            }
          : { width: rem(diameter), height: rem(diameter) }
      }
      className="relative flex aspect-square shrink-0 items-center justify-center"
    >
      {/* 동심원 펄스 링 2개 — idle/recording에서만 (§C-4)
          비율(-inset-%)로 잡아야 마이크가 줄어들 때 함께 줄어든다. */}
      {!disabled ? (
        <>
          <span
            aria-hidden
            className="absolute -inset-[17.5%] animate-ping rounded-full bg-primary/20"
          />
          <span
            aria-hidden
            className="absolute -inset-[7.5%] rounded-full bg-primary/15"
          />
        </>
      ) : null}

      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={LABEL[state]}
        className={[
          "relative z-10 flex size-full flex-col items-center justify-center gap-[4%] rounded-full transition-colors",
          disabled
            ? "cursor-not-allowed bg-border text-muted"
            : "bg-primary text-white hover:brightness-105",
        ].join(" ")}
      >
        <MicGlyph />

        {/* 실시간 웨이브폼 바. 높이를 원 지름의 비율로 잡는다. */}
        {state === "recording" ? (
          <span aria-hidden className="flex h-[18%] items-end gap-[2%]">
            {[0.4, 0.75, 1, 0.65, 0.35].map((weight, i) => (
              <span
                key={i}
                style={{
                  height: `${Math.max(18, weight * level * 100)}%`,
                }}
                className="w-[6%] min-w-0.5 rounded-pill bg-white/90 transition-[height] duration-75"
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

/** 글리프도 비율이다. 지름과 따로 계산하면 원을 뚫고 나온다. */
function MicGlyph() {
  return (
    <svg
      className="h-[34%] w-[34%]"
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
