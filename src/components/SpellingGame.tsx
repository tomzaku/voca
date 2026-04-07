import { useState, useEffect, useRef } from 'react';
import { generateWordData, WORD_LIST } from '../lib/wordService';
import type { VocabularyWord } from '../types';

type GamePhase = 'loading' | 'playing' | 'finished';

interface QuestionData {
  word: string;
  data: VocabularyWord;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

interface Props {
  bookmarks: string[];
  onBack: () => void;
}

const MAX_ATTEMPTS = 3;

export function SpellingGame({ bookmarks, onBack }: Props) {
  const [phase, setPhase] = useState<GamePhase>('loading');
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [current, setCurrent] = useState(0);
  const [input, setInput] = useState('');
  const [attempts, setAttempts] = useState<string[]>([]);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [restartKey, setRestartKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPhase('loading');
    setCurrent(0);
    setScore(0);
    setInput('');
    setAttempts([]);
    setRevealedIndices(new Set());
    setIsCorrect(null);
    setQuestions([]);

    async function build() {
      const results: QuestionData[] = [];
      await Promise.all(
        bookmarks.map(async (word) => {
          const entry = WORD_LIST.find((w) => w.word === word);
          const level = entry?.level ?? 'intermediate';
          try {
            const data = await generateWordData(word, level);
            results.push({ word, data });
          } catch { /* skip */ }
        }),
      );
      if (results.length === 0) { onBack(); return; }
      setQuestions(shuffle(results));
      setPhase('playing');
      setTimeout(() => inputRef.current?.focus(), 100);
    }

    build();
  }, [bookmarks, onBack, restartKey]);

  const q = questions[current];
  const word = q?.word ?? '';

