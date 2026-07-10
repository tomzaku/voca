import { Link } from 'react-router-dom';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { isDue } from '../lib/srs';

const DAY = 86_400_000;
const DAY_LABELS = ['Today', '+1', '+2', '+3', '+4', '+5', '+6'];

/**
 * Spaced-repetition overview: how many words are due now, still being learned,
 * or mastered, plus a 7-day forecast. Words enter the schedule as you answer
 * them on the Learn page; getting one right pushes its next review further out
 * until, after ~21 days, it's mastered.
 */
export function ReviewPanel() {
  const progress = useVocabularyStore((s) => s.progress);
  // Dismissed words (skipped for good) are out of rotation — not part of the schedule.
  const entries = Object.values(progress).filter((p) => p.status !== 'dismissed');
  const learning = entries.filter((p) => p.dueAt && !p.mastered);
  const mastered = entries.filter((p) => p.mastered).length;
  const now = Date.now();
  const dueNow = entries.filter((p) => isDue(p, now)).length;

  const empty = learning.length === 0 && mastered === 0;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const buckets = Array.from({ length: 7 }, () => 0);
  for (const p of learning) {
    const offset = Math.max(0, Math.floor((new Date(p.dueAt!).getTime() - startOfToday.getTime()) / DAY));
    if (offset < 7) buckets[offset]++;
  }
  const maxB = Math.max(1, ...buckets);

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">Review</h2>
        <Link
          to="/"
          className={`text-xs font-bold ${dueNow ? 'text-accent-cyan hover:underline' : 'text-text-muted'}`}
        >
          {dueNow ? `Review ${dueNow} due →` : empty ? 'Start learning →' : 'All caught up ✓'}
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-bg-card p-4">
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Stat value={dueNow} label="Due now" color="text-accent-orange" title="Words scheduled and ready to review right now." />
          <Stat value={learning.length} label="Learning" color="text-accent-cyan" title="Words on the review schedule, not yet mastered." />
          <Stat value={mastered} label="Mastered" color="text-accent-green" title="Words you got right until their gap passed ~21 days — they graduate and stop coming back." />
        </div>

        {empty ? (
          <p className="text-xs text-text-muted leading-relaxed text-center px-2 py-1">
            Answer words on the <Link to="/" className="text-accent-cyan hover:underline font-medium">Learn</Link> page to
            start your schedule. Get one right and it comes back later at a longer gap — again and again until it's mastered.
          </p>
        ) : (
          <div className="flex items-end justify-between gap-1.5">
            {buckets.map((n, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center h-14" title={`${n} review${n === 1 ? '' : 's'}`}>
                  <div
                    className={`w-full rounded-t ${i === 0 ? 'bg-accent-orange/70' : 'bg-accent-cyan/60'}`}
                    style={{ height: `${(n / maxB) * 100}%`, minHeight: n ? 4 : 0 }}
                  />
                </div>
                <span className="text-[9px] text-text-muted">{DAY_LABELS[i]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ value, label, color, title }: { value: number; label: string; color: string; title: string }) {
  return (
    <div className="text-center" title={title}>
      <div className={`text-xl font-display font-extrabold ${color}`}>{value}</div>
      <div className="text-[10px] text-text-muted mt-0.5">{label}</div>
    </div>
  );
}
