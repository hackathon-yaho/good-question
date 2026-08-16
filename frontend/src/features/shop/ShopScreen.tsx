/**
 * 상점 — 별가루로 아바타를 구매한다. 배경·이야기 탭은 아직 항목이 없어
 * 준비 중 안내만 보여준다 (팀 결정 — 아바타만 먼저 낸다).
 *
 * 진입: 사이드바 "상점" 메뉴. **여기서는 구매만 한다 — 장착(현재 아바타 변경)은
 * 하지 않는다.** 잠금/보유 상태만 보여주고, 실제로 바꿔 쓰는 것은 F-1 프로필의
 * 아바타 변경 모달이 담당한다 (팀 결정). 무료 6종은 처음부터 갖고 있어 살 게
 * 없으므로 이 화면에는 `SHOP_AVATARS`(lib/shop-catalog.ts)만 진열한다.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { SidebarShell } from "@/components/shells/SidebarShell";
import { ChildAvatar } from "@/components/ui/ChildAvatar";
import { FilterChipRow } from "@/components/ui/FilterChipRow";
import { KidLoadingScreen } from "@/components/ui/KidLoadingScreen";
import { Modal } from "@/components/ui/Modal";
import { PillButton } from "@/components/ui/PillButton";
import { StarDustChip, StarDustIcon } from "@/components/ui/StarDust";
import { useToast } from "@/components/ui/Toast";
import { contentApi } from "@/lib/api";
import { errorCodeOf } from "@/lib/api/errors";
import type { ContentApi } from "@/lib/api/types";
import { useSelectedChildId } from "@/lib/client-store";
import { SHOP_AVATARS, type ShopAvatar } from "@/lib/shop-catalog";

/** 무료 6종은 상점에 진열하지 않는다 — 처음부터 갖고 있는 것이라 살 게 없다. */
const ITEMS: ShopAvatar[] = SHOP_AVATARS;

