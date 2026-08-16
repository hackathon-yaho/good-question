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

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { PillButton } from "@/components/ui/PillButton";
import type { ActivityCard } from "@/lib/api/types";
import { getActivityCardImage } from "@/lib/story-images";

type Props = {
  tray: readonly ActivityCard[];
  slots: readonly (ActivityCard | null)[];
  attemptCount: number;
  /**
   * 방금 제출이 오답이었는지. **확인하기를 누른 뒤에만** 켠다 — 실시간으로 표시하면
   * 아이가 카드를 옮기는 동안 계속 지적받는 느낌이 된다.
   *
   * ⚠️ 서버는 **어느 카드가 틀렸는지 알려주지 않는다**(`hintCardId` 없음).
   *    특정 카드만 짚으면 정답을 역산해 주는 셈이고 프론트가 정답을 모른다는
   *    원칙(§0-2)에도 어긋난다. 그래서 배치 전체를 표시한다.
   */
  mismatched?: boolean;
  /**
   * 칸별 정오. 서버가 `slotResults`를 실어 보냈을 때만 값이 있다.
   * 있으면 **틀린 칸만** 표시하고, 맞은 칸은 현재 테두리를 유지한다.
   * (docs/request/backend/order-slot-results.md · 계획 D20)
   */
  slotResults?: readonly boolean[] | null;
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
  mismatched = false,
  slotResults = null,
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
    <div className="flex size-full flex-col items-center justify-center gap-6 px-10 py-8">
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
          const hasResult = slotResults !== null;
          const wrong = Boolean(
            card && (slotResults ? slotResults[index] === false : mismatched)
          );
          const correct = Boolean(
            card && hasResult && slotResults?.[index] === true
          );

          // slotResults가 없으면(orderMismatched만 있음) 배치 전체 오답이므로
          // 빨간 테두리를 표시하지 않고 점선 유지 + 피드백 모달로만 알린다.
          const showWrong = wrong && slotResults !== null;
          const tone = active
            ? "ring-2 ring-primary bg-transparent"
            : !card
              ? "border-2 border-dashed border-border bg-transparent"
              : showWrong
                ? "border-2 border-danger bg-transparent"
                : correct
                  ? "border-2 border-secondary bg-transparent"
                  : "border-2 border-dashed border-border bg-transparent";
          return (
            <li key={index} className="flex flex-col items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-parent-body font-bold text-text">
                {index + 1}
              </span>
              <div
                data-slot-index={index}
                aria-label={card ? card.text : `${index + 1}번 자리 (비어 있음)`}
                data-mismatched={wrong ? "1" : undefined}
                onClick={() => card && onRemove(index)}
                className={[
                  "relative flex h-[11.25rem] w-[15rem] items-center justify-center overflow-hidden rounded-card p-3 text-center transition-colors",
                  card ? "cursor-pointer" : "",
                  tone,
                ].join(" ")}
              >
                {card ? (
                  <Image
                    src={getActivityCardImage(card.id)}
                    alt=""
                    fill
                    draggable={false}
                    className="object-contain p-2"
                    sizes="15rem"
                  />
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
              /* 그림만 있는 버튼이라 이름이 없으면 스크린리더에 "버튼"으로만 읽힌다.
                 카드 문구를 이름으로 준다 — 화면에는 아무 변화도 없다. */
              aria-label={card.text}
              className={[
                // touch-action:none 이 없으면 터치 드래그가 스크롤로 먹힌다.
                "relative flex h-[11.25rem] w-[15rem] touch-none items-center justify-center overflow-hidden rounded-card p-3 text-center transition-shadow select-none bg-transparent",
                dragging === card.id
                  ? "scale-105 ring-2 ring-primary shadow-soft"
                  : "",
              ].join(" ")}
            >
              {/* ⚠️ `draggable={false}`가 없으면 **마우스 드래그가 통째로 죽는다.**
                  <img>는 기본이 draggable이라 끌기 시작하면 브라우저의 기본 이미지
                  드래그가 걸리고, 그 순간 pointercancel이 날아와 앱의 배치 로직이
                  취소된다. 터치에서는 안 나므로 태블릿만 보면 놓친다. */}
              <Image
                src={getActivityCardImage(card.id)}
                alt=""
                fill
                draggable={false}
                className="object-contain p-2"
                sizes="15rem"
              />
            </button>
          ))
        )}
      </div>

      <p className="text-parent-body text-muted">
        {mismatched
          ? "표시된 자리를 다시 볼까? 카드를 옮겨서 한 번 더 놓아줘"
          : "카드를 끌어다 놓거나, 톡 눌러도 돼"}
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
