import { useState } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl, type IntlShape } from 'react-intl';
import { useAuth } from '../../hooks/useAuth';
import { useVocabularyStore } from '../../hooks/useVocabulary';
import type { AnswerVia, WordProgress } from '../../types';

/** "just now / 5m ago / 3h ago / 2d ago", or the date for older answers. */
function timeAgo(intl: IntlShape, iso: string, now: number): string {
  const ms = now - new Date(iso).getTime();
  if (ms < 60_000) return intl.formatMessage({ id: 'bucket.agoJustNow' });
  if (ms < 3_600_000) return intl.formatMessage({ id: 'bucket.agoMinutes' }, { count: Math.floor(ms / 60_000) });
  if (ms < 86_400_000) return intl.formatMessage({ id: 'bucket.agoHours' }, { count: Math.floor(ms / 3_600_000) });
  if (ms < 30 * 86_400_000) return intl.formatMessage({ id: 'bucket.agoDays' }, { count: Math.floor(ms / 86_400_000) });
  return intl.formatDate(iso, { month: 'short', day: 'numeric', year: 'numeric' });
}

// How an answer was given, shown on each history row — quiz question formats
// and guess games (labels/icons match their pickers), plus the game-less
// flash-card actions (Know it / Reveal).
const VIA_META: Record<AnswerVia, { labelId: string; icon: string }> = {
  choice:    { labelId: 'flashcard.viaChoice',    icon: 'lucide:list-checks' },
  letters:   { labelId: 'flashcard.viaLetters',   icon: 'lucide:type' },
  listen:    { labelId: 'flashcard.viaListen',    icon: 'lucide:headphones' },
  gap:       { labelId: 'flashcard.viaGap',       icon: 'lucide:text-cursor-input' },
  scramble:  { labelId: 'flashcard.viaScramble',  icon: 'lucide:shuffle' },
  hangman:   { labelId: 'flashcard.viaHangman',   icon: 'lucide:skull' },
  vowels:    { labelId: 'flashcard.viaVowels',    icon: 'lucide:circle-dashed' },
  speak:     { labelId: 'flashcard.viaSpeak',     icon: 'lucide:mic' },
  meaning:   { labelId: 'flashcard.viaMeaning',   icon: 'lucide:book-open' },
  flashcard: { labelId: 'flashcard.viaFlashcard', icon: 'lucide:layers' },
};

/**
 * Lifetime correct/incorrect tally for the word, shown once revealed. Both
 * segments carry an icon + word + count so the meter never relies on the
 * green/red hues alone (they blend for red-green colorblind readers).
 * A History toggle expands the per-answer log (each answer's datetime).
 *
 * The tallies come with the word; the log does not — it's the biggest thing on
 * the row and nothing else displays it, so it's fetched the first time someone
 * opens this panel.
 */
