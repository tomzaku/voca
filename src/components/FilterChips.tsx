import { Icon } from '@iconify/react';
import { FILTERS, type Filter } from '../lib/progressApi';
import { BUCKET_META, BUCKET_ORDER } from '../lib/progress';

/**
 * The "which words" row — Recent / Saved / one per learning bucket — shared
 * between History's own list and any game that picks its word pool the same
 * way (Quiz, Story Gaps, Speaking, Mind Map via `useGameWordPool`). One
 * source for the chip styling and the bucket icon/colour lookup, so every
 * picker in the app looks and behaves identically.
 */
export function FilterChips({
  checked,
  counts,
  onToggle,
}: {
  checked: Set<Filter>;
  /** Word count per filter, from `useProgressQuery`'s `counts` (or `useGameWordPool`'s). */
  counts: Partial<Record<Filter, number>>;
  onToggle: (id: Filter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {FILTERS.map((f) => {
        const count = counts[f.id] ?? 0;
        const on = checked.has(f.id);
        // Bucket filters carry their bucket's icon + colour, matching the
        // status tag on the flash card that links here.
        const meta = BUCKET_ORDER.map((b) => BUCKET_META[b]).find((m) => m.tab === f.id);
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onToggle(f.id)}
            title={meta?.hint}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 text-sm font-extrabold transition-all ${
              on
                ? 'bg-accent-cyan/10 border-accent-cyan text-accent-cyan'
                : 'bg-bg-card border-border text-text-muted hover:border-border-light hover:text-text-primary'
            }`}
          >
            <Icon icon={on ? 'solar:check-circle-bold' : 'lucide:circle'} className={on ? 'text-accent-cyan' : 'text-text-muted'} />
            {meta && <Icon icon={meta.icon} className={meta.text} />}
            {f.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${on ? 'bg-accent-cyan/20 text-accent-cyan' : 'bg-bg-tertiary text-text-muted'}`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
