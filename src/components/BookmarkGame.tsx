import { useState } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { generateWordData, WORD_LIST } from '../lib/wordService';
import { playCorrect, playWrong, playSelect, playWin } from '../lib/sfx';
import type { VocabularyWord } from '../types';

type GamePhase = 'select' | 'loading' | 'playing' | 'finished';

const MIN_WORDS = 2;

/** The kinds of question the quiz can ask. Every type has a *word* as its
 *  answer, so they all share the same options grid and letter-hint boxes. */
type QType = 'definition' | 'sentence' | 'synonym';

const Q_TYPES: QType[] = ['definition', 'sentence', 'synonym'];

const Q_TYPE_META: Record<QType, { label: string; hint: string; ask: string }> = {
  definition: { label: 'Definition', hint: 'Match a meaning to its word', ask: 'Which word matches this definition?' },
  sentence: { label: 'Sentence', hint: 'Fill the blank in a sentence', ask: 'Which word completes this sentence?' },
  synonym: { label: 'Synonym', hint: 'Pick the word from a synonym', ask: 'Which word means the same as this?' },
};

interface Question {
  type: QType;
  word: string;         // the correct answer
  prompt: string;       // the definition / blanked sentence / synonym clue
  options: string[];    // four word choices
  synonyms?: string[];  // hints — only surfaced on 'definition' questions
  antonyms?: string[];
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Replace the first whole-word occurrence of `word` in `sentence` with a
 *  blank. Returns null when the word doesn't appear verbatim (e.g. an inflected
 *  form), so the caller can fall back to another question type. */
function blankSentence(sentence: string, word: string): string | null {
  const re = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
  if (!re.test(sentence)) return null;
  return sentence.replace(re, '_____');
}

/** Build one question of the given type for `word`, or null if the word lacks
 *  the data that type needs (no usable example, no synonyms). `wrong` supplies
 *  three distractor words. */
function buildQuestion(
  type: QType,
  word: string,
  data: VocabularyWord,
  wrong: string[],
): Question | null {
  const base = {
    word,
    options: shuffle([word, ...wrong]),
    synonyms: data.synonyms,
    antonyms: data.antonyms,
  };
  if (type === 'sentence') {
    for (const ex of data.examples ?? []) {
      const blanked = blankSentence(ex, word);
      if (blanked) return { ...base, type, prompt: blanked };
    }
    return null;
  }
  if (type === 'synonym') {
    const syn = (data.synonyms ?? []).find((s) => s.toLowerCase() !== word.toLowerCase());
    if (!syn) return null;
    return { ...base, type, prompt: syn };
  }
  return { ...base, type, prompt: data.definition };
}

interface Props {
  bookmarks: string[];
  onBack: () => void;
}

