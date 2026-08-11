/**
 * C-9 단어 뜻 팝업 — docs/spec/screens.md §C
 *
 * 형태: 중앙 모달 620px. 진입: 자막 밑줄 단어 탭.
 *
 * 이 화면이 없으면 단어장(E)이 영원히 비어 있다. 서버가 `highlightWords`를 이미
 * 내려주고 있으므로 담을 통로만 열어 주면 된다.
 *
 * ⚠️ 발음은 TTS다. 저장된 오디오가 아니다.
 */

"use client";

import { useCallback, useState } from "react";

import { Modal } from "@/components/ui/Modal";
import { PillButton } from "@/components/ui/PillButton";
import { useToast } from "@/components/ui/Toast";
import type { HighlightWord } from "@/lib/api/types";
import type { TtsRate } from "@/lib/speech/useSpeechSynthesis";

export function WordPopup({
  word,
  contextSentence,
  saved,
  onSpeak,
  onSave,
  onClose,
}: {
  word: HighlightWord | null;
  /** "이야기 속에서는" 카드에 넣을 원문 */
  contextSentence: string | null;
  saved: boolean;
  onSpeak: (text: string, opts?: { rate?: TtsRate }) => void;
  onSave: (word: HighlightWord) => Promise<void>;
  onClose: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const save = useCallback(async () => {
    if (!word || saving || saved) return;
    setSaving(true);
    try {
      await onSave(word);
      toast.show("단어장에 담았어요!");
      onClose();
    } catch {
      toast.show("단어장에 담지 못했어요", "danger");
    } finally {
      setSaving(false);
    }
  }, [onClose, onSave, saved, saving, toast, word]);

  return (
    <Modal open={word !== null} width={620} label={word?.word} onClose={onClose}>
      {word ? (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <h2 className="text-[2.25rem] leading-none font-bold text-text">
              {word.word}
            </h2>
            <button
              type="button"
              aria-label={`${word.word} 발음 듣기`}
              onClick={() => onSpeak(word.word, { rate: "slow" })}
              className="flex size-16 items-center justify-center rounded-full bg-primary-soft text-3xl"
            >
              🔊
            </button>
          </div>

          <div className="rounded-card bg-secondary-soft p-5">
            <p className="text-parent-body font-bold text-text">쉬운 뜻</p>
            <p className="mt-1 text-kid-body leading-relaxed text-text">
              {word.meaning}
            </p>
          </div>

          {contextSentence ? (
            <div className="flex gap-4 rounded-card border border-border bg-surface p-5">
              <span aria-hidden className="w-1 shrink-0 rounded-pill bg-info" />
              <div>
                <p className="text-parent-body font-bold text-text">
                  이야기 속에서는
                </p>
                <p className="mt-1 text-kid-body leading-relaxed text-muted">
                  {contextSentence}
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex gap-3">
            <PillButton
              variant="outlined"
              size="kid"
              fullWidth
              onClick={onClose}
            >
              닫기
            </PillButton>
            <PillButton
              size="kid"
              fullWidth
              disabled={saved || saving}
              onClick={() => void save()}
            >
              {saved ? "담김 ✓" : saving ? "담고 있어요…" : "단어장에 담기"}
            </PillButton>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
