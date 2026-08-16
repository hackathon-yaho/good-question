/**
 * FilterChipRow — docs/spec/screens.md §1-6
 * 사용처: B-2 주제별 필터, E-1 단어장 필터, G-1 아이 전환
 *
 * B-2에서 칩을 누르면 목록만 갱신하고 페이지 이동은 하지 않는다.
 */

"use client";

type Option = { value: string; label: string };

type Props = {
  options: readonly Option[];
  value: string;
  onChange: (value: string) => void;
  /** 맨 앞 "전체" 칩을 자동으로 붙인다. */
  includeAll?: boolean;
  allLabel?: string;
  /**
   * 좁아지면 줄바꿈하는 대신 가로 스크롤로 둔다. 기본은 줄바꿈 —
   * 칩이 몇 개 안 되는 곳(E-1, G-1)은 그대로 두고, 주제가 많은 B-2에서만 켠다.
   */
  scroll?: boolean;
};

export function FilterChipRow({
  options,
  value,
  onChange,
  includeAll = true,
  allLabel = "전체",
  scroll = false,
}: Props) {
  const items: readonly Option[] = includeAll
    ? [{ value: "", label: allLabel }, ...options]
    : options;

  return (
    <div
      role="tablist"
      className={
        scroll
          ? "flex flex-nowrap gap-2 overflow-x-auto"
          : "flex flex-wrap gap-2"
      }
    >
      {items.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value || "__all__"}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={[
              "min-h-touch rounded-pill px-5 text-parent-body font-bold transition-colors",
              scroll ? "shrink-0" : "",
              active
                ? "bg-primary text-white"
                : "border border-border bg-surface text-muted hover:bg-primary-soft hover:text-text",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
