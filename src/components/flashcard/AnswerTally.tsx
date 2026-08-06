import { useState } from 'react';
import { Icon } from '@iconify/react';
import type { AnswerVia, WordProgress } from '../../types';

/** "just now / 5m ago / 3h ago / 2d ago", or the date for older answers. */
function timeAgo(iso: string, now: number): string {
  const ms = now - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  if (ms < 30 * 86_400_000) return `${Math.floor(ms / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// How an answer was given, shown on each history row — quiz question formats
// and guess games (labels/icons match their pickers), plus the game-less
// flash-card actions (Know it / Reveal).
const VIA_META: Record<AnswerVia, { label: string; icon: string }> = {
  choice:    { label: 'Choice',     icon: 'lucide:list-checks' },
  letters:   { label: 'Letters',    icon: 'lucide:type' },
  listen:    { label: 'Listen',     icon: 'lucide:headphones' },
  gap:       { label: 'Fill gap',   icon: 'lucide:text-cursor-input' },
  scramble:  { label: 'Unscramble', icon: 'lucide:shuffle' },
  hangman:   { label: 'Hangman',    icon: 'lucide:skull' },
  vowels:    { label: 'No Vowels',  icon: 'lucide:circle-dashed' },
  speak:     { label: 'Speak',      icon: 'lucide:mic' },
  meaning:   { label: 'Meaning',    icon: 'lucide:book-open' },
  flashcard: { label: 'Flash card', icon: 'lucide:layers' },
};

/**
 * Lifetime correct/incorrect tally for the word, shown once revealed. Both
 * segments carry an icon + word + count so the meter never relies on the
 * green/red hues alone (they blend for red-green colorblind readers).
 * A History toggle expands the per-answer log (each answer's datetime).
 */
export function AnswerTally({ progress }: { progress: WordProgress | undefined }) {
  // "now" is stamped when the log is opened rather than read during render:
  // the relative times ("5m ago") then stay put while the panel is on screen,
  // instead of silently shifting on every unrelated re-render.
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const showHistory = openedAt !== null;
  const toggleHistory = () => setOpenedAt(showHistory ? null : Date.now());
  const correct = progress?.correct ?? 0;
  const wrong = progress?.wrong ?? 0;
  const total = correct + wrong;
  if (total === 0) return null;
  const history = progress?.history ?? [];
  return (
    <div className="mt-3 pt-3 border-t border-border/60">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider">
          Your answers
        </h4>
        {history.length > 0 && (
          <button
            onClick={toggleHistory}
            className="flex items-center gap-1 text-[11px] font-bold text-text-muted hover:text-accent-cyan transition-colors"
          >
            <Icon icon="lucide:history" className="text-sm" />
            {showHistory ? 'Hide history' : 'History'}
            <Icon icon={showHistory ? 'lucide:chevron-up' : 'lucide:chevron-down'} className="text-xs" />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between mb-1.5 text-xs font-bold">
        <span className="flex items-center gap-1 text-accent-green">
          <Icon icon="lucide:check" className="text-sm" />
          {correct} correct
        </span>
        <span className="flex items-center gap-1 text-accent-red">
          <Icon icon="lucide:x" className="text-sm" />
          {wrong} wrong
        </span>
      </div>
      <div
        className="flex h-2 rounded-full overflow-hidden bg-bg-tertiary"
        role="img"
        aria-label={`${correct} correct, ${wrong} wrong`}
      >
        {correct > 0 && <div className="bg-accent-green rounded-full" style={{ width: `${(correct / total) * 100}%` }} />}
        {correct > 0 && wrong > 0 && <div className="w-0.5 shrink-0" />}
        {wrong > 0 && <div className="bg-accent-red rounded-full" style={{ width: `${(wrong / total) * 100}%` }} />}
      </div>

      {/* Per-answer log, newest first — when each round was answered and how */}
      {showHistory && (
        <div className="mt-2.5 animate-fade-in">
          <ul className="max-h-44 overflow-y-auto divide-y divide-border/40 rounded-xl border border-border/60">
            {[...history].reverse().map((ev, i) => (
              <li key={`${ev.at}-${i}`} className="flex items-center gap-2 px-3 py-1.5 text-xs bg-bg-tertiary/40">
                <Icon
                  icon={ev.ok ? 'lucide:check' : 'lucide:x'}
                  className={`text-sm shrink-0 ${ev.ok ? 'text-accent-green' : 'text-accent-red'}`}
                />
                <span className={`font-bold ${ev.ok ? 'text-accent-green' : 'text-accent-red'}`}>
                  {ev.ok ? 'Correct' : 'Wrong'}
                </span>
                {ev.via && VIA_META[ev.via] && (
                  <span className="flex items-center gap-1 text-text-muted">
                    <Icon icon={VIA_META[ev.via].icon} className="text-sm shrink-0" />
                    {VIA_META[ev.via].label}
                  </span>
                )}
                <span
                  className="ml-auto text-text-muted"
                  title={new Date(ev.at).toLocaleString()}
                >
                  {timeAgo(ev.at, openedAt ?? 0)}
                </span>
              </li>
            ))}
          </ul>
          {history.length >= 50 && (
            <p className="mt-1.5 text-[10px] text-text-muted">
              Showing the last {history.length} rounds — earlier answers are only in the totals above.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
