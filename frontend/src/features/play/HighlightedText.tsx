/**
 * 밑줄 단어 — docs/spec/screens.md C-3 → C-9
 *
 * 서버가 내려준 `highlightWords`에 해당하는 부분만 탭할 수 있게 만든다.
 * 나머지 글자는 평범한 텍스트다. 아이가 아무 데나 눌러도 팝업이 뜨면 방해가 된다.
 *
 * 단어를 정규식으로 잘라내지 않고 인덱스로 자른다. 아이 이름이나 특수문자가 섞인
 * 텍스트에서 정규식이 깨지는 것을 피한다.
 */

"use client";

import type { HighlightWord } from "@/lib/api/types";

type Segment =
  | { kind: "text"; value: string }
  | { kind: "word"; value: string; entry: HighlightWord };

function segmentize(
  text: string,
  words: readonly HighlightWord[]
): Segment[] {
  if (words.length === 0) return [{ kind: "text", value: text }];

  const segments: Segment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    // 지금 위치에서 가장 먼저 나타나는 단어를 찾는다.
    let bestAt = -1;
    let best: HighlightWord | null = null;

    for (const entry of words) {
      if (!entry.word) continue;
      const at = text.indexOf(entry.word, cursor);
      if (at === -1) continue;
      // 같은 위치라면 더 긴 단어를 택한다.
      if (bestAt === -1 || at < bestAt || (at === bestAt && entry.word.length > (best?.word.length ?? 0))) {
        bestAt = at;
        best = entry;
      }
    }

    if (bestAt === -1 || !best) {
      segments.push({ kind: "text", value: text.slice(cursor) });
      break;
    }

    if (bestAt > cursor) {
      segments.push({ kind: "text", value: text.slice(cursor, bestAt) });
    }
    segments.push({ kind: "word", value: best.word, entry: best });
    cursor = bestAt + best.word.length;
  }

  return segments;
}

export function HighlightedText({
  text,
  words,
  onWordClick,
}: {
  text: string;
  words: readonly HighlightWord[];
  onWordClick: (word: HighlightWord) => void;
}) {
  const segments = segmentize(text, words);

  return (
    <>
      {segments.map((segment, index) =>
        segment.kind === "word" ? (
          <button
            key={`${segment.value}-${index}`}
            type="button"
            onClick={() => onWordClick(segment.entry)}
            aria-label={`${segment.value} 뜻 보기`}
            className="cursor-pointer underline decoration-accent decoration-4 underline-offset-4"
          >
            {segment.value}
          </button>
        ) : (
          <span key={`t-${index}`}>{segment.value}</span>
        )
      )}
    </>
  );
}
