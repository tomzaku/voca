import { useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import type { VocabularyWord } from '../../types';

/**
 * The back/forward strip of words seen this session, with the active collection
 * on its left. Owns only its own scrolling — which word is current, and what
 * moving between them does, belongs to the card.
 */
export function HistoryStrip({ words, index, collectionName, maskCurrent, busy, onPick, onPrev, onNext }: {
  words: VocabularyWord[];
  index: number;
  collectionName: string;
  /** Hide the current word's label — it's still being guessed. */
  maskCurrent: boolean;
  /** A word is loading; stepping again would race it. */
  busy: boolean;
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
  }, [index]);

  if (words.length === 0) return null;

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

      <button
        onClick={onPrev}
        disabled={index <= 0 || busy}
        className="btn-3d shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-bg-card text-text-secondary hover:text-text-primary disabled:cursor-not-allowed"
        title="Previous word"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

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
              {masked ? '• • •' : (w.headword || w.word)}
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

      <button
        onClick={onNext}
        disabled={busy}
        className="btn-3d shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-bg-card text-text-secondary hover:text-text-primary disabled:cursor-not-allowed"
        title="Next word"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
