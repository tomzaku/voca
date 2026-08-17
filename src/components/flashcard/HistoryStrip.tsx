import { useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import { Selector, type SelectorOption } from '../Selector';
import { BUCKET_META, BUCKET_ORDER } from '../../lib/progress';
import type { Filter } from '../../hooks/useProgressQuery';

// Mirrors HistoryPage's own FILTERS list (recent + saved + every bucket, in
// progression order) — the strip's selector and the History page's filter
// chips are two views onto the same taxonomy, so keep them in sync.
const FILTER_OPTIONS: SelectorOption<Filter>[] = [
  { value: 'recent', label: 'Recent', icon: 'lucide:history' },
  { value: 'saved', label: 'Saved', icon: 'lucide:bookmark' },
  ...BUCKET_ORDER.map((b) => ({ value: BUCKET_META[b].tab, label: BUCKET_META[b].label, icon: BUCKET_META[b].icon })),
];

/**
 * The back/forward strip above the card: the active collection, which word
 * list is being browsed, and the words in it.
 *
 * "Recent" is this session's own walk through the deck (owned by the card).
 * Every other filter is a live slice of the learner's progress — Saved,
 * Struggling, Learning, and so on — so picking one swaps what Prev/Next and
 * the chips step through; the card owns that swap, this component only
 * renders whatever list it's handed.
 */
export function HistoryStrip({
  words, index, collectionName, filter, onFilterChange, maskCurrent, loading, disablePrev, disableNext, onPick, onPrev, onNext,
}: {
  words: string[];
  index: number;
  collectionName: string;
  filter: Filter;
  onFilterChange: (filter: Filter) => void;
  /** Hide the current word's label — it's still being guessed. Only "Recent" ever masks. */
  maskCurrent: boolean;
  /** The selected filter's word list hasn't landed yet. */
  loading: boolean;
  disablePrev: boolean;
  disableNext: boolean;
  onPick: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  // Keep the current chip visible as the strip grows past the viewport.
  useEffect(() => {
    if (!scroller.current) return;
    const chips = scroller.current.querySelectorAll<HTMLButtonElement>('button');
    chips[index]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [index, words]);

  // Before the first word of the session has loaded there's nothing to browse
  // yet — same as before. Once it has, the strip stays up regardless of which
  // filter is picked, even one with zero words, so the selector's still reachable.
  if (filter === 'recent' && words.length === 0) return null;

  return (
    <div className="max-w-page mx-auto mb-5 flex items-center gap-2">
      {/* Active collection — tap to switch on the Collections page */}
      <Link
        to="/collections"
        title="Change collection"
        className="btn-3d shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-purple/15 border-2 border-accent-purple/30 text-accent-purple text-xs font-extrabold max-w-[10rem]"
      >
        <Icon icon="lucide:library" className="text-sm shrink-0" />
        <span className="truncate">{collectionName}</span>
      </Link>

      <Selector value={filter} options={FILTER_OPTIONS} onChange={onFilterChange} ariaLabel="Word list" className="shrink-0" />

      <button
        onClick={onPrev}
        disabled={disablePrev}
        className="btn-3d shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-bg-card text-text-secondary hover:text-text-primary disabled:cursor-not-allowed"
        title="Previous word"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {loading ? (
        <div className="flex-1 flex items-center gap-2 py-1.5 text-xs text-text-muted">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin shrink-0" />
          Loading…
        </div>
      ) : words.length === 0 ? (
        <div className="flex-1 py-1.5 text-xs text-text-muted">Nothing here yet.</div>
      ) : (
        <div
          ref={scroller}
          className="flex-1 flex gap-1.5 overflow-x-auto py-0.5"
          style={{ scrollbarWidth: 'none' }}
        >
          {words.map((w, i) => {
            // Hide the current word while it's still being guessed — otherwise
            // the answer is readable straight off the history strip.
            const masked = i === index && maskCurrent;
            return (
              <button
                key={i}
                onClick={() => onPick(i)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-extrabold whitespace-nowrap border-2 transition-all hover:-translate-y-0.5 ${i === index
                    ? 'bg-accent-cyan text-bg-primary border-accent-cyan'
                    : 'bg-bg-card border-border text-text-muted hover:text-text-primary hover:border-border-light'
                  }`}
              >
                {masked ? '• • •' : w}
              </button>
            );
          })}
          {/* Trailing room, 3x a chip's own padding. Without it the last word
              — normally the current one — sits flush against the Next button
              and a long one is hard to read. A spacer rather than padding on
              the scroller: trailing padding is unreliably honoured in an
              overflow container, a flex child always is. */}
          <span aria-hidden className="shrink-0 w-9" />
        </div>
      )}

      <button
        onClick={onNext}
        disabled={disableNext}
        className="btn-3d shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-bg-card text-text-secondary hover:text-text-primary disabled:cursor-not-allowed"
        title="Next word"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
