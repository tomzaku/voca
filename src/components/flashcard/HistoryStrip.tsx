import { useEffect, useRef, useState } from 'react';
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
 *
 * Below `sm`, the inline Selector, Prev/Next arrows, and the chip strip
 * give way to one group button, same row as the collection chip — filter
 * name | current word — that opens a popup: a Selector for the filter, and
 * the full word list as plain hyperlink-style text below it. There isn't
 * room on a phone for the Selector, arrows, and a scrolling strip at once.
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
  const [showList, setShowList] = useState(false);
  const currentFilter = FILTER_OPTIONS.find((o) => o.value === filter) ?? FILTER_OPTIONS[0];

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
    <div className="max-w-page mx-auto mb-5">
      <div className="flex items-center gap-2">
        {/* Active collection — tap to switch on the Collections page */}
        <Link
          to="/collections"
          title="Change collection"
          className="btn-3d shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-purple/15 border-2 border-accent-purple/30 text-accent-purple text-xs font-extrabold max-w-[10rem]"
        >
          <Icon icon="lucide:library" className="text-sm shrink-0" />
          <span className="truncate">{collectionName}</span>
        </Link>

        <Selector
          value={filter}
          options={FILTER_OPTIONS}
          onChange={onFilterChange}
          ariaLabel="Word list"
          className="hidden sm:flex shrink-0"
        />

        {/* Mobile: a two-segment group button, same row as the collection
            chip — [ filter | current word ] — opens a popup with the filter
            (as a Selector) and the full word list below it, since there
            isn't room here for the Selector, arrows, and a scrolling strip
            all at once. */}
        <button
          type="button"
          onClick={() => setShowList(true)}
          disabled={loading || words.length === 0}
          className="sm:hidden ml-auto max-w-[70%] flex items-stretch rounded-xl border-2 border-border overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className="shrink-0 px-3 py-1.5 bg-accent-purple/15 text-accent-purple text-xs font-extrabold flex items-center">
            {currentFilter.label}
          </span>
          <span className="min-w-0 px-3 py-1.5 border-l-2 border-border bg-bg-card text-text-primary text-xs font-extrabold truncate flex items-center">
            {loading
              ? 'Loading…'
              : words.length === 0
                ? 'Nothing here yet.'
                : maskCurrent ? '• • •' : words[index]}
          </span>
        </button>

        {/* Desktop/tablet: prev arrow, scrolling chip strip, next arrow. */}
        <button
          onClick={onPrev}
          disabled={disablePrev}
          className="hidden sm:flex shrink-0 btn-3d w-8 h-8 rounded-xl items-center justify-center bg-bg-card text-text-secondary hover:text-text-primary disabled:cursor-not-allowed"
          title="Previous word"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {loading ? (
          <div className="hidden sm:flex flex-1 items-center gap-2 py-1.5 text-xs text-text-muted">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin shrink-0" />
            Loading…
          </div>
        ) : words.length === 0 ? (
          <div className="hidden sm:block flex-1 py-1.5 text-xs text-text-muted">Nothing here yet.</div>
        ) : (
          <div
            ref={scroller}
            className="hidden sm:flex flex-1 gap-1.5 overflow-x-auto py-0.5"
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
          className="hidden sm:flex shrink-0 btn-3d w-8 h-8 rounded-xl items-center justify-center bg-bg-card text-text-secondary hover:text-text-primary disabled:cursor-not-allowed"
          title="Next word"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {showList && (
        <WordListPopup
          words={words}
          index={index}
          filter={filter}
          onFilterChange={onFilterChange}
          maskCurrent={maskCurrent}
          loading={loading}
          onPick={(i) => {
            onPick(i);
            setShowList(false);
          }}
          onClose={() => setShowList(false)}
        />
      )}
    </div>
  );
}

/**
 * Mobile popup pairing the filter Selector with the word list it produces,
 * the list as plain hyperlink-style text ("word, word, …") rather than
 * bordered chips — switching the Selector here updates the list right
 * below it, in the same view.
 */
function WordListPopup({
  words, index, filter, onFilterChange, maskCurrent, loading, onPick, onClose,
}: {
  words: string[];
  index: number;
  filter: Filter;
  onFilterChange: (filter: Filter) => void;
  maskCurrent: boolean;
  loading: boolean;
  onPick: (index: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm max-h-[75vh] flex flex-col rounded-2xl border-2 border-border bg-bg-card shadow-2xl animate-pop-in"
      >
        <div className="px-4 pt-4 pb-3 flex items-center gap-2">
          <span className="text-xs font-bold text-text-muted shrink-0">List:</span>
          <Selector value={filter} options={FILTER_OPTIONS} onChange={onFilterChange} ariaLabel="Word list" />
        </div>

        {/* Rounded + clipped on its own, rather than on the dialog as a
            whole — the dialog can't clip overflow, or the Selector's
            dropdown (an absolutely positioned child anchored in the header
            above) gets cut off against the dialog's own bounds. */}
        <div className="flex-1 overflow-y-auto rounded-b-2xl px-4 pb-4 text-base font-semibold leading-relaxed">
          {loading ? (
            <span className="text-text-muted">Loading…</span>
          ) : words.length === 0 ? (
            <span className="text-text-muted">Nothing here yet.</span>
          ) : (
            words.map((w, i) => {
              // Hide the current word while it's still being guessed — otherwise
              // the answer is readable straight off the list.
              const masked = i === index && maskCurrent;
              return (
                <span key={i}>
                  {i > 0 && <span className="text-text-muted">{', '}</span>}
                  <button
                    type="button"
                    onClick={() => onPick(i)}
                    className={i === index
                      ? 'font-extrabold text-accent-cyan underline underline-offset-2'
                      : 'font-semibold text-text-secondary underline decoration-border-light underline-offset-2'}
                  >
                    {masked ? '• • •' : w}
                  </button>
                </span>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
