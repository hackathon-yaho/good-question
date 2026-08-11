/**
 * 대화 히스토리 — docs/spec/screens.md C-3
 *
 * character 좌측 흰색 + border / child 우측 secondary-soft.
 * system 메시지(미션 노출 기록)는 호출부에서 이미 걸러져 들어온다.
 */

"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/lib/api/types";
import { SpeechBubble } from "@/components/ui/SpeechBubble";

export function ConversationHistory({
  messages,
}: {
  messages: readonly Message[];
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  if (messages.length === 0) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
      {messages.map((message) => (
        <SpeechBubble
          key={message.id}
          speaker={message.speakerType === "child" ? "child" : "character"}
        >
          {message.text}
        </SpeechBubble>
      ))}
      <div ref={endRef} />
    </div>
  );
}
