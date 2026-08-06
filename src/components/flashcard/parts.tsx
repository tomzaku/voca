// Small presentational pieces shared by both faces of the flash card — the
// guess view (word hidden) and the revealed view. Anything used by only one of
// them lives in that view's file instead.

import { maskAnswer, familyForms } from '../../lib/answerMask';
import { PeekText } from '../PeekText';
import type { VocabularyWord } from '../../types';

// Dictionary abbreviations for the part-of-speech chip. The full word is fine on
// desktop, but on a phone "adjective" alone eats the header row.
const POS_ABBR: [RegExp, string][] = [
  [/^phrasal verb/i, 'phr.v.'],
  [/^noun/i, 'n.'],
  [/^verb/i, 'v.'],
  [/^adjective/i, 'adj.'],
  [/^adverb/i, 'adv.'],
  [/^pronoun/i, 'pron.'],
  [/^preposition/i, 'prep.'],
  [/^conjunction/i, 'conj.'],
  [/^interjection/i, 'interj.'],
  [/^determiner/i, 'det.'],
  [/^article/i, 'art.'],
  [/^idiom/i, 'idiom'],
];

function abbreviatePos(pos: string): string {
  const hit = POS_ABBR.find(([re]) => re.test(pos.trim()));
  // Unknown labels fall back to the first four letters ("particle" → "part…"),
  // which still beats wrapping the row.
  return hit ? hit[1] : pos.trim().length > 5 ? `${pos.trim().slice(0, 4)}.` : pos.trim();
}

/** Part-of-speech chip: abbreviated on mobile, spelled out from `sm` up. */
export function PosChip({ pos, className = '' }: { pos: string; className?: string }) {
  return (
    <span
      title={pos}
      className={`shrink-0 font-medium text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded whitespace-nowrap ${className}`}
    >
      <span className="sm:hidden">{abbreviatePos(pos)}</span>
      <span className="hidden sm:inline">{pos}</span>
    </span>
  );
}

/** Definition-length switch — a two-segment control with Short on the left
 *  (the default) and Full on the right, so it reads as a switch rather than a
 *  button. Shown only when a short definition exists (without one there is
 *  nothing to switch between). */
export function DefLengthToggle({ show, fullDef, onToggle }: {
  show: boolean;
  fullDef: boolean;
  onToggle: () => void;
}) {
  if (!show) return null;
  const setFull = (want: boolean) => {
    if (want !== fullDef) onToggle();
  };
  return (
    <div
      role="switch"
      aria-checked={fullDef}
      title={fullDef ? 'Showing the full definition' : 'Showing the short definition'}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-bg-tertiary p-0.5 text-[10px] font-bold select-none"
    >
      <button
        type="button"
        onClick={() => setFull(false)}
        className={`px-1.5 sm:px-2 py-0.5 rounded-full transition-colors ${fullDef ? 'text-text-muted hover:text-text-secondary' : 'bg-accent-cyan/20 text-accent-cyan'}`}
      >
        Short
      </button>
      <button
        type="button"
        onClick={() => setFull(true)}
        className={`px-1.5 sm:px-2 py-0.5 rounded-full transition-colors ${fullDef ? 'bg-accent-cyan/20 text-accent-cyan' : 'text-text-muted hover:text-text-secondary'}`}
      >
        Full
      </button>
    </div>
  );
}

/**
 * Example sentences, shown beneath the definition. `masked` is the guessing
 * face: the first two only, with the answer blanked out and no read-aloud
 * button (hearing the sentence would say the answer out loud). Revealed, it's
 * every example, each with its own play button and every word peekable.
 */
export function ExampleList({ wordData, masked = false, speakingExample, onSpeak }: {
  wordData: VocabularyWord;
  masked?: boolean;
  speakingExample: number | null;
  onSpeak: (index: number, text: string) => void;
}) {
  if (wordData.examples.length === 0) return null;
  const answerWord = wordData.headword || wordData.word;
  const examples = masked ? wordData.examples.slice(0, 2) : wordData.examples;
  return (
    <div className="mt-3 pt-3 border-t border-border/60">
      <h4 className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-2">Examples</h4>
      <ul className="space-y-2">
        {examples.map((ex, i) => {
          const text = masked ? maskAnswer(ex, answerWord, familyForms(wordData.wordFamily)) : ex;
          return (
            <li key={i} className="flex gap-3 text-sm text-text-secondary leading-relaxed">
              {masked ? (
                <span className="text-accent-cyan shrink-0 mt-0.5">▸</span>
              ) : (
                <button
                  onClick={() => onSpeak(i, text)}
                  title="Read aloud"
                  className={`shrink-0 w-6 h-6 mt-0.5 rounded-md flex items-center justify-center border transition-all ${
                    speakingExample === i
                      ? 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30'
                      : 'bg-bg-tertiary text-text-muted border-border hover:text-accent-cyan hover:border-accent-cyan/30'
                  }`}
                >
                  {speakingExample === i ? (
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
                      <rect x="0" y="0" width="4" height="10" rx="1" /><rect x="6" y="0" width="4" height="10" rx="1" />
                    </svg>
                  ) : (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  )}
                </button>
              )}
              <span className={masked ? 'italic' : ''}>
                {masked ? text : <PeekText text={ex} highlight={answerWord} boldHighlight />}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
