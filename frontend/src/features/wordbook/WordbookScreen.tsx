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
import { KidLoadingScreen } from "@/components/ui/KidLoadingScreen";
import { Modal } from "@/components/ui/Modal";
import { PillButton } from "@/components/ui/PillButton";
import { contentApi } from "@/lib/api";
import type { ContentApi, WordEntry, WordbookFilter } from "@/lib/api/types";
import { useSelectedChildId } from "@/lib/client-store";
import { useCharacterVoice } from "@/lib/speech";

export function WordbookScreen({ api = contentApi }: { api?: ContentApi }) {
  const router = useRouter();
  const childId = useSelectedChildId();
  const { speak } = useCharacterVoice();

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
    async (wordId: string, liked: boolean) => {
      if (!childId) return;
      // 목표 값을 넘긴다. 서버가 뒤집어 주지 않는다. (api-spec 9.3)
      await api.toggleWordLiked(childId, wordId, liked).catch(() => null);
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
        <KidLoadingScreen className="mt-8" />
      ) : words.length === 0 ? (
        <div className="mt-10 rounded-card border border-border bg-surface p-8 text-center">
          <p className="text-parent-body leading-relaxed text-muted">
            이야기를 하다가 모르는 단어를 만나면 여기에 담을 수 있어요.
          </p>
        </div>
      ) : (
        // 카드 최소 width(260px)를 트랙 자체의 하한으로 둔다. `sm:/lg:` 같은 고정
        // 열-개수 분기 + `min-w`를 함께 쓰면 사이드바 접힘/펼침 등으로 트랙이 260px보다
        // 좁아지는 구간이 생겨 카드가 서로 겹친다. auto-fill이면 트랙이 항상 260px 이상만
        // 만들어지고, 안 되면 열 수 자체가 줄어든다.
        <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
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
                  onClick={() => speak({ text: word.word })}
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
                  onClick={() => void toggleLiked(word.id, !word.liked)}
                  className="flex size-touch items-center justify-center rounded-full"
                >
                  {word.liked ? (
                    <svg viewBox="0 0 24 24" className="size-6 text-red-500" fill="currentColor" stroke="none">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="size-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  )}
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
                onClick={() => speak({ text: open.word })}
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
                onClick={() => void toggleLiked(open.id, !open.liked)}
                className="flex size-14 items-center justify-center rounded-full"
              >
                {open.liked ? (
                  <svg viewBox="0 0 24 24" className="size-8 text-red-500" fill="currentColor" stroke="none">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="size-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                )}
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