export function AnswerTally({ progress }: { progress: WordProgress | undefined }) {
  // "now" is stamped when the log is opened rather than read during render:
  // the relative times ("5m ago") then stay put while the panel is on screen,
  // instead of silently shifting on every unrelated re-render.
  const intl = useIntl();
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const { user } = useAuth();
  const loadWordHistory = useVocabularyStore((s) => s.loadWordHistory);
  const showHistory = openedAt !== null;
  const toggleHistory = () => {
    if (showHistory) {
      setOpenedAt(null);
      return;
    }
    setOpenedAt(Date.now());
    // undefined = never fetched (an empty array is a word with no log).
    if (progress && progress.history === undefined && user) {
      void loadWordHistory(progress.word);
    }
  };
  const correct = progress?.correct ?? 0;
  const wrong = progress?.wrong ?? 0;
  const total = correct + wrong;
  if (total === 0) return null;
  const history = progress?.history;
  const loadingHistory = showHistory && history === undefined;
  return (
    <div className="mt-3 pt-3 border-t border-border/60">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider">
          <FormattedMessage id="flashcard.yourAnswers" />
        </h4>
        {/* Offered whenever there are answers — whether this word's log has
            been fetched yet is not something the reader should have to know. */}
        {total > 0 && (
          <button
            onClick={toggleHistory}
            className="flex items-center gap-1 text-[11px] font-bold text-text-muted hover:text-accent-cyan transition-colors"
          >
            <Icon icon="lucide:history" className="text-sm" />
            <FormattedMessage id={showHistory ? 'flashcard.hideHistory' : 'flashcard.history'} />
            <Icon icon={showHistory ? 'lucide:chevron-up' : 'lucide:chevron-down'} className="text-xs" />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between mb-1.5 text-xs font-bold">
        <span className="flex items-center gap-1 text-accent-green">
          <Icon icon="lucide:check" className="text-sm" />
          <FormattedMessage id="flashcard.correctCount" values={{ count: correct }} />
        </span>
        <span className="flex items-center gap-1 text-accent-red">
          <Icon icon="lucide:x" className="text-sm" />
          <FormattedMessage id="flashcard.wrongCount" values={{ count: wrong }} />
        </span>
      </div>
      <div
        className="flex h-1.5 rounded-full overflow-hidden bg-bg-tertiary"
        role="img"
        aria-label={intl.formatMessage({ id: 'flashcard.tallyLabel' }, { correct, wrong })}
      >
        {correct > 0 && <div className="bg-accent-green rounded-full" style={{ width: `${(correct / total) * 100}%` }} />}
        {correct > 0 && wrong > 0 && <div className="w-0.5 shrink-0" />}
        {/* Softer than the green: a word you've missed is something to work
            on, not an error, and an all-red bar shouted like one. */}
        {wrong > 0 && <div className="bg-accent-red/50 rounded-full"style={{ width: `${(wrong / total) * 100}%` }} />}
      </div>

      {/* Per-answer log, newest first — when each round was answered and how.
          Fetched on first open, so it starts as a spinner. */}
      {showHistory && loadingHistory && (
        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-text-muted animate-fade-in">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
          <FormattedMessage id="flashcard.loadingAnswers" />
        </div>
      )}
      {showHistory && history && history.length === 0 && (
        <p className="mt-2.5 text-[11px] text-text-muted animate-fade-in">
          <FormattedMessage id="flashcard.noAnswerLog" />
        </p>
      )}
      {showHistory && history && history.length > 0 && (
        <div className="mt-2.5 animate-fade-in">
          <ul className="max-h-44 overflow-y-auto divide-y divide-border/40 rounded-xl border border-border/60">
            {[...history].reverse().map((ev, i) => (
              <li key={`${ev.at}-${i}`} className="flex items-center gap-2 px-3 py-1.5 text-xs bg-bg-tertiary/40">
                <Icon
                  icon={ev.ok ? 'lucide:check' : 'lucide:x'}
                  className={`text-sm shrink-0 ${ev.ok ? 'text-accent-green' : 'text-accent-red'}`}
                />
                <span className={`font-bold ${ev.ok ? 'text-accent-green' : 'text-accent-red'}`}>
                  <FormattedMessage id={ev.ok ? 'flashcard.correct' : 'flashcard.wrong'} />
                </span>
                {ev.via && VIA_META[ev.via] && (
                  <span className="flex items-center gap-1 text-text-muted">
                    <Icon icon={VIA_META[ev.via].icon} className="text-sm shrink-0" />
                    <FormattedMessage id={VIA_META[ev.via].labelId} />
                  </span>
                )}
                <span
                  className="ml-auto text-text-muted"
                  title={intl.formatDate(ev.at, { dateStyle: 'medium', timeStyle: 'short' })}
                >
                  {timeAgo(intl, ev.at, openedAt ?? 0)}
                </span>
              </li>
            ))}
          </ul>
          {history.length >= 50 && (
            <p className="mt-1.5 text-[10px] text-text-muted">
              <FormattedMessage id="flashcard.historyCapped" values={{ count: history.length }} />
            </p>
          )}
        </div>
      )}
    </div>
  );
}
