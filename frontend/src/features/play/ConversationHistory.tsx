/**
 * 대화 히스토리 — docs/spec/screens.md C-3
 *
 * character 좌측 info-soft / child 우측 secondary-soft.
 * system 메시지(미션 노출 기록)는 호출부에서 이미 걸러져 들어온다.
 *
 * ── 지난 장면 대화도 함께 보여준다 ──────────────────────────────────
 * 같은 캐릭터가 여러 장면에 나온다(PRD I-13). 예: 방귀쟁이 며느리는 장면 1과
 * 장면 4에 모두 등장한다. 그래서 **그 캐릭터와 나눈 이야기 전체**를 보여준다.
 *
 * 다만 장면 3에서 한 이야기와 장면 9에서 한 이야기는 **서로 다른 순간**이다.
 * 구분선 없이 이으면 한 번에 이어진 대화로 읽혀 아이가 헷갈린다.
 * 그래서 지난 장면 묶음 앞에 "지난 이야기" 구분선을 넣는다.
 */

"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/lib/api/types";
import { SpeechBubble } from "@/components/ui/SpeechBubble";

export function ConversationHistory({
  messages,
  /** 지금 장면의 id. 이 장면이 아닌 묶음 앞에 구분선을 넣는다. */
  currentSceneId,
}: {
  messages: readonly Message[];
  currentSceneId?: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  if (messages.length === 0) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
      {messages.map((message, index) => {
        /**
         * 이 메시지에서 장면이 바뀌는가. 첫 메시지가 지난 장면이면 그 앞에도 넣는다.
         * "지금 장면"에는 라벨을 붙이지 않는다 — 현재는 설명이 필요 없다.
         */
        const prev = messages[index - 1];
        const sceneChanged = prev ? prev.sceneId !== message.sceneId : true;
        const isPast = currentSceneId
          ? message.sceneId !== currentSceneId
          : false;

        return (
          <div key={message.id} className="flex flex-col gap-3">
            {sceneChanged && isPast ? (
              <p className="flex items-center gap-2 text-sm font-bold text-muted">
                <span aria-hidden className="h-px flex-1 bg-border" />
                지난 이야기
                <span aria-hidden className="h-px flex-1 bg-border" />
              </p>
            ) : null}

            {sceneChanged && !isPast && index > 0 ? (
              <p className="flex items-center gap-2 text-sm font-bold text-primary">
                <span aria-hidden className="h-px flex-1 bg-primary-soft" />
                지금 이야기
                <span aria-hidden className="h-px flex-1 bg-primary-soft" />
              </p>
            ) : null}

            <SpeechBubble
              speaker={message.speakerType === "child" ? "child" : "character"}
            >
              {message.text}
            </SpeechBubble>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
