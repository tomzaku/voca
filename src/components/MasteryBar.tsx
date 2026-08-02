// Where your vocabulary stands, as one stacked bar.
//
// The rest of the dashboard measures *activity* — what you did and when. This
// measures *state*, which is the thing that says whether the activity is
// working: a long streak with nothing reaching Mastered is worth knowing about.
//
// Classification is `wordBucket()` from lib/progress, the same function the
// Learn-page rotation and CollectionStats use, so the numbers here always agree
// with what the app actually serves you.

import { useMemo } from 'react';
import { Icon } from '@iconify/react';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { wordBucket, type WordBucket } from '../lib/progress';

/**
 * Ordered as a progression — never answered, struggling, in rotation, done —
 * so the bar reads left-to-right as forward movement. Colours match
 * CollectionStats so one bucket means one colour everywhere in the app.
 */
const BUCKETS: {
  id: Exclude<WordBucket, 'dismissed'>;
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

  const { counts, total, dismissed } = useMemo(() => {
    const counts: Record<string, number> = {
      pending: 0,
      difficult: 0,
      learning: 0,
      mastered: 0,
    };
    let dismissed = 0;
    for (const p of Object.values(progress)) {
      const bucket = wordBucket(p);
      // Skipped-for-good words are out of rotation entirely. Counting them here
      // would pad the denominator with words you've opted out of and make the
      // mastered share look worse than it is.
      if (bucket === 'dismissed') dismissed++;
      else counts[bucket]++;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { counts, total, dismissed };
  }, [progress]);

  if (total === 0) return null;

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
            <span className={`flex-1 h-full ${b.bar}`} />
          </span>
        ))}
      </div>

      {/* Labels and counts carry the data; colour only reinforces — so the
          panel still reads without colour vision. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
        {BUCKETS.map((b) => (
          <div key={b.id} className="flex items-center gap-1.5 text-xs" title={b.hint}>
            <Icon icon={b.icon} className={`${b.text} text-sm shrink-0`} />
            <span className="text-text-secondary truncate">{b.label}</span>
            <span className={`ml-auto font-display font-extrabold tabular-nums ${b.text}`}>
              {counts[b.id]}
            </span>
          </div>
        ))}
      </div>

      {dismissed > 0 && (
        <p className="text-[11px] text-text-muted/70 mt-3">
          {dismissed} word{dismissed === 1 ? '' : 's'} skipped for good and left out of the total —
          restore them from History.
        </p>
      )}
    </section>
  );
}
