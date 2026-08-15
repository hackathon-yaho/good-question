/**
 * 컴포넌트 갤러리 (개발용) — /dev/gallery
 *
 * 디자인 시안(Stitch)을 아직 못 받았기 때문에, screens.md §1의 토큰 값이
 * 실제로 어떻게 보이는지 눈으로 확인할 데가 필요하다. 시안이 도착하면
 * 이 화면과 나란히 놓고 대조한다.
 *
 * 제출물에는 포함하지 않는다. 배포에서 빼려면 이 디렉터리만 지우면 된다.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CenteredShell } from "@/components/shells/CenteredShell";
import { ChildAvatar, AVATAR_IDS } from "@/components/ui/ChildAvatar";
import { FilterChipRow } from "@/components/ui/FilterChipRow";
import { MicButton, type MicState } from "@/components/ui/MicButton";
import { Modal } from "@/components/ui/Modal";
import { PillButton } from "@/components/ui/PillButton";
import { SlideSheet } from "@/components/ui/SlideSheet";
import { SpeechBubble } from "@/components/ui/SpeechBubble";
import { StoryCard } from "@/components/ui/StoryCard";
import { ThinkingElementStars } from "@/components/ui/ThinkingElementStars";
import { useToast } from "@/components/ui/Toast";

/** Tailwind는 `bg-${name}` 같은 동적 클래스를 감지하지 못해 클래스를 그대로 적는다. */
const COLORS: readonly { token: string; className: string }[] = [
  { token: "bg", className: "bg-bg" },
  { token: "surface", className: "bg-surface" },
  { token: "primary", className: "bg-primary" },
  { token: "primary-soft", className: "bg-primary-soft" },
  { token: "secondary", className: "bg-secondary" },
  { token: "secondary-soft", className: "bg-secondary-soft" },
  { token: "accent", className: "bg-accent" },
  { token: "accent-soft", className: "bg-accent-soft" },
  { token: "info", className: "bg-info" },
  { token: "text", className: "bg-text" },
  { token: "muted", className: "bg-muted" },
  { token: "border", className: "bg-border" },
  { token: "danger", className: "bg-danger" },
  { token: "sidebar-bg", className: "bg-sidebar-bg" },
];

const MIC_STATES: MicState[] = ["idle", "recording", "busy", "disabled"];

