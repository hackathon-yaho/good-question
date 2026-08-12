/**
 * B-3 이야기 상세 + B-4 이어하기 확인 모달 — docs/spec/screens.md §B
 *
 * 셸: 좌우 스플릿 (좌 45% 표지 / 우 55% 정보). CenteredShell을 쓰지 않는다.
 *
 * "이야기 시작하기"의 판단 순서는 명세 그대로다.
 *   진행 중 세션 있음        → B-4 모달
 *   동의 없음                → 진행 불가 안내
 *   마이크 granted           → 세션 생성 후 /play
 *   마이크 prompt / denied   → I-1 / I-4
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Modal } from "@/components/ui/Modal";
import { PillButton } from "@/components/ui/PillButton";
import { useToast } from "@/components/ui/Toast";
import { MicBlockedScreen } from "@/features/system/MicBlockedScreen";
import { MicPermissionModal } from "@/features/system/MicPermissionModal";
import { errorCodeOf } from "@/lib/api/errors";
import { playApi as defaultPlayApi } from "@/lib/api";
import { contentApi } from "@/lib/api";
import type { ContentApi, PlayApi, StoryDetail } from "@/lib/api/types";
import { useSelectedChildId } from "@/lib/client-store";
import { queryMicPermission } from "@/lib/mic-permission";
import { toScreenIndex } from "@/mocks/story-banggui";

/** 정보 블록 3개 — 이 화면의 핵심 (명세 B-3) */
const BLOCKS = [
  { key: "intro", label: "이야기 도입", bar: "bg-info" },
  { key: "situation", label: "이야기 상황", bar: "bg-accent" },
  { key: "childRole", label: "내 역할", bar: "bg-primary" },
] as const;

type Gate = "none" | "asking" | "blocked";

/**
 * 시작 방식.
 *   resume  — 기존 sessionId로 그대로 이동 (B-4 "이어서 하기")
 *   restart — 기존 세션을 stopped로 바꾸고 새로 만든다 (B-4 "처음부터 하기").
 *             **messages는 지우지 않는다.** 기록은 보존하고 세션만 새로 만든다
 *   new     — 진행 중 세션이 없는 첫 시작
 */
type StartMode = "resume" | "restart" | "new";