export function BookmarkGame({ bookmarks, onBack }: Props) {
  const [phase, setPhase] = useState<GamePhase>('select');
  // Which words to quiz — all selected by default; tap to trim the set.
  const [chosen, setChosen] = useState<Set<string>>(() => new Set(bookmarks));
  // Which question types are in play — all on by default (a random mix).
  const [qTypes, setQTypes] = useState<Set<QType>>(() => new Set(Q_TYPES));
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());

  const toggle = (word: string) => {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else { next.add(word); playSelect(); }
      return next;
    });
  };

  const toggleType = (t: QType) => {
    setQTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) { if (next.size > 1) next.delete(t); } // keep at least one on
      else { next.add(t); playSelect(); }
      return next;
    });
  };

  // Build a quiz from the given words and start playing. Word data is
  // cache-first (see wordService), so already-seen words load without AI.
  const runQuiz = async (words: string[]) => {
    setPhase('loading');
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setQuestions([]);
    setRevealedIndices(new Set());

    const dataMap: Record<string, VocabularyWord> = {};
    await Promise.all(
      words.map(async (word) => {
        try {
          dataMap[word] = await generateWordData(word);
        } catch { /* skip */ }
      }),
    );

    const loaded = Object.keys(dataMap);
    if (loaded.length === 0) {
      toast.error('Could not load those words. Try again.');
      setPhase('select');
      return;
    }

    const wrongPool = shuffle(WORD_LIST.map((w) => w.word).filter((w) => !loaded.includes(w)));
    const enabled = Q_TYPES.filter((t) => qTypes.has(t));

    const qs: Question[] = shuffle(loaded).map((word) => {
      const data = dataMap[word];
      const wrong = shuffle([
        ...loaded.filter((w) => w !== word),
        ...wrongPool,
      ]).slice(0, 3);
      // Try the enabled types in random order; use the first this word supports.
      // 'definition' always works, so a question is guaranteed as long as it's on.
      for (const t of shuffle(enabled)) {
        const q = buildQuestion(t, word, data, wrong);
        if (q) return q;
      }
      // Every enabled type needed data this word lacks — fall back to definition.
      return buildQuestion('definition', word, data, wrong)!;
    });

    setQuestions(qs);
    setPhase('playing');
  };

  const start = () => {
    if (chosen.size < MIN_WORDS) return;
    runQuiz([...chosen]);
  };

  const handleSelect = (option: string) => {
    if (selected !== null) return;
    setSelected(option);
    if (option === questions[current].word) {
      setScore((s) => s + 1);
      playCorrect();
    } else {
      playWrong();
    }

    setTimeout(() => {
      const next = current + 1;
      if (next >= questions.length) {
        playWin();
        setPhase('finished');
      } else {
        setCurrent(next);
        setSelected(null);
        setRevealedIndices(new Set());
      }
    }, 1400);
  };

  const revealLetter = (i: number) => {
    if (selected !== null || revealedIndices.has(i)) return;
    playSelect();
    setRevealedIndices((prev) => new Set([...prev, i]));
  };

  // ── Select ───────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-bg-card border border-border text-text-secondary flex items-center justify-center shrink-0 hover:text-text-primary transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h1 className="font-display font-extrabold text-2xl text-accent-cyan leading-none">Quiz</h1>
            <p className="text-xs text-text-muted font-bold mt-1">Choose your words and question types</p>
          </div>
        </div>

        {/* ── Question types ── all on = a random mix ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-display font-extrabold text-text-muted uppercase tracking-wider">Question types</h2>
            <span className="text-[11px] font-bold text-text-muted">
              {qTypes.size === Q_TYPES.length ? 'Random mix' : `${qTypes.size} selected`}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {Q_TYPES.map((t) => {
              const on = qTypes.has(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`text-left px-3.5 py-2.5 rounded-xl border-2 transition-all ${
                    on
                      ? 'bg-accent-cyan/10 border-accent-cyan text-text-primary'
                      : 'bg-bg-card border-border text-text-muted hover:border-border-light'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-display font-extrabold text-sm">
                    <Icon
                      icon={on ? 'solar:check-circle-bold' : 'lucide:circle'}
                      className={on ? 'text-accent-cyan' : 'text-text-muted'}
                    />
                    {Q_TYPE_META[t].label}
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5 leading-tight">{Q_TYPE_META[t].hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Words ── */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-text-secondary">
            <span className="text-accent-cyan">{chosen.size}</span> of {bookmarks.length} words
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setChosen(new Set(bookmarks))}
              className="text-xs font-bold text-text-muted hover:text-text-primary transition-colors"
            >
              All
            </button>
            <span className="text-border">·</span>
            <button
              onClick={() => setChosen(new Set())}
              className="text-xs font-bold text-text-muted hover:text-text-primary transition-colors"
            >
              None
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {bookmarks.map((word) => {
            const on = chosen.has(word);
            return (
              <button
                key={word}
                onClick={() => toggle(word)}
                className={`px-3.5 py-2 rounded-full text-sm font-display font-extrabold border-2 transition-all hover:-translate-y-0.5 ${
                  on
                    ? 'bg-accent-cyan text-bg-primary border-accent-cyan'
                    : 'bg-bg-card text-text-secondary border-border hover:border-border-light'
                }`}
              >
                {on && <Icon icon="solar:check-circle-bold" className="inline mr-1 -mt-0.5" />}
                {word}
              </button>
            );
          })}
        </div>

        <button
          onClick={start}
          disabled={chosen.size < MIN_WORDS}
          className="w-full py-3.5 rounded-xl bg-accent-cyan text-bg-primary text-lg font-display font-extrabold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Start quiz ({chosen.size})
        </button>
        {chosen.size < MIN_WORDS && (
          <p className="text-center text-xs text-text-muted mt-3">Pick at least {MIN_WORDS} words.</p>
        )}
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
        <p className="text-sm text-text-muted">Preparing quiz…</p>
      </div>
    );
  }

  // ── Finished ─────────────────────────────────────────────────────────
  if (phase === 'finished') {
    const pct = Math.round((score / questions.length) * 100);
    const msg =
      pct === 100 ? 'Perfect!' :
      pct >= 75  ? 'Great job!' :
      pct >= 50  ? 'Good effort!' :
                   'Keep practicing!';

    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="text-7xl font-display font-bold text-text-primary mb-1">
          {score}
          <span className="text-text-muted text-3xl">/{questions.length}</span>
        </div>
        <p className="text-accent-cyan font-display font-bold text-xl mb-1">{msg}</p>
        <p className="text-text-muted text-sm mb-10">{pct}% correct</p>

        {/* Score bar */}
        <div className="w-full h-2 bg-bg-tertiary rounded-full mb-10 overflow-hidden">
          <div
            className="h-full bg-accent-cyan rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl border border-border text-text-muted text-sm hover:border-border-light hover:text-text-primary transition-all"
          >
            Back to list
          </button>
          <button
            onClick={() => setPhase('select')}
            className="px-5 py-2.5 rounded-xl border border-border text-text-muted text-sm hover:border-border-light hover:text-text-primary transition-all"
          >
            Pick words
          </button>
          <button
            onClick={() => runQuiz([...chosen])}
            className="px-5 py-2.5 rounded-xl bg-accent-cyan text-bg-primary text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Play again
          </button>
        </div>
      </div>
    );
  }

  // ── Playing ──────────────────────────────────────────────────────────
  const q = questions[current];

  return (
    <div className="max-w-lg mx-auto px-4 py-8 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Quit
        </button>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-text-muted">
            <span className="text-text-primary font-medium">{current + 1}</span>
            <span className="text-text-muted">/{questions.length}</span>
          </span>
          <span className="text-accent-green font-medium">{score} ✓</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-bg-tertiary rounded-full mb-8 overflow-hidden">
        <div
          className="h-full bg-accent-cyan rounded-full transition-all duration-500"
          style={{ width: `${(current / questions.length) * 100}%` }}
        />
      </div>

      {/* Question card — prompt varies by question type */}
      <div className="bg-bg-card border border-border rounded-2xl p-6 mb-6">
        <p className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-4">
          {Q_TYPE_META[q.type].ask}
        </p>
        {q.type === 'synonym' ? (
          <p className="text-center font-display font-extrabold text-2xl text-accent-cyan">“{q.prompt}”</p>
        ) : (
          <p className="text-text-primary leading-relaxed text-base">{q.prompt}</p>
        )}
      </div>

      {/* Hints: synonyms + antonyms — only on definition questions, where they
          help rather than give the answer away. */}
      {q.type === 'definition' && ((q.synonyms?.length ?? 0) > 0 || (q.antonyms?.length ?? 0) > 0) && (
        <div className="bg-bg-card border border-border rounded-2xl px-5 py-4 mb-5 space-y-2.5">
          <p className="text-xs font-display font-bold text-text-muted uppercase tracking-wider">Hints</p>
          {q.synonyms && q.synonyms.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-text-muted shrink-0">Synonyms:</span>
              {q.synonyms.map((s) => (
                <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">{s}</span>
              ))}
            </div>
          )}
          {q.antonyms && q.antonyms.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-text-muted shrink-0">Antonyms:</span>
              {q.antonyms.map((a) => (
                <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-accent-red/10 text-accent-red border border-accent-red/20">{a}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Word letter boxes */}
      <div className="flex gap-1.5 justify-center mb-5 flex-wrap">
        {q.word.split('').map((letter, i) => {
          const revealed = revealedIndices.has(i);
          const canReveal = selected === null && !revealed;
          return (
            <button
              key={i}
              onClick={() => canReveal && revealLetter(i)}
              disabled={!canReveal}
              title={canReveal ? 'Click to reveal this letter' : undefined}
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-display font-bold text-sm uppercase border-2 transition-all ${
                revealed
                  ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan cursor-default'
                  : canReveal
                  ? 'border-border bg-bg-tertiary text-transparent select-none hover:border-accent-cyan/40 hover:bg-accent-cyan/5 cursor-pointer'
                  : 'border-border bg-bg-tertiary text-transparent select-none cursor-default'
              }`}
            >
              {revealed ? letter : '·'}
            </button>
          );
        })}
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3">
        {q.options.map((opt) => {
          let cls = 'border-border bg-bg-card text-text-primary hover:border-border-light hover:bg-bg-hover';
          if (selected) {
            if (opt === q.word) {
              cls = 'border-accent-green bg-accent-green/10 text-accent-green';
            } else if (opt === selected) {
              cls = 'border-accent-red bg-accent-red/10 text-accent-red';
            } else {
              cls = 'border-border bg-bg-card text-text-muted opacity-40';
            }
          }
          return (
            <button
              key={opt}
              onClick={() => handleSelect(opt)}
              disabled={selected !== null}
              className={`py-4 px-3 rounded-xl border font-display font-bold text-sm text-center transition-all ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {selected && (
        <p className={`text-center text-sm mt-5 font-medium animate-fade-in ${
          selected === q.word ? 'text-accent-green' : 'text-accent-red'
        }`}>
          {selected === q.word ? '✓ Correct!' : `✗ The answer is "${q.word}"`}
        </p>
      )}
    </div>
  );
}