export default function GalleryPage() {
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [topic, setTopic] = useState("");
  const toast = useToast();

  /** 개발용 — "이야기 순서대로 놓아볼까" 활동으로 바로 진입 */
  const goActivity = async () => {
    try {
      const { mockPlayApi } = await import("@/lib/api/mock");
      const { STORY_ID } = await import("@/mocks/story-banggui");
      const snapshot = await mockPlayApi.createSession({
        childId: "c_mock_1",
        storyId: STORY_ID,
      });
      router.push(`/activity/${snapshot.sessionId}`);
    } catch {
      toast.show("활동 진입 실패", "danger");
    }
  };

  return (
    <CenteredShell width="full">
      <div className="flex flex-col gap-14 pb-24">
        <header>
          <h1 className="text-parent-title font-bold">컴포넌트 갤러리</h1>
          <p className="text-muted">
            docs/spec/screens.md §1 기준. 시안 수령 후 대조용.
          </p>
          <div className="mt-4 flex gap-3">
            <PillButton onClick={() => void goActivity()}>
              이야기 순서대로 놓아볼까 (개발용)
            </PillButton>
          </div>
        </header>

        <Section title="Color — §1-2">
          <div className="grid grid-cols-4 gap-3">
            {COLORS.map(({ token, className }) => (
              <div key={token} className="flex flex-col gap-1">
                <div
                  className={`h-16 rounded-card border border-border ${className}`}
                />
                <code className="text-sm text-muted">--color-{token}</code>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Typography — §1-3">
          <div className="flex flex-col gap-3">
            <p className="text-dialogue font-bold">캐릭터 대사 31px / 700</p>
            <p className="text-narration font-medium">내레이션 자막 32px / 500</p>
            <p className="text-kid-button font-bold">아이 화면 버튼 25px / 700</p>
            <p className="text-kid-body">아이 화면 본문 21px / 400</p>
            <p className="text-parent-title font-bold">보호자 제목 27px / 700</p>
            <p className="text-parent-body">보호자 본문 16px / 400</p>
          </div>
        </Section>

        <Section title="PillButton — 클릭 타겟 §1-4">
          <div className="flex flex-wrap items-center gap-3">
            <PillButton>보호자 md (44px)</PillButton>
            <PillButton variant="outlined">outlined</PillButton>
            <PillButton variant="danger">danger</PillButton>
            <PillButton disabled>disabled</PillButton>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <PillButton size="kid">아이 kid (72px)</PillButton>
            <PillButton size="kid-lg">아이 kid-lg (76px)</PillButton>
          </div>
        </Section>

        <Section title="MicButton — §1-5 대화 상태 4색">
          <div className="flex flex-wrap items-end gap-10">
            {MIC_STATES.map((state) => (
              <div key={state} className="flex flex-col items-center gap-3">
                <MicButton state={state} size={120} level={0.7} />
                <code className="text-sm text-muted">{state}</code>
              </div>
            ))}
          </div>
        </Section>

        <Section title="SpeechBubble — C-3 히스토리 규칙">
          <div className="flex max-w-[32.5rem] flex-col gap-3">
            <SpeechBubble speaker="character" emphasis>
              민준아, 내 방귀가 너무 크다는 걸 알면 가족들이 나를 이상하게
              생각하지 않을까?
            </SpeechBubble>
            <SpeechBubble speaker="child">
              며느리가 창피해서 계속 참았던 것 같아요.
            </SpeechBubble>
            <SpeechBubble speaker="character" dimmed>
              직전 대사 (C-4에서 축소 표시)
            </SpeechBubble>
          </div>
        </Section>

        <Section title="ThinkingElementStars — C-7 / C-12">
          <p className="mb-4 text-parent-body text-muted">
            영문 코드를 넣어도 화면에는 4그룹 한글만 나온다.
          </p>
          <ThinkingElementStars
            accumulatedElements={["EMOTION", "REASON", "EMPATHY"]}
          />
        </Section>

        <Section title="ChildAvatar — 아바타 6종 폴백 (Q-20)">
          <div className="flex flex-wrap items-center gap-4">
            {AVATAR_IDS.map((id, i) => (
              <ChildAvatar
                key={id}
                name={["민준", "서연", "지호", "하윤", "예준", "수아"][i]}
                avatarId={id}
                size={72}
                selected={i === 0}
              />
            ))}
          </div>
        </Section>

        <Section title="StoryCard — 표지 플레이스홀더">
          <div className="grid max-w-shell-wide grid-cols-2 gap-5">
            <StoryCard
              storyId="s_banggui_daughter_in_law_001"
              title="방귀 뀌는 며느리"
              estimatedMinutes={20}
              topics={["다름", "자기이해", "장점 발견"]}
              sessionStatus="in_progress"
            />
            <StoryCard
              storyId="s_banggui_daughter_in_law_001"
              title="방귀 뀌는 며느리"
              estimatedMinutes={20}
              topics={["다름"]}
              sessionStatus="completed"
            />
          </div>
        </Section>

        <Section title="FilterChipRow — B-2">
          <FilterChipRow
            options={[
              { value: "다름", label: "다름" },
              { value: "자기이해", label: "자기이해" },
              { value: "장점 발견", label: "장점 발견" },
            ]}
            value={topic}
            onChange={setTopic}
          />
        </Section>

        <Section title="Modal / SlideSheet / Toast">
          <div className="flex flex-wrap gap-3">
            <PillButton onClick={() => setModal(true)}>Modal 열기</PillButton>
            <PillButton variant="outlined" onClick={() => setSheet(true)}>
              SlideSheet 열기
            </PillButton>
            <PillButton
              variant="outlined"
              onClick={() => toast.show("단어장에 담았어요!")}
            >
              Toast
            </PillButton>
          </div>
        </Section>

        <Section title="turn-glow — CHILD_TURN 화면 테두리 (§1-5)">
          <p className="mb-4 text-parent-body text-muted">
            이 서비스의 핵심 신호다. 아이가 &ldquo;말할 차례&rdquo;를 놓치면
            서비스가 작동하지 않는다.
          </p>
          <div className="relative h-56 overflow-hidden rounded-card bg-primary-soft">
            <div aria-hidden className="turn-glow absolute inset-0" />
            <p className="absolute inset-0 flex items-center justify-center text-dialogue font-bold text-primary">
              이제 말해 볼까?
            </p>
          </div>
        </Section>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} label="예시 모달">
        <h2 className="text-parent-title font-bold">이어서 할까요?</h2>
        <p className="mt-3 text-parent-body text-muted">
          지난번에 장면 2까지 이야기했어요.
        </p>
        <div className="mt-8 flex gap-3">
          <PillButton variant="outlined" fullWidth onClick={() => setModal(false)}>
            처음부터 하기
          </PillButton>
          <PillButton fullWidth onClick={() => setModal(false)}>
            이어서 하기
          </PillButton>
        </div>
      </Modal>

      <SlideSheet open={sheet} onClose={() => setSheet(false)} title="힌트">
        <p className="text-kid-body">
          힌트는 정답을 주는 것이 아니라 생각을 시작하게 하는 것이다. (C-8)
        </p>
      </SlideSheet>
    </CenteredShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 border-b border-border pb-2 text-parent-title font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}