export function StoryDetailScreen({
  storyId,
  api = contentApi,
  playApi = defaultPlayApi,
}: {
  storyId: string;
  api?: ContentApi;
  playApi?: PlayApi;
}) {
  const router = useRouter();
  const toast = useToast();
  const childId = useSelectedChildId();

  const [story, setStory] = useState<StoryDetail | null>(null);
  /** 없는 이야기 ID로 들어온 경우. 무한 로딩으로 두면 막다른 길이 된다. */
  const [notFound, setNotFound] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [gate, setGate] = useState<Gate>("none");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (childId === null) router.replace("/profiles");
  }, [childId, router]);

  useEffect(() => {
    if (!childId) return;
    let alive = true;
    api
      .getStory(storyId, childId)
      .then((detail) => {
        if (alive) setStory(detail);
      })
      .catch(() => {
        if (alive) setNotFound(true);
      });
    return () => {
      alive = false;
    };
  }, [api, childId, storyId, toast]);

  /** 마이크까지 통과했을 때만 실제로 세션을 만든다. */
  const go = useCallback(
    async (mode: StartMode) => {
      if (!childId || starting) return;
      setStarting(true);
      try {
        if (mode === "resume" && story?.existingSession) {
          router.push(`/play/${story.existingSession.sessionId}`);
          return;
        }
        const session = await playApi.createSession({
          childId,
          storyId,
          restart: mode === "restart",
        });
        router.push(`/play/${session.sessionId}`);
      } catch (error) {
        // 동의 없는 아이는 서버가 403 CONSENT_REQUIRED로 막는다. 상세 응답에
        // consentGranted가 없으므로 이 코드가 유일한 판단 근거다.
        // (backend/docs/api-spec.md 5.1)
        if (errorCodeOf(error) === "CONSENT_REQUIRED") {
          toast.show("보호자 동의가 필요해요. 설정에서 확인해 주세요.", "danger");
        } else {
          toast.show("이야기를 시작하지 못했어요. 다시 시도해 주세요.", "danger");
        }
        setStarting(false);
      }
    },
    [childId, playApi, router, starting, story, storyId, toast]
  );

  /**
   * 마이크 권한을 먼저 본다. 명세 B-3 체크리스트가 요구하는 사전 확인이다.
   * 권한이 없으면 세션을 만들지 않는다. 시작하지 못할 세션을 남길 이유가 없다.
   */
  const pendingModeRef = useRef<StartMode>("new");
  const startWithMicCheck = useCallback(
    async (mode: StartMode) => {
      pendingModeRef.current = mode;
      const permission = await queryMicPermission();
      if (permission === "granted") {
        await go(mode);
        return;
      }
      setGate(permission === "denied" ? "blocked" : "asking");
    },
    [go]
  );

  const onStart = useCallback(() => {
    if (!story) return;
    // 동의 여부는 미리 보지 않는다. 상세 응답에 그 필드가 없고, 세션 생성 시
    // 서버가 403으로 막아 준다. 판단 주체를 한 곳에 둔다.
    if (story.existingSession) {
      setResumeOpen(true);
      return;
    }
    void startWithMicCheck("new");
  }, [startWithMicCheck, story]);

  if (gate === "blocked") {
    return (
      <MicBlockedScreen
        onGranted={() => {
          setGate("none");
          void go(pendingModeRef.current);
        }}
        onExit={() => setGate("none")}
      />
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg px-6">
        <div className="flex flex-col items-center gap-5 text-center">
          <span aria-hidden className="text-5xl">
            🔍
          </span>
          <h1 className="text-parent-title font-bold text-text">
            이야기를 찾을 수 없어요
          </h1>
          <p className="text-parent-body text-muted">
            주소가 바뀌었거나 아직 준비 중인 이야기예요.
          </p>
          <PillButton onClick={() => router.replace("/stories")}>
            이야기 목록으로
          </PillButton>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <p className="text-parent-body text-muted">불러오고 있어요…</p>
      </div>
    );
  }

  const blockText: Record<(typeof BLOCKS)[number]["key"], string> = {
    intro: story.intro,
    situation: story.situation,
    childRole: story.childRole,
  };

  return (
    <div className="flex min-h-dvh w-full flex-col bg-bg lg:flex-row">
      {/* 좌 45% 표지 */}
      <div className="flex min-h-60 w-full items-center justify-center bg-primary-soft lg:min-h-dvh lg:w-[45%]">
        {/* 표지 미수령 (assets.md §3-1) */}
        <span className="text-parent-body font-bold text-muted">표지 준비 중</span>
      </div>

      {/* 우 55% 정보 */}
      <div className="flex min-w-0 flex-1 flex-col gap-5 px-8 py-10 lg:overflow-y-auto">
        <button
          type="button"
          onClick={() => router.back()}
          className="self-start text-parent-body text-muted underline"
        >
          ← 돌아가기
        </button>

        <h1 className="text-parent-title font-bold text-text">{story.title}</h1>
        <p className="text-parent-body leading-relaxed text-text">
          {story.summary}
        </p>

        <ul className="flex flex-wrap gap-2">
          {story.estimatedMinutes ? (
            <li className="rounded-pill bg-surface px-4 py-1.5 text-sm font-bold text-muted">
              약 {story.estimatedMinutes}분
            </li>
          ) : null}
          {story.difficulty ? (
            <li className="rounded-pill bg-surface px-4 py-1.5 text-sm font-bold text-muted">
              난이도 {story.difficulty}
            </li>
          ) : null}
          {story.topics.map((topic) => (
            <li
              key={topic}
              className="rounded-pill bg-accent-soft px-4 py-1.5 text-sm font-bold text-text"
            >
              {topic}
            </li>
          ))}
        </ul>

        <ul className="flex flex-col gap-3">
          {BLOCKS.map((block) => (
            <li
              key={block.key}
              className="flex gap-4 rounded-card border border-border bg-surface p-5"
            >
              <span aria-hidden className={`w-1 shrink-0 rounded-pill ${block.bar}`} />
              <div>
                <p className="text-parent-body font-bold text-text">
                  {block.label}
                </p>
                <p className="mt-1 text-parent-body leading-relaxed text-muted">
                  {blockText[block.key]}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {story.characters.length > 0 ? (
          <div>
            <p className="text-parent-body font-bold text-text">등장 캐릭터</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {story.characters.map((character) => (
                <li
                  key={character.name}
                  className="rounded-pill bg-secondary-soft px-4 py-1.5 text-sm font-bold text-text"
                >
                  {character.displayName}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <PillButton
          size="kid-lg"
          className="mt-2"
          fullWidth
          disabled={starting}
          onClick={onStart}
        >
          {starting ? "준비하고 있어요…" : "이야기 시작하기"}
        </PillButton>
      </div>

      {/* B-4 이어하기 확인 — 바깥 클릭으로 닫히지 않는다 (선택을 강제) */}
      <Modal open={resumeOpen} dismissible={false} label="이어하기 확인">
        <div className="flex flex-col items-center gap-4 text-center">
          <span
            aria-hidden
            className="flex size-16 items-center justify-center rounded-full bg-accent-soft text-3xl"
          >
            🔖
          </span>
          <h2 className="text-headline font-bold text-text">이어서 할까요?</h2>
          <p className="text-kid-body text-text">
            지난번에 장면{" "}
            {toScreenIndex(story.existingSession?.currentSceneOrder ?? 1) || 1}까지
            이야기했어요.
          </p>

          <PillButton
            size="kid"
            fullWidth
            disabled={starting}
            onClick={() => {
              setResumeOpen(false);
              void startWithMicCheck("resume");
            }}
          >
            이어서 하기
          </PillButton>

          <PillButton
            variant="outlined"
            size="kid"
            fullWidth
            disabled={starting}
            onClick={() => {
              setResumeOpen(false);
              void startWithMicCheck("restart");
            }}
          >
            처음부터 하기
          </PillButton>

          <p className="text-sm text-muted">
            처음부터 해도 지금까지 한 이야기는 지워지지 않아요.
          </p>
        </div>
      </Modal>

      <MicPermissionModal
        open={gate === "asking"}
        onGranted={() => {
          setGate("none");
          void go(pendingModeRef.current);
        }}
        onDenied={() => setGate("blocked")}
      />
    </div>
  );
}
