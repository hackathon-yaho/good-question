/**
 * 좌측 영역 — 캐릭터가 말하는 동안 (C-3 · C-7 · C-4 · C-5 · C-6)
 *
 * ── 대사를 좌측으로 옮겼다 ──────────────────────────────────────────
 * 예전에는 우측 패널의 말풍선이 대사를 들고 있었다. 그러면 아이의 시선이
 * "장면(좌) → 대사(우) → 마이크(우)"로 두 번 꺾인다. 대사를 캐릭터 얼굴 아래로
 * 옮기면 **누가 말하는지와 무엇을 말하는지가 한 덩어리로** 읽힌다.
 *
 * 배경은 장면 일러스트를 그대로 쓰되 **흐리게 하고 어둡게** 한다
 * (screens.md C-3 "장면 일러스트 정지, 85% 밝기"). 얼굴과 글자가 배경 위에서
 * 읽혀야 하기 때문이다.
 *
 * ⚠️ **C-9로 가는 통로가 여기 있다.** 밑줄 단어(`highlightWords`)를 탭하면 단어 뜻
 *    팝업이 열리고 거기서 단어장으로 담는다. 대사를 옮길 때 이 경로가 함께 오지
 *    않으면 단어장 기능이 조용히 죽는다.
 */

"use client";

import { ListeningBadge } from "@/components/ui/ListeningBadge";
import { PillButton } from "@/components/ui/PillButton";
import { CharacterPortrait } from "@/features/play/CharacterPortrait";
import { HighlightedText } from "@/features/play/HighlightedText";
import type { HighlightWord } from "@/lib/api/types";

type Props = {
  displayName: string;
  characterImageUrl?: string | null;
  backgroundImageUrl?: string | null;
  text: string;
  /** 캐릭터가 지금 말하고 있는지 — 링 맥동 + "말하는 중" 표시 */
  speaking: boolean;
  /** 장면 진행 — 좌측 상단 */
  progress?: { current: number; total: number };
  /** "장면 2" 같은 표시. 대사가 시작돼도 사라지지 않아야 한다 */
  sceneLabel?: string;
  turnCount?: number;
  maxTurns?: number;
  highlightWords?: readonly HighlightWord[];
  onWordClick?: (word: HighlightWord) => void;
  /** "다시 듣기". 재생 중에도 눌릴 수 있어야 한다 — panels.tsx의 주석 참조 */
  onReplay?: () => void;
  /** 아이 차례로 넘어간 뒤에는 대사를 흐리게 해 시선을 우측으로 보낸다 */
  dimmed?: boolean;
};

export function CharacterStage({
  displayName,
  characterImageUrl,
  backgroundImageUrl,
  text,
  speaking,
  progress,
  sceneLabel,
  turnCount,
  maxTurns,
  highlightWords = [],
  onWordClick,
  onReplay,
  dimmed = false,
}: Props) {
  return (
    <div className="relative size-full overflow-hidden bg-primary-soft">
      {/* 배경 — 흐리게. 얼굴·대사가 위에 올라간다 */}
      {backgroundImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- 이미지 도메인 미확정
        <img
          src={backgroundImageUrl}
          alt=""
          className="size-full scale-110 object-cover blur-sm brightness-85"
        />
      ) : (
        /* 에셋 미수령 표시는 **가운데를 비켜** 좌하단에 둔다. 가운데는 얼굴·대사가
           쓰는 자리이고, 거기에 겹치면 대사를 읽는 데 방해가 된다. */
        <div className="size-full bg-primary-soft">
          {/* 좌하단이 아니라 우하단이다 — 개발 모드 Next.js 인디케이터가 좌하단에 뜬다 */}
          <p className="absolute right-6 bottom-5 text-sm font-bold text-muted/70">
            장면 이미지 준비 중
          </p>
        </div>
      )}

      {/* 어둡게 덮는 것은 **이미지가 있을 때만**이다. 색면 폴백 위에 검정을 얹으면
          탁한 갈색이 되어 플레이스홀더인지 실제 배경인지 알 수 없다. */}
      {backgroundImageUrl ? (
        <div
          aria-hidden
          className={[
            "pointer-events-none absolute inset-0 transition-colors duration-500",
            dimmed ? "bg-text/45" : "bg-text/25",
          ].join(" ")}
        />
      ) : null}

      {/* 좌측 상단 — 장면 진행. 서술에서 대사로 넘어가도 같은 자리에 남는다 */}
      <div className="absolute top-6 left-6 flex items-center gap-3">
        {progress ? (
          <div className="flex items-center gap-2">
            {Array.from({ length: progress.total }, (_, i) => (
              <span
                key={i}
                className={[
                  "h-2 w-8 rounded-pill",
                  i < progress.current
                    ? backgroundImageUrl
                      ? "bg-white"
                      : "bg-primary"
                    : backgroundImageUrl
                      ? "bg-white/35"
                      : "bg-border",
                ].join(" ")}
              />
            ))}
          </div>
        ) : null}
        {sceneLabel ? (
          <span className="rounded-pill bg-surface/90 px-3 py-1 text-sm font-bold text-text">
            {sceneLabel}
          </span>
        ) : null}
      </div>

      {/* 우측 상단 — 턴 표시. 점수가 아니라 "몇 번 이야기했나"다.
          아직 한 번도 말하지 않았으면(0) 숨긴다 — "0 / 4"는 아무 뜻이 없다. */}
      {typeof turnCount === "number" && turnCount > 0 && maxTurns ? (
        <p className="absolute top-5 right-6 rounded-pill bg-text/40 px-4 py-1.5 text-parent-body font-bold text-white">
          {Math.min(turnCount, maxTurns)} / {maxTurns}
        </p>
      ) : null}

      {/* 가운데 — 얼굴 → 이름 → 대사 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-10">
        {speaking ? <ListeningBadge label="말하고 있어요" /> : null}

        <CharacterPortrait
          displayName={displayName}
          imageUrl={characterImageUrl}
          size={160}
          speaking={speaking}
        />

        <div className="flex items-center gap-2.5">
          {/* 이미지가 없으면 밝은 색면이라 흰 글씨가 안 읽힌다 */}
          <p
            className={[
              "text-kid-body font-bold",
              backgroundImageUrl ? "text-white drop-shadow" : "text-text",
            ].join(" ")}
          >
            {displayName}
          </p>
        </div>

        {/* ⚠️ 폭 상한을 이 래퍼가 아니라 **안쪽 <p>** 가 정한다. `em`·`ch`는 그 요소
            자신의 font-size로 계산되므로, 크기가 없는 래퍼에 걸면 루트 16px 기준이 되어
            의도의 절반이 된다. (max-w-[30ch]가 574px 의도에 285.9px로 나오던 원인) */}
        <div
          className={[
            "rounded-bubble bg-surface/95 px-7 py-5 shadow-soft transition-opacity",
            dimmed ? "opacity-70" : "",
          ].join(" ")}
        >
          <p className="kid-line text-center text-dialogue leading-snug font-bold text-text">
            {onWordClick && highlightWords.length > 0 ? (
              <HighlightedText
                text={text}
                words={highlightWords}
                onWordClick={onWordClick}
              />
            ) : (
              text
            )}
          </p>
        </div>

        {onReplay ? (
          <PillButton variant="outlined" onClick={onReplay}>
            다시 듣기
          </PillButton>
        ) : null}
      </div>
    </div>
  );
}
