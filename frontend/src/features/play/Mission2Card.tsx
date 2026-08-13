/**
 * 미션 2 카드 — 친구의 다른 점을 좋은 점으로 (화면 명세 C-11)
 *
 * ── 미션 1과 상호작용이 다르다 ──────────────────────────────────────
 *   미션 1(`MissionCard`)  4항목을 **순차로** 하나씩 말한다
 *   미션 2(여기)           4개 중 **하나를 골라** 그 친구에 대해 말한다
 *
 * 그래서 컴포넌트를 나눴다. 같은 파일에서 분기하면 두 흐름이 서로를 망친다 —
 * 순차 포인터와 선택 상태는 함께 있을 수 없는 개념이다.
 *
 * ── 구성 (C-11) ─────────────────────────────────────────────────────
 *   [미션 2] 칩 + 미션 제목 + 한 줄 안내
 *   친구 카드 4장 — 선택 시 primary 테두리 + 체크 뱃지
 *   문장 틀 — "{선택한 친구}는 ⋯⋯ 할 수 있어요." (빈칸은 점선)
 *   (재시도일 때) 힌트
 *
 * `말해볼래요` 버튼은 이 카드 안에 없다. 호출부가 카드 밖 하단에 놓는다.
 * 미션 1과 같은 규칙이다 (계획 D23).
 *
 * ⚠️ 힌트를 처음부터 보여주지 않는다. 먼저 보여주면 아이가 정해진 답을 찾으려 한다
 *    (PRD 7.6). 한 번 말해 본 뒤에만 붙는다.
 */

"use client";

import {
  MISSION_2_OPTIONS,
  MISSION_2_SENTENCE_TAIL,
} from "@/features/play/mission2";
import { topicParticle } from "@/lib/korean";

type Props = {
  title: string;
  /** 고른 친구의 index. 아직 안 골랐으면 null */
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  /** 한 번 말해 봤는데 아직 미션이 안 끝났을 때 힌트를 붙인다 */
  showHint?: boolean;
};

export function Mission2Card({
  title,
  selectedIndex,
  onSelect,
  showHint = false,
}: Props) {
  const selected =
    selectedIndex === null ? null : MISSION_2_OPTIONS[selectedIndex];

  return (
    <section className="flex max-h-full min-h-0 w-full flex-col overflow-y-auto rounded-card border-2 border-accent bg-accent-soft p-4">
      <div className="shrink-0">
        <p className="mb-1 w-fit rounded-pill bg-primary px-3 py-0.5 text-sm font-bold text-white">
          미션 2
        </p>
        <h3 className="text-parent-title font-bold text-text">{title}</h3>
        <p className="mt-1 text-parent-body text-muted">
          단점처럼 보이지만 좋은 일에 쓸 수 있는 점을 찾아보자.
        </p>
      </div>

      {/* 친구 카드 4장을 **가로 1행**에 놓는다 (화면 명세 C-11 · 시안과 같다).
          ⚠️ 2×2로 놓으면 카드가 두 배로 높아져 아래 문장 틀과 힌트가 잘린다.
             우측 패널(1133px에서 453px)에서 1행이면 1장당 98px, 1280px에서 112px이다.
             그림이 작아지는 대신 **문장 틀·힌트까지 스크롤 없이** 보인다 —
             아이 화면에서 스크롤은 마지막 수단이다. */}
      <ul
        role="radiogroup"
        aria-label="친구 고르기"
        className="mt-3 grid shrink-0 grid-cols-4 gap-2"
      >
        {MISSION_2_OPTIONS.map((option, index) => {
          const on = index === selectedIndex;
          return (
            <li key={option.label}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onSelect(index)}
                className={[
                  "relative flex w-full flex-col items-center gap-1.5 rounded-bubble border-2 p-2 transition-colors",
                  on
                    ? "border-primary bg-surface"
                    : "border-transparent bg-surface/60 hover:bg-surface",
                ].join(" ")}
              >
                {/* 그림 미수령 (assets.md §3-6). 규격 자리를 지켜 선택해도 카드가 흔들리지 않게 한다 */}
                <span className="flex aspect-square w-full items-center justify-center rounded-bubble bg-primary-soft text-[0.6rem] leading-tight font-bold text-muted">
                  그림
                  <br />
                  준비 중
                </span>
                {/* data-label: 검사가 라벨만 집어 읽을 수 있게 둔다. 카드 안에는
                    플레이스홀더 문구도 섞여 있어 textContent로는 갈라내기 어렵다. */}
                <span
                  data-friend-label={option.label}
                  className={[
                    "text-center text-sm leading-tight",
                    on ? "font-bold text-text" : "text-muted",
                  ].join(" ")}
                >
                  {option.label}
                </span>

                {on ? (
                  <span
                    aria-hidden
                    className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-primary text-sm font-bold text-white"
                  >
                    ✓
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {/* 문장 틀 — 고르면 주어가 바뀐다. 안 골랐으면 무엇을 고르라고 알려준다 */}
      <p className="mt-3 shrink-0 rounded-bubble bg-surface px-4 py-3 text-center text-kid-body leading-relaxed text-text">
        {selected ? (
          <>
            <span className="font-bold">
              {selected.label}
              {topicParticle(selected.label)}
            </span>{" "}
            <span
              aria-label="여기에 말할 내용이 들어가요"
              className="mx-1 inline-block w-24 border-b-2 border-dotted border-muted align-middle"
            />{" "}
            {MISSION_2_SENTENCE_TAIL}
          </>
        ) : (
          <span className="text-muted">친구를 하나 골라줘</span>
        )}
      </p>

      {/* 힌트 — 고른 친구의 예시 문장을 그대로 보여준다 (PRD 7.6) */}
      {showHint && selected ? (
        <p className="mt-2.5 shrink-0 rounded-bubble bg-surface px-3.5 py-2 text-parent-body leading-snug text-text">
          <span className="font-bold text-primary">힌트 </span>
          이렇게 말해도 좋아. “{selected.label}
          {topicParticle(selected.label)} {selected.example}”
        </p>
      ) : null}
    </section>
  );
}