  const advance = () => {
    const next = current + 1;
    if (next >= questions.length) {
      setPhase('finished');
    } else {
      setCurrent(next);
      setInput('');
      setAttempts([]);
      setRevealedIndices(new Set());
      setIsCorrect(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSubmit = () => {
    if (!input.trim() || isCorrect !== null) return;
    const guess = input.trim().toLowerCase();
    const answer = word.toLowerCase();

    if (guess === answer) {
      const pts = attempts.length === 0 && revealedIndices.size === 0 ? 2 : 1;
      setScore((s) => s + pts);
      setIsCorrect(true);
      setTimeout(advance, 1500);
    } else {
      const newAttempts = [...attempts, guess];
      setAttempts(newAttempts);
      setInput('');
      if (newAttempts.length >= MAX_ATTEMPTS) {
        setIsCorrect(false);
        setTimeout(advance, 2500);
      }
    }
  };

  const handleHint = () => {
    const unrevealed = word.split('').map((_, i) => i).filter((i) => !revealedIndices.has(i));
    if (unrevealed.length === 0) return;
    const idx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    setRevealedIndices((prev) => new Set([...prev, idx]));
  };

  // Word boxes with revealed hint letters
  const renderWordBoxes = () =>
    word.split('').map((letter, i) => {
      const revealed = revealedIndices.has(i);
      return (
        <div
          key={i}
          className={`w-9 h-9 rounded-lg flex items-center justify-center font-display font-bold text-sm uppercase border-2 transition-all ${
            revealed
              ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan'
              : 'border-border bg-bg-tertiary text-transparent select-none'
          }`}
        >
          {revealed ? letter : '·'}
        </div>
      );
    });

  // Attempt row: show guess vs answer letter-by-letter
  const renderAttempt = (guess: string) =>
    word.split('').map((letter, i) => {
      const guessLetter = guess[i];
      const correct = guessLetter?.toLowerCase() === letter.toLowerCase();
      return (
        <div
          key={i}
          className={`w-9 h-9 rounded-lg flex items-center justify-center font-display font-bold text-sm uppercase border-2 ${
            correct
              ? 'border-accent-green bg-accent-green/10 text-accent-green'
              : guessLetter
              ? 'border-accent-red/50 bg-accent-red/10 text-accent-red/80'
              : 'border-border bg-bg-tertiary text-text-muted'
          }`}
        >
          {guessLetter ?? '·'}
        </div>
      );
    });

  // ── Loading ──────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
        <p className="text-sm text-text-muted">Preparing spelling challenge…</p>
      </div>
    );
  }

  // ── Finished ─────────────────────────────────────────────────────────
  if (phase === 'finished') {
    const maxScore = questions.length * 2;
    const pct = Math.round((score / maxScore) * 100);
    const msg =
      pct === 100 ? 'Perfect speller!' :
      pct >= 75   ? 'Great job!' :
      pct >= 50   ? 'Good effort!' :
                    'Keep practicing!';

    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="text-7xl font-display font-bold text-text-primary mb-1">
          {score}
          <span className="text-text-muted text-3xl">/{maxScore}</span>
        </div>
        <p className="text-xs text-text-muted mb-1">pts</p>
        <p className="text-accent-cyan font-display font-bold text-xl mb-1">{msg}</p>
        <p className="text-text-muted text-sm mb-10">{pct}% score</p>

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
  if (!q) return null;
  const attemptsLeft = MAX_ATTEMPTS - attempts.length;
  const canHint = isCorrect === null && revealedIndices.size < word.length - 1 && attempts.length < MAX_ATTEMPTS;

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
            <span>/{questions.length}</span>
          </span>
          <span className="text-accent-green font-medium">{score} pts</span>
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
      <div className="bg-bg-card border border-border rounded-2xl p-6 mb-5">
        <p className="text-xs font-display font-bold text-text-muted uppercase tracking-wider mb-3">
          Spell this word
        </p>
        <p className="text-text-primary leading-relaxed text-base mb-3">{q.data.definition}</p>
        {q.data.partOfSpeech && (
          <span className="text-xs text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded font-medium">
            {q.data.partOfSpeech}
          </span>
        )}
      </div>

      {/* Word boxes */}
      <div className="flex gap-1.5 justify-center mb-5 flex-wrap">
        {renderWordBoxes()}
      </div>

      {/* Previous attempts */}
      {attempts.length > 0 && (
        <div className="space-y-2 mb-5">
          {attempts.map((attempt, i) => (
            <div key={i} className="flex gap-1.5 justify-center flex-wrap">
              {renderAttempt(attempt)}
            </div>
          ))}
        </div>
      )}

      {/* Feedback */}
      {isCorrect === true && (
        <p className="text-center text-accent-green text-sm font-medium mb-4 animate-fade-in">
          Correct!
        </p>
      )}
      {isCorrect === false && (
        <p className="text-center text-accent-red text-sm font-medium mb-4 animate-fade-in">
          The answer was{' '}
          <span className="font-display font-bold">{word}</span>
        </p>
      )}

      {/* Input + controls */}
      {isCorrect === null && (
        <>
          <div className="flex gap-2 mb-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Type the word…"
              className="flex-1 bg-bg-card border border-border rounded-xl px-4 py-3 text-text-primary text-sm font-display focus:outline-none focus:border-accent-cyan/50 placeholder:text-text-muted transition-colors"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="px-5 py-3 rounded-xl bg-accent-cyan text-bg-primary text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-all"
            >
              Check
            </button>
          </div>

          <div className="flex items-center justify-between">
            {/* Attempts left */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i < attemptsLeft ? 'bg-accent-orange' : 'bg-bg-tertiary border border-border'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-text-muted">
                {attemptsLeft} {attemptsLeft === 1 ? 'attempt' : 'attempts'} left
              </span>
            </div>

            {/* Hint button */}
            {canHint && (
              <button
                onClick={handleHint}
                className="text-xs text-text-muted hover:text-accent-cyan border border-border hover:border-accent-cyan/30 rounded-lg px-3 py-1.5 transition-all"
              >
                Reveal a letter
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
