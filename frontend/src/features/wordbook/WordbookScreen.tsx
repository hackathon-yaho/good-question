/**
 * E-1 단어장 목록 + E-2 단어 상세 모달 — docs/spec/screens.md §E
 *
 * 선택 요건 A-02다. (Q-06) 단어는 C-9 "단어장에 담기"로만 들어온다.
 *
 * ⚠️ 발음은 저장된 오디오가 아니라 TTS로 읽는다. 원본 음성을 다루지 않는다.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SidebarShell } from "@/components/shells/SidebarShell";
import { FilterChipRow } from "@/components/ui/FilterChipRow";
import { Modal } from "@/components/ui/Modal";
import { PillButton } from "@/components/ui/PillButton";
import { mockContentApi } from "@/lib/api/mock-content";
import type { ContentApi, WordEntry, WordbookFilter } from "@/lib/api/types";
import { useSelectedChildId } from "@/lib/client-store";
import { useSpeechSynthesis } from "@/lib/speech/useSpeechSynthesis";

export function WordbookScreen({ api = mockContentApi }: { api?: ContentApi }) {
  const router = useRouter();
  const childId = useSelectedChildId();
  const { speak } = useSpeechSynthesis();

  const [filter, setFilter] = useState("");
  const [words, setWords] = useState<WordEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [storyFilters, setStoryFilters] = useState<
    { storyId: string; title: string }[]
  >([]);
  /** E-2 모달에서 보고 있는 단어의 목록 상 위치. "다음 단어"가 이 순서를 따른다. */
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    if (childId === null) router.replace("/profiles");
  }, [childId, router]);

  /** 하트를 누르면 이 값을 올려 목록을 다시 불러온다. */
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!childId) return;
    let alive = true;
    api
      .listWords(childId, (filter || "all") as WordbookFilter)
      .then((result) => {
        if (!alive) return;
        setWords(result.words);
        setTotal(result.total);
        setStoryFilters(result.storyFilters);
      })
      .catch(() => {
        if (alive) setWords([]);
      });
    return () => {
      alive = false;
    };
  }, [api, childId, filter, version]);

  const toggleLiked = useCallback(
    async (wordId: string) => {
      if (!childId) return;
      await api.toggleWordLiked(childId, wordId).catch(() => null);
      setVersion((prev) => prev + 1);
    },
    [api, childId]
  );

  const open = openIndex !== null && words ? words[openIndex] : undefined;

  return (
    <SidebarShell>
      <div className="flex items-center gap-3">
        <h1 className="text-parent-title font-bold text-text">단어장</h1>
        <span className="rounded-pill bg-primary-soft px-4 py-1 text-parent-body font-bold text-text">
          {total}개
        </span>
      </div>

      <div className="mt-5">
        <FilterChipRow
          options={[
            { value: "liked", label: "좋아하는 단어" },
            ...storyFilters.map((s) => ({
              value: `story:${s.storyId}`,
              label: s.title,
            })),
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {words === null ? (
        <p className="mt-8 text-parent-body text-muted">불러오고 있어요…</p>
      ) : words.length === 0 ? (
        <div className="mt-10 rounded-card border border-border bg-surface p-8 text-center">
          <p className="text-parent-body leading-relaxed text-muted">
            이야기를 하다가 모르는 단어를 만나면 여기에 담을 수 있어요.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {words.map((word, index) => (
            <li
              key={word.id}
              className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-soft"
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setOpenIndex(index)}
                  className="text-left text-[1.625rem] font-bold text-text underline-offset-4 hover:underline"
                >
                  {word.word}
                </button>
                {word.isNew ? (
                  <span className="shrink-0 rounded-pill bg-accent px-3 py-1 text-sm font-bold text-text">
                    새 단어
                  </span>
                ) : null}
              </div>

              {/* 2줄 제한 */}
              <p className="line-clamp-2 text-[1.0625rem] leading-relaxed text-muted">
                {word.meaning}
              </p>

              <div className="mt-auto flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`${word.word} 발음 듣기`}
                  onClick={() => speak(word.word)}
                  className="flex size-touch items-center justify-center rounded-full bg-primary-soft text-xl"
                >
                  🔊
                </button>
                <button
                  type="button"
                  aria-label={
                    word.liked
                      ? `${word.word} 좋아하는 단어 해제`
                      : `${word.word} 좋아하는 단어로 담기`
                  }
                  aria-pressed={word.liked}
                  onClick={() => void toggleLiked(word.id)}
                  className="flex size-touch items-center justify-center rounded-full text-xl"
                >
                  {word.liked ? "❤️" : "🤍"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* E-2 단어 상세 — "다음 단어"는 모달을 유지하고 내용만 교체한다 */}
      <Modal
        open={open !== undefined}
        width={700}
        label={open?.word}
        onClose={() => setOpenIndex(null)}
      >
        {open ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <h2 className="text-[2.75rem] leading-none font-bold text-text">
                {open.word}
              </h2>
              <button
                type="button"
                aria-label={`${open.word} 발음 듣기`}
                onClick={() => speak(open.word)}
                className="flex size-touch-kid items-center justify-center rounded-full bg-primary-soft text-3xl"
              >
                🔊
              </button>
              <button
                type="button"
                aria-label={
                  open.liked ? "좋아하는 단어 해제" : "좋아하는 단어로 담기"
                }
                aria-pressed={open.liked}
                onClick={() => void toggleLiked(open.id)}
                className="flex size-14 items-center justify-center rounded-full text-3xl"
              >
                {open.liked ? "❤️" : "🤍"}
              </button>
            </div>

            <div className="rounded-card bg-secondary-soft p-5">
              <p className="text-parent-body font-bold text-text">쉬운 뜻</p>
              <p className="mt-1 text-kid-body leading-relaxed text-text">
                {open.meaning}
              </p>
            </div>

            {open.contextSentence ? (
              <div className="flex gap-4 rounded-card border border-border bg-surface p-5">
                <span aria-hidden className="w-1 shrink-0 rounded-pill bg-info" />
                <div>
                  <p className="text-parent-body font-bold text-text">
                    이야기 속에서는
                  </p>
                  <p className="mt-1 text-kid-body leading-relaxed text-muted">
                    {open.contextSentence}
                  </p>
                </div>
              </div>
            ) : null}

            <p className="text-parent-body text-muted">
              {open.storyTitle} · 장면 {open.sceneIndex}에서 만났어요
            </p>

            <div className="flex gap-3">
              <PillButton
                variant="outlined"
                fullWidth
                onClick={() => setOpenIndex(null)}
              >
                닫기
              </PillButton>
              {words && words.length > 1 ? (
                <PillButton
                  fullWidth
                  onClick={() =>
                    setOpenIndex((prev) =>
                      prev === null ? null : (prev + 1) % words.length
                    )
                  }
                >
                  다음 단어
                </PillButton>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </SidebarShell>
  );
}