const CATEGORIES = [
  { value: "avatar", label: "아바타" },
  { value: "background", label: "배경" },
  { value: "story", label: "이야기" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

const COMING_SOON: Record<Exclude<Category, "avatar">, { emoji: string; title: string }> = {
  background: { emoji: "🏞️", title: "배경" },
  story: { emoji: "📖", title: "이야기" },
};

/** 아직 항목이 없는 탭 — 아이 화면 톤으로 "곧 만나요"를 알린다. */
function ComingSoonPanel({ emoji, title }: { emoji: string; title: string }) {
  return (
    <div className="mt-8 flex flex-col items-center gap-4 rounded-card bg-accent-soft p-14 text-center">
      <span aria-hidden className="text-7xl">
        {emoji}
      </span>
      <p className="text-kid-button font-bold text-text">
        {title} 상점은 곧 열려요!
      </p>
      <p className="text-kid-body text-muted">
        조금만 기다려 주세요. 새로운 아이템으로 다시 만나요 ✨
      </p>
    </div>
  );
}

export function ShopScreen({ api = contentApi }: { api?: ContentApi }) {
  const router = useRouter();
  const childId = useSelectedChildId();
  const toast = useToast();

  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [starDust, setStarDust] = useState<number | null>(null);
  const [ownedAvatarIds, setOwnedAvatarIds] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("avatar");
  /** 구매 확인 알림창 — 누른 아이템이 있으면 연다 */
  const [confirming, setConfirming] = useState<ShopAvatar | null>(null);

  useEffect(() => {
    if (childId === null) router.replace("/profiles");
  }, [childId, router]);

  useEffect(() => {
    if (!childId) return;
    let alive = true;
    api
      .getMypage(childId)
      .then((snapshot) => {
        if (!alive) return;
        setName(snapshot.child.name);
        setStarDust(snapshot.child.starDust ?? null);
        setOwnedAvatarIds(snapshot.child.ownedAvatarIds ?? []);
        setLoaded(true);
      })
      .catch(() => {
        if (alive) router.replace("/profiles");
      });
    return () => {
      alive = false;
    };
  }, [api, childId, router]);

  const buy = useCallback(
    async (item: ShopAvatar) => {
      if (!childId || pending) return;
      setPending(item.id);
      try {
        const result = await api.purchaseAvatar(childId, item.id);
        setStarDust(result.starDust);
        setOwnedAvatarIds(result.ownedAvatarIds);
        toast.show(`${item.label} 아바타의 잠금을 해제했어요!`);
      } catch (error) {
        toast.show(
          errorCodeOf(error) === "INSUFFICIENT_STAR_DUST"
            ? "별가루가 부족해요."
            : "적용하지 못했어요. 다시 시도해 주세요.",
          "danger"
        );
      } finally {
        setPending(null);
        setConfirming(null);
      }
    },
    [api, childId, pending, toast]
  );

  if (!loaded) {
    return (
      <SidebarShell>
        <KidLoadingScreen className="h-full" />
      </SidebarShell>
    );
  }

  return (
    <SidebarShell>
      <div className="flex items-center justify-between">
        <h1 className="text-parent-title font-bold text-text">상점</h1>
        <StarDustChip amount={starDust} size={24} />
      </div>

      <p className="mt-1 text-parent-body text-muted">
        별가루를 모아서 새 아이템을 데려와 보세요.
      </p>

      <div className="mt-4">
        <FilterChipRow
          options={CATEGORIES}
          value={category}
          onChange={(value) => setCategory(value as Category)}
          includeAll={false}
        />
      </div>

      {category !== "avatar" ? (
        <ComingSoonPanel {...COMING_SOON[category]} />
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {ITEMS.map((item) => {
            const owned = ownedAvatarIds.includes(item.id);
            const canAfford = (starDust ?? 0) >= item.price;
            const busy = pending === item.id;

            return (
              <li
                key={item.id}
                className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface p-5 text-center"
              >
                <div className="relative">
                  <ChildAvatar name={name} avatarId={item.id} size={72} />
                  {/* 잠금/잠금 해제 표시 — 이 화면은 보유 상태만 보여준다. 실제로
                      바꿔 쓰는 것은 F-1 프로필의 아바타 변경 모달이 한다. */}
                  <span
                    aria-hidden
                    className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-surface bg-surface text-sm shadow-soft"
                  >
                    {owned ? "🔓" : "🔒"}
                  </span>
                </div>
                <p className="text-parent-body font-bold text-text">{item.label}</p>

                {owned ? (
                  <span className="flex min-h-touch w-full items-center justify-center rounded-pill border border-border bg-primary-soft px-5 text-parent-body font-bold text-text">
                    보유 중
                  </span>
                ) : (
                  <PillButton
                    fullWidth
                    leading={<StarDustIcon size={18} />}
                    disabled={!canAfford || busy}
                    onClick={() => setConfirming(item)}
                  >
                    {item.price}
                  </PillButton>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={confirming !== null}
        label="아바타 구매 확인"
        onClose={() => {
          if (!pending) setConfirming(null);
        }}
        width={420}
      >
        {confirming ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <ChildAvatar name={name} avatarId={confirming.id} size={96} />
            <h2 className="text-kid-button font-bold text-text">
              {confirming.label}를 데려올까요?
            </h2>
            <span className="flex items-center gap-1 rounded-pill bg-accent-soft px-4 py-2 text-parent-body font-bold text-text">
              <StarDustIcon size={20} className="text-accent" />
              별가루 {confirming.price}개를 쓸 거예요
            </span>

            <PillButton
              fullWidth
              disabled={pending === confirming.id}
              onClick={() => void buy(confirming)}
            >
              {pending === confirming.id ? "데려오고 있어요…" : "네, 데려올래요! 🎉"}
            </PillButton>
            <PillButton
              variant="outlined"
              fullWidth
              disabled={pending === confirming.id}
              onClick={() => setConfirming(null)}
            >
              다음에 할래요
            </PillButton>
          </div>
        ) : null}
      </Modal>
    </SidebarShell>
  );
}
