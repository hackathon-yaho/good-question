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
};

export function FilterChipRow({
  options,
  value,
  onChange,
  includeAll = true,
  allLabel = "전체",
}: Props) {
  const items: readonly Option[] = includeAll
    ? [{ value: "", label: allLabel }, ...options]
    : options;

  return (
    <div role="tablist" className="flex flex-wrap gap-2">
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
