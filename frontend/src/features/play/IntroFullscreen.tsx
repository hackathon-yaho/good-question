/**
 * C-1 도입 전체화면 — docs/spec/screens.md C-1
 *
 * 풀브리드. 좌우 분할이 아니다.
 * 마이크 UI를 화면 어디에도 노출하지 않는다. 아이가 지금은 "들을 시간"임을 명확히 한다.
 */

"use client";

import { ListeningBadge } from "@/components/ui/ListeningBadge";
import { PillButton } from "@/components/ui/PillButton";

type Props = {
  sentence: string;
  index: number;
  total: number;
  backgroundImageUrl?: string | null;
  onNext: () => void;
  onExit: () => void;
  /** 아직 사용자 제스처가 없어 TTS가 차단되는 상태 */
  needsStart: boolean;
  onStart: () => void;
  onReplay: () => void;
};

export function IntroFullscreen({
  sentence,
  index,
  total,
  backgroundImageUrl,
  onNext,
  onExit,
  needsStart,
  onStart,
  onReplay,
}: Props) {
  return (
    <div className="relative size-full overflow-hidden bg-primary-soft">
      {backgroundImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- 이미지 도메인 미확정
        <img src={backgroundImageUrl} alt="" className="size-full object-contain" />
      ) : (
        <div className="flex size-full items-center justify-center">
          <p className="text-kid-body font-bold text-muted">
            도입 이미지 준비 중
          </p>
        </div>
      )}

      <button
        onClick={onExit}
        aria-label="이야기 나가기"
        className="absolute top-6 left-6 z-10 flex size-touch-kid items-center justify-center rounded-full bg-surface/90 text-2xl text-muted hover:bg-surface"
      >
        ✕
      </button>

      <div className="absolute top-8 right-8 z-10 flex gap-2">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={[
              "size-3 rounded-full transition-colors",
              i <= index ? "bg-primary" : "bg-surface/70",
            ].join(" ")}
          />
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-text/85 to-transparent px-12 pt-32 pb-12">
        {/* 웨이브 → 라벨 → 자막 → [다시 듣기][다음] 순서다. C-3(얼굴 → 이름 → 대사 →
            다시 듣기)과 같은 순서로 맞췄다. 라벨과 자막 사이에 버튼을 끼우면
            "듣고 있다 → 무슨 내용" 흐름이 끊긴다.
            ⚠️ 폭 상한은 래퍼가 아니라 **자막 <p>** 가 갖는다. (`.kid-line` 주석 참조) */}
        <div className="flex flex-col items-center gap-5">
          <ListeningBadge layout="stacked" />

          <p className="kid-line text-center text-intro leading-relaxed font-bold text-white">
            {sentence}
          </p>

          {index >= total - 1 ? (
            <PillButton size="kid" onClick={onNext}>
              이야기 시작하기
            </PillButton>
          ) : null}
        </div>
      </div>

      {/*
        브라우저 자동재생 정책 때문에 사용자 제스처 없이는 TTS가 차단된다.
        화면 명세 C-1은 "진입 즉시 자동 재생"이지만 정책이 우선한다.
        이야기 상세(B-3)에서 넘어오면 제스처가 이어지지만, 주소를 직접 입력해
        들어오면 첫 문장이 무음이 된다. 그래서 한 번 탭하게 한다.
      */}
      {needsStart ? (
        <button
          onClick={onStart}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 bg-text/70 text-white"
        >
          <span aria-hidden className="text-6xl">
            🔊
          </span>
          <span className="text-intro font-bold">탭하면 이야기가 시작돼요</span>
          <span className="text-kid-body text-white/80">
            소리가 나오니 볼륨을 확인해 주세요
          </span>
        </button>
      ) : null}
    </div>
  );
}
