// Where this word stands, as a tag on the card — and what else stands there
// with it.
//
// A word's bucket ("Struggling", "Learning", …) is only half the story: the
// useful question right after reading it is "what else am I struggling with?".
// So the tag opens a peek at its bucket-mates, with a link into History
// filtered to the same bucket for the full list.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import { useVocabularyStore } from '../../hooks/useVocabulary';
import { BUCKET_META, wordBucket } from '../../lib/progress';
import type { WordProgress } from '../../types';

/** How many bucket-mates the popover shows before deferring to History. */
const PREVIEW = 10;

export function BucketTag({
  word,
  progress,
}: {
  word: string;
  progress: WordProgress | undefined;
}) {
  const bucket = wordBucket(progress);
  const meta = BUCKET_META[bucket];
  const all = useVocabularyStore((s) => s.progress);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Other words in the same bucket, most recently seen first — what you
  // touched last is what you're most likely to recognise.
  const peers = useMemo(() => {
    const lower = word.toLowerCase();
    return Object.values(all)
      .filter((p) => p.word.toLowerCase() !== lower && wordBucket(p) === bucket)
      .sort((a, b) => (b.seenAt ?? '').localeCompare(a.seenAt ?? ''))
      .map((p) => p.word);
  }, [all, bucket, word]);

  // Click-away / Escape, so the popover never traps the card underneath it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const hidden = peers.length - PREVIEW;

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title={`${meta.hint} — see other ${meta.label.toLowerCase()} words`}
        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap cursor-pointer transition-opacity hover:opacity-80 ${meta.chip}`}
      >
        <Icon icon={meta.icon} className="text-xs" />
        {meta.label}
        <Icon
          icon="lucide:chevron-down"
          className={`text-xs transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-30 w-64 sm:w-72 rounded-xl border-2 border-border bg-bg-card p-3 shadow-xl animate-fade-in">
          <p className={`text-[11px] font-bold ${meta.text}`}>
            {peers.length === 0
              ? `No other ${meta.label.toLowerCase()} words`
              : `${peers.length} ${meta.label.toLowerCase()} word${peers.length === 1 ? '' : 's'}`}
          </p>
          <p className="text-[10px] text-text-muted mt-0.5 leading-snug">{meta.hint}</p>

          {peers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {peers.slice(0, PREVIEW).map((w) => (
                <Link
                  key={w}
                  to={`/?word=${encodeURIComponent(w)}`}
                  onClick={() => setOpen(false)}
                  className="px-2 py-0.5 rounded-full text-[11px] bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border"
                >
                  {w}
                </Link>
              ))}
            </div>
          )}

          {/* Always offered, even under 10 words: History is where you act on
              the list (quiz it, review it), not just read it. */}
          <Link
            to={`/history?tab=${meta.tab}`}
            onClick={() => setOpen(false)}
            className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-[11px] font-bold bg-bg-tertiary text-text-secondary hover:text-accent-cyan border border-border transition-colors"
          >
            {hidden > 0 ? `See all ${peers.length}` : 'See more'}
            <Icon icon="lucide:arrow-right" className="text-xs" />
          </Link>
        </div>
      )}
    </div>
  );
}
