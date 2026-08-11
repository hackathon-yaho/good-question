/**
 * D-2 카드 순서 배열 — docs/spec/screens.md D-2
 *
 * 드래그&드롭이 **필수**다. 인터뷰에서 저연령 아동의 터치·드래그 요구가 나왔다.
 * HTML5 Drag and Drop API는 터치에서 동작하지 않으므로 Pointer Events로 구현한다.
 * 태블릿까지 지원 범위에 들어왔으므로 마우스·터치 양쪽이 되어야 한다.
 *
 * 드래그가 어려운 아이를 위해 **탭으로도 배치**할 수 있게 했다.
 *   카드 탭 → 첫 빈 칸에 들어간다
 *   슬롯 탭 → 카드가 트레이로 돌아온다
 *
 * ⚠️ 정답 순서를 알지 못한다. 서버가 채점한다. (§0-2, PRD 8.11)
 */

"use client";

import { useCallback, useRef, useState } from "react";
import { PillButton } from "@/components/ui/PillButton";
import type { ActivityCard } from "@/lib/api/types";

type Props = {
  tray: readonly ActivityCard[];
  slots: readonly (ActivityCard | null)[];
  attemptCount: number;
  hintCardId: string | null;
  submitting: boolean;
  canSubmit: boolean;
  onPlace: (cardId: string, slotIndex: number) => void;
  onRemove: (slotIndex: number) => void;
  onSubmit: () => void;
};

export function CardOrdering({
  tray,
  slots,
  attemptCount,
  hintCardId,
  submitting,
  canSubmit,
  onPlace,
  onRemove,
  onSubmit,
}: Props) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);
  const movedRef = useRef(false);

  /** 포인터 위치 아래의 슬롯 인덱스를 찾는다. */
  const slotUnder = useCallback((x: number, y: number): number | null => {
    const el = document
      .elementsFromPoint(x, y)
      .find((node) => node instanceof HTMLElement && node.dataset.slotIndex);
    if (!(el instanceof HTMLElement)) return null;
    const index = Number(el.dataset.slotIndex);
    return Number.isInteger(index) ? index : null;
  }, []);

  const handlePointerDown = (cardId: string) => (event: React.PointerEvent) => {
    // 포인터를 이 요소에 붙여둔다. 손가락이 카드 밖으로 나가도 이벤트가 계속 온다.
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(cardId);
    movedRef.current = false;
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!dragging) return;
    movedRef.current = true;
    setHoverSlot(slotUnder(event.clientX, event.clientY));
  };

  const handlePointerUp = (cardId: string) => (event: React.PointerEvent) => {
    if (!dragging) return;

    const target = slotUnder(event.clientX, event.clientY);
    if (target !== null) {
      onPlace(cardId, target);
    } else if (!movedRef.current) {
      // 드래그 없이 탭한 경우 — 첫 빈 칸에 넣는다.
      const empty = slots.findIndex((slot) => slot === null);
      if (empty >= 0) onPlace(cardId, empty);
    }

    setDragging(null);
    setHoverSlot(null);
  };

  return (
    <div className="flex size-full flex-col items-center gap-6 px-10 py-8">
      <header className="flex items-center gap-3">
        <h1 className="text-narration font-bold text-text">
          이야기 순서대로 놓아볼까?
        </h1>
        {attemptCount > 0 ? (
          <span className="rounded-pill bg-accent-soft px-4 py-1 text-parent-body font-bold text-text">
            {attemptCount + 1}번째 시도
          </span>
        ) : null}
      </header>

      {/* 슬롯 4칸 */}
      <ol className="flex w-full items-stretch justify-center gap-4">
        {slots.map((card, index) => {
          const active = hoverSlot === index;
          return (
            <li key={index} className="flex flex-col items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-parent-body font-bold text-text">
                {index + 1}
              </span>
              <div
                data-slot-index={index}
                onClick={() => card && onRemove(index)}
                className={[
                  "flex h-[11.25rem] w-[15rem] items-center justify-center rounded-card p-3 text-center transition-colors",
                  card
                    ? "cursor-pointer border-2 border-secondary bg-secondary-soft"
                    : "border-2 border-dashed border-border bg-surface",
                  active ? "border-primary bg-primary-soft" : "",
                ].join(" ")}
              >
                {card ? (
                  <span className="text-parent-body leading-snug font-bold text-text">
                    {card.text}
                  </span>
                ) : (
                  <span className="text-parent-body text-muted">여기에 놓아줘</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* 카드 트레이 */}
      <div className="flex min-h-[13rem] w-full flex-wrap items-center justify-center gap-4 rounded-card bg-accent-soft p-5">
        {tray.length === 0 ? (
          <p className="text-parent-body text-muted">
            카드를 다 놓았어! 확인해 볼까?
          </p>
        ) : (
          tray.map((card, i) => (
            <button
              key={card.id}
              onPointerDown={handlePointerDown(card.id)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp(card.id)}
              onPointerCancel={() => {
                setDragging(null);
                setHoverSlot(null);
              }}
              style={{ rotate: `${(i % 2 === 0 ? -1 : 1) * 1.5}deg` }}
              className={[
                // touch-action:none 이 없으면 터치 드래그가 스크롤로 먹힌다.
                "flex h-[11.25rem] w-[15rem] touch-none items-center justify-center rounded-card border-2 p-3 text-center transition-shadow select-none",
                dragging === card.id
                  ? "scale-105 border-primary bg-surface shadow-soft"
                  : "border-border bg-surface",
                hintCardId === card.id
                  ? "border-accent ring-4 ring-accent/50"
                  : "",
              ].join(" ")}
            >
              <span className="text-parent-body leading-snug font-bold text-text">
                {card.text}
              </span>
            </button>
          ))
        )}
      </div>

      <p className="text-parent-body text-muted">
        카드를 끌어다 놓거나, 톡 눌러도 돼
      </p>

      <PillButton
        size="kid-lg"
        onClick={onSubmit}
        disabled={!canSubmit || submitting}
      >
        확인하기
      </PillButton>
    </div>
  );
}
