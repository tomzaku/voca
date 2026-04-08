import { useState, useEffect } from 'react';
import { generateWordData, WORD_LIST } from '../lib/wordService';
import type { VocabularyWord } from '../types';

type GamePhase = 'loading' | 'playing' | 'finished';

interface Question {
  word: string;
  definition: string;
  options: string[];
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  bookmarks: string[];
  onBack: () => void;
}

export function BookmarkGame({ bookmarks, onBack }: Props) {
  const [phase, setPhase] = useState<GamePhase>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [restartKey, setRestartKey] = useState(0);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    setPhase('loading');
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setQuestions([]);

    async function build() {
      const dataMap: Record<string, VocabularyWord> = {};

      await Promise.all(
        bookmarks.map(async (word) => {
          const entry = WORD_LIST.find((w) => w.word === word);
          const level = entry?.level ?? 'intermediate';
          try {
            const data = await generateWordData(word, level);
            dataMap[word] = data;
          } catch { /* skip */ }
        }),
      );

      const loaded = Object.keys(dataMap);
      if (loaded.length === 0) { onBack(); return; }

      const wrongPool = shuffle(WORD_LIST.map((w) => w.word).filter((w) => !loaded.includes(w)));

      const qs: Question[] = shuffle(loaded).map((word) => {
        const wrong = shuffle([
          ...loaded.filter((w) => w !== word),
          ...wrongPool,
        ]).slice(0, 3);
        return {
          word,
          definition: dataMap[word].definition,
          options: shuffle([word, ...wrong]),
        };
      });

      setQuestions(qs);
      setPhase('playing');
    }

    build();
  }, [bookmarks, onBack, restartKey]);

  const handleSelect = (option: string) => {
    if (selected !== null) return;
    setSelected(option);
    if (option === questions[current].word) setScore((s) => s + 1);

    setTimeout(() => {
      const next = current + 1;
      if (next >= questions.length) {
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
    setRevealedIndices((prev) => new Set([...prev, i]));
  };

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
            onClick={() => setRestartKey((k) => k + 1)}
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

      {/* Definition card */}
      <div className="bg-bg-card border border-border rounded-2xl p-6 mb-6">
        <p className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-4">
          Which word matches this definition?
        </p>
        <p className="text-text-primary leading-relaxed text-base">{q.definition}</p>
      </div>

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
