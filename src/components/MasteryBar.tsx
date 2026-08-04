// Where your vocabulary stands, as one stacked bar.
//
// The rest of the dashboard measures *activity* — what you did and when. This
// measures *state*, which is the thing that says whether the activity is
// working: a long streak with nothing reaching Mastered is worth knowing about.
//
// Classification is `wordBucket()` from lib/progress, the same function the
// Learn-page rotation and CollectionStats use, so the numbers here always agree
// with what the app actually serves you.

import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Link } from 'react-router-dom';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { wordBucket, type WordBucket } from '../lib/progress';

type Bucket = Exclude<WordBucket, 'dismissed'>;

/**
 * Ordered as a progression — never answered, struggling, in rotation, done —
 * so the bar reads left-to-right as forward movement. Colours match
 * CollectionStats so one bucket means one colour everywhere in the app.
 */
const BUCKETS: {
  id: Bucket;
  label: string;
  icon: string;
  bar: string;
  text: string;
  hint: string;
}[] = [
  {
    id: 'pending',
    label: 'Not started',
    icon: 'lucide:circle-dashed',
    bar: 'bg-accent-orange',
    text: 'text-accent-orange',
    hint: 'Never answered yet — waiting for their first round.',
  },
  {
    id: 'difficult',
    label: 'Struggling',
    icon: 'lucide:flame',
    bar: 'bg-accent-red',
    text: 'text-accent-red',
    hint: 'Failed the last round, or more wrong answers than correct — these repeat until learned.',
  },
  {
    id: 'learning',
    label: 'Learning',
    icon: 'lucide:refresh-cw',
    bar: 'bg-accent-cyan',
    text: 'text-accent-cyan',
    hint: 'On the review schedule, coming back at growing intervals.',
  },
  {
    id: 'mastered',
    label: 'Mastered',
    icon: 'lucide:sparkles',
    bar: 'bg-accent-green',
    text: 'text-accent-green',
    hint: 'Graduated — the review gap passed ~3 weeks.',
  },
];

export function MasteryBar() {
  const progress = useVocabularyStore((s) => s.progress);
  // Which bucket's words are open. Null = just the bar, as before.
  const [open, setOpen] = useState<Bucket | null>(null);

  const { words, counts, total, dismissed } = useMemo(() => {
    const words: Record<Bucket, string[]> = {
      pending: [],
      difficult: [],
      learning: [],
      mastered: [],
    };
    let dismissed = 0;
    // Most recently seen first: a list of struggling words is something you act
    // on, and what you touched last is what you're most likely to recognise.
    const entries = Object.values(progress).sort((a, b) =>
      (b.seenAt ?? '').localeCompare(a.seenAt ?? ''),
    );
    for (const p of entries) {
      const bucket = wordBucket(p);
      // Skipped-for-good words are out of rotation entirely. Counting them here
      // would pad the denominator with words you've opted out of and make the
      // mastered share look worse than it is.
      if (bucket === 'dismissed') dismissed++;
      else words[bucket].push(p.word);
    }
    const counts = Object.fromEntries(
      Object.entries(words).map(([k, v]) => [k, v.length]),
    ) as Record<Bucket, number>;
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { words, counts, total, dismissed };
  }, [progress]);

  if (total === 0) return null;

  const openBucket = open ? BUCKETS.find((b) => b.id === open) : null;

  return (
    <section className="rounded-2xl border-[3px] border-border bg-bg-card p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="flex items-center gap-2 text-sm font-display font-bold text-text-primary">
          <Icon icon="lucide:chart-pie" className="text-accent-purple" />
          Your vocabulary
        </h2>
        <span className="text-xs text-text-muted tabular-nums shrink-0">
          {total} word{total === 1 ? '' : 's'}
        </span>
      </div>

      {/* Segments separated by a hairline of the surface colour so adjacent
          fills stay distinguishable without borders. */}
      <div className="flex h-3 rounded-full overflow-hidden bg-bg-tertiary mb-3">
        {BUCKETS.map((b, i) => (
          <span
            key={b.id}
            className="flex h-full"
            style={{ width: `${(counts[b.id] / total) * 100}%` }}
            title={`${b.label}: ${counts[b.id]}`}
          >
            {i > 0 && <span className="w-0.5 h-full shrink-0" />}
            <span
              className={`flex-1 h-full ${b.bar} ${open && open !== b.id ? 'opacity-30' : ''} transition-opacity`}
            />
          </span>
        ))}
      </div>

      {/* Labels and counts carry the data; colour only reinforces — so the
          panel still reads without colour vision. Each one opens its words:
          "12 struggling" is only useful if you can see WHICH twelve. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
        {BUCKETS.map((b) => (
          <button
            key={b.id}
            onClick={() => setOpen((cur) => (cur === b.id ? null : b.id))}
            disabled={counts[b.id] === 0}
            aria-expanded={open === b.id}
            title={b.hint}
            className={`flex items-center gap-1.5 text-xs rounded-lg px-1.5 py-1 -mx-1.5 text-left transition-colors cursor-pointer disabled:cursor-default disabled:opacity-50 ${
              open === b.id ? 'bg-bg-tertiary' : 'hover:bg-bg-hover'
            }`}
          >
            <Icon icon={b.icon} className={`${b.text} text-sm shrink-0`} />
            <span className="text-text-secondary truncate">{b.label}</span>
            <span className={`ml-auto font-display font-extrabold tabular-nums ${b.text}`}>
              {counts[b.id]}
            </span>
          </button>
        ))}
      </div>

      {openBucket && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <p className={`text-xs font-bold ${openBucket.text}`}>
              {openBucket.label}
              <span className="ml-2 font-normal text-text-muted">{openBucket.hint}</span>
            </p>
            <button
              onClick={() => setOpen(null)}
              className="text-[11px] font-bold text-text-muted hover:text-text-primary shrink-0 cursor-pointer"
            >
              Hide
            </button>
          </div>
          {/* Capped height rather than a "show more": a long list is fine to
              scroll, and paging it would hide exactly the words someone opened
              this to find. */}
          <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto">
            {words[openBucket.id].map((word) => (
              <Link
                key={word}
                to={`/?word=${encodeURIComponent(word)}`}
                className="px-2.5 py-1 rounded-full text-xs bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border"
              >
                {word}
              </Link>
            ))}
          </div>
        </div>
      )}

      {dismissed > 0 && (
        <p className="text-[11px] text-text-muted/70 mt-3">
          {dismissed} word{dismissed === 1 ? '' : 's'} skipped for good and left out of the total —
          restore them from History.
        </p>
      )}
    </section>
  );
}
