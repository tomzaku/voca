import { Icon } from '@iconify/react';
import { FILTERS, type Filter } from '../lib/progressApi';
import { BUCKET_META, BUCKET_ORDER } from '../lib/progress';

/**
 * The "which list" row for a game's own word picker (Quiz, Story Gaps,
 * Speaking, Mind Map via `useGameWordPool`) — one list active at a time, tab
 * style, unlike History's own row (`FilterChips`) which lets several be
 * checked at once. A round is drawn from one list, so a single active tab
 * matches what's actually happening better than a checkbox would.
 */
export function FilterTabs({
  active,
  counts,
  onSelect,
}: {
  active: Filter;
  /** Word count per tab, from `useGameWordPool`'s `counts`. */
  counts: Partial<Record<Filter, number>>;
  onSelect: (id: Filter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {FILTERS.map((f) => {
        const count = counts[f.id] ?? 0;
        const on = f.id === active;
        // Bucket tabs carry their bucket's icon + colour, matching the status
        // tag on the flash card that links here.
        const meta = BUCKET_ORDER.map((b) => BUCKET_META[b]).find((m) => m.tab === f.id);
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelect(f.id)}
            title={meta?.hint}
            aria-pressed={on}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-extrabold transition-all ${
              on
                ? 'bg-accent-cyan text-bg-primary'
                : 'bg-bg-tertiary text-text-muted hover:text-text-primary'
            }`}
          >
            {meta && <Icon icon={meta.icon} className={on ? '' : meta.text} />}
            {f.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${on ? 'bg-black/15' : 'bg-bg-primary/60 text-text-muted'}`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
