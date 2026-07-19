import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { WordProgress } from '../types';
import { useVocabularyStore } from '../hooks/useVocabulary';
import { isDue } from '../lib/srs';
import { whyLine } from '../lib/progress';

const DAY = 86_400_000;

/** Which count/bar a popup is showing — drives its plain-language explainer. */
type PopupKind = 'due' | 'learning' | 'mastered';

/** One-line "why are these here" for each kind of list. */
const EXPLAIN: Record<PopupKind, string> = {
  due: 'You learned these earlier and their review gap has now passed, so they’re back. Reviewing them again — right as you’re about to forget — is what makes them stick.',
  learning: 'Words on your review schedule. Answer one correctly and it comes back after a longer gap each time (days → weeks), until it graduates to Mastered.',
  mastered: 'You answered these correctly until their gap passed ~21 days, so they’ve graduated and won’t come back on their own.',
};

/** Relative "when is this due" label for a word in the popup. */
function dueLabel(p: WordProgress): string {
  if (!p.dueAt) return '';
  const diff = new Date(p.dueAt).getTime() - Date.now();
  if (diff <= 0) return 'due now';
  const days = Math.round(diff / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days}d`;
}

/**
 * Spaced-repetition overview: a plain-language summary, the three headline
 * counts (due / learning / mastered), and a 7-day forecast with weekday labels.
 * Every count and every bar is clickable — tap one to see exactly *which*
 * words it stands for, each a link to open that word. Words enter the schedule
 * as you answer them on the Learn page; getting one right pushes its next
 * review further out until, after ~21 days, it's mastered.
 */
export function ReviewPanel() {
  const progress = useVocabularyStore((s) => s.progress);
  // What the popup is currently showing (null = closed).
  const [popup, setPopup] = useState<{ title: string; kind: PopupKind; words: WordProgress[] } | null>(null);

  // Dismissed words (skipped for good) are out of rotation — not part of the schedule.
  const entries = Object.values(progress).filter((p) => p.status !== 'dismissed');
  const learning = entries.filter((p) => p.dueAt && !p.mastered);
  const masteredWords = entries.filter((p) => p.mastered);
  const now = Date.now();
  const dueWords = entries.filter((p) => isDue(p, now)).sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? ''));

  const empty = learning.length === 0 && masteredWords.length === 0;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  // Words bucketed by the day they're due — index 0 = today (incl. overdue),
  // 1..6 = the next six days. Keeping the words (not just counts) lets each bar
  // open the list behind it.
  const buckets: WordProgress[][] = Array.from({ length: 7 }, () => []);
  for (const p of learning) {
    const offset = Math.max(0, Math.floor((new Date(p.dueAt!).getTime() - startOfToday.getTime()) / DAY));
    if (offset < 7) buckets[offset].push(p);
  }
  const maxB = Math.max(1, ...buckets.map((b) => b.length));
  const dueToday = buckets[0].length;
  const thisWeek = buckets.slice(1).reduce((a, b) => a + b.length, 0);

  const weekdayLabel = (offset: number) => {
    if (offset === 0) return 'Today';
    const d = new Date(startOfToday.getTime() + offset * DAY);
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  };

  const openBucket = (i: number) => {
    if (buckets[i].length === 0) return;
    setPopup({ title: `Due ${i === 0 ? 'today' : weekdayLabel(i)}`, kind: 'due', words: buckets[i] });
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-text-muted uppercase tracking-wider">Review</h2>
        <Link
          to="/"
          className={`text-xs font-bold ${dueWords.length ? 'text-accent-cyan hover:underline' : 'text-text-muted'}`}
        >
          {dueWords.length ? `Review ${dueWords.length} due →` : empty ? 'Start learning →' : 'All caught up ✓'}
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-bg-card p-4">
        {empty ? (
          <p className="text-xs text-text-muted leading-relaxed text-center px-2 py-1">
            Answer words on the <Link to="/" className="text-accent-cyan hover:underline font-medium">Learn</Link> page to
            start your schedule. Get one right and it comes back later at a longer gap — again and again until it's mastered.
          </p>
        ) : (
          <>
            {/* Plain-language lead — the one line that says what to do now. */}
            <p className="text-sm text-text-secondary leading-snug mb-4">
              {dueToday > 0 ? (
                <button onClick={() => setPopup({ title: 'Due today', kind: 'due', words: buckets[0] })} className="hover:underline">
                  <span className="font-display font-extrabold text-accent-orange">{dueToday}</span>{' '}
                  {dueToday === 1 ? 'word' : 'words'} due today
                </button>
              ) : (
                <span className="font-medium text-text-primary">Nothing due today</span>
              )}
              {thisWeek > 0 && (
                <>
                  {' · '}
                  <span className="font-display font-extrabold text-accent-cyan">{thisWeek}</span>{' '}
                  more this week
                </>
              )}
              .
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <Stat value={dueWords.length} label="Due now" color="text-accent-orange" title="Words scheduled and ready to review right now — tap to see them."
                onClick={dueWords.length ? () => setPopup({ title: 'Due now', kind: 'due', words: dueWords }) : undefined} />
              <Stat value={learning.length} label="Learning" color="text-accent-cyan" title="Words on the review schedule, not yet mastered — tap to see them."
                onClick={learning.length ? () => setPopup({ title: 'Learning', kind: 'learning', words: [...learning].sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? '')) }) : undefined} />
              <Stat value={masteredWords.length} label="Mastered" color="text-accent-green" title="Words you got right until their gap passed ~21 days — they graduate and stop coming back. Tap to see them."
                onClick={masteredWords.length ? () => setPopup({ title: 'Mastered', kind: 'mastered', words: masteredWords }) : undefined} />
            </div>

            {/* 7-day forecast — click a bar to see that day's words. */}
            <div className="flex items-end justify-between gap-1.5">
              {buckets.map((b, i) => {
                const n = b.length;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => openBucket(i)}
                    disabled={n === 0}
                    className={`flex-1 flex flex-col items-center gap-1 rounded-md px-0.5 py-1 -mx-0.5 transition-colors ${n ? 'hover:bg-bg-tertiary cursor-pointer' : 'cursor-default'}`}
                    title={n ? `${n} review${n === 1 ? '' : 's'} ${i === 0 ? 'today' : `on ${weekdayLabel(i)}`} — tap to see` : 'Nothing scheduled'}
                  >
                    <span className={`text-[10px] font-bold leading-none ${n ? 'text-text-secondary' : 'text-transparent'}`}>
                      {n || 0}
                    </span>
                    <div className="w-full flex items-end justify-center h-12">
                      <div
                        className={`w-full rounded-t ${i === 0 ? 'bg-accent-orange/70' : 'bg-accent-cyan/60'}`}
                        style={{ height: `${(n / maxB) * 100}%`, minHeight: n ? 4 : 2 }}
                      />
                    </div>
                    <span className={`text-[9px] ${i === 0 ? 'text-accent-orange font-bold' : 'text-text-muted'}`}>
                      {weekdayLabel(i)}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Legend — which colour means what. */}
            <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-accent-orange/70" /> Due
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-accent-cyan/60" /> Upcoming
              </span>
            </div>
          </>
        )}
      </div>

      {popup && <WordPopup title={popup.title} kind={popup.kind} words={popup.words} onClose={() => setPopup(null)} />}
    </section>
  );
}

/** Modal listing the words behind a count/bar. Leads with a plain-language
 *  explanation of *why* these words are here, then each row shows the word, its
 *  personal review history (the reason it resurfaced), and its next-due timing —
 *  and links to open the word. */
function WordPopup({ title, kind, words, onClose }: {
  title: string; kind: PopupKind; words: WordProgress[]; onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm max-h-[75vh] flex flex-col rounded-2xl border border-border bg-bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border">
          <div className="min-w-0">
            <h3 className="text-sm font-display font-extrabold text-text-primary">
              {title}
              <span className="ml-2 text-[11px] font-bold text-text-muted">{words.length}</span>
            </h3>
            {/* Why are these words here? */}
            <p className="mt-1 text-[11px] text-text-muted leading-relaxed">{EXPLAIN[kind]}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto divide-y divide-border">
          {words.map((p) => (
            <Link
              key={p.word}
              to={`/?word=${encodeURIComponent(p.word)}`}
              onClick={onClose}
              className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-bg-tertiary transition-colors"
            >
              <div className="min-w-0">
                <div className="font-display font-bold text-text-primary truncate hover:text-accent-cyan">{p.word}</div>
                {/* The personal "why": how often / how recently it was reviewed. */}
                <div className="text-[10px] text-text-muted">{whyLine(p)}</div>
              </div>
              <span className="shrink-0 text-[11px] font-medium text-text-muted whitespace-nowrap">
                {kind === 'mastered' ? 'mastered' : dueLabel(p)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label, color, title, onClick }: {
  value: number; label: string; color: string; title: string; onClick?: () => void;
}) {
  const content = (
    <>
      <div className={`text-xl font-display font-extrabold ${color}`}>{value}</div>
      <div className="text-[10px] text-text-muted mt-0.5">{label}</div>
    </>
  );
  if (!onClick) {
    return <div className="text-center px-1 py-1" title={title}>{content}</div>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="text-center px-1 py-1 rounded-lg hover:bg-bg-tertiary transition-colors"
    >
      {content}
    </button>
  );
}
