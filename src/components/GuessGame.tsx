import { useMemo, useRef, useState } from 'react';
import { getActiveWordList } from '../lib/wordService';
import { GUESS_GAMES, type GuessGameMode } from '../hooks/useGuessGame';
import type { VocabularyWord } from '../types';

interface Props {
  wordData: VocabularyWord;
  game: GuessGameMode;
  onGameChange: (game: GuessGameMode) => void;
  /** Called once the player solves (or is given) the word — parent reveals it. */
  onSolved: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const boxBase =
  'w-9 h-9 rounded-lg flex items-center justify-center font-display font-bold text-sm uppercase border-2 transition-all';

export function GuessGame({ wordData, game, onGameChange, onSolved }: Props) {
  const word = wordData.word;
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);

  const solve = () => {
    setResult('correct');
    setTimeout(onSolved, 800);
  };

  return (
    <div className="relative overflow-hidden bg-bg-card border border-border rounded-2xl p-6 space-y-5">
      {/* Correct celebration overlay */}
      {result === 'correct' && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-card/95 rounded-2xl z-10 animate-fade-in">
          <div className="animate-pop-in text-center">
            <div className="w-16 h-16 rounded-full bg-accent-green/20 border-2 border-accent-green/40 flex items-center justify-center mx-auto mb-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-green">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-accent-green font-display font-bold text-2xl">Correct!</p>
            <p className="text-text-muted text-xs mt-1">Revealing the word…</p>
          </div>
        </div>
      )}
      {/* Wrong flash overlay */}
      {result === 'wrong' && (
        <div className="absolute inset-0 rounded-2xl bg-accent-red/10 pointer-events-none z-10 animate-flash-wrong" />
      )}

      {/* Header + game selector */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <p className="text-xs font-display font-bold text-text-muted uppercase tracking-wider">
            Guess the word
          </p>
          {wordData.partOfSpeech && (
            <span className="text-xs font-medium text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded">
              {wordData.partOfSpeech}
            </span>
          )}
        </div>
        <div className="flex gap-1 p-0.5 rounded-lg bg-bg-tertiary border border-border">
          {GUESS_GAMES.map((g) => (
            <button
              key={g.id}
              onClick={() => onGameChange(g.id)}
              title={g.description}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                game === g.id
                  ? 'bg-accent-cyan text-bg-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {game === 'letters' && (
        <LettersGame key={word} word={word} disabled={result === 'correct'} onSolve={solve} onWrong={() => flash(setResult)} />
      )}
      {game === 'scramble' && (
        <ScrambleGame key={word} word={word} disabled={result === 'correct'} onSolve={solve} onWrong={() => flash(setResult)} />
      )}
      {game === 'choice' && (
        <ChoiceGame key={word} word={word} disabled={result === 'correct'} onSolve={solve} />
      )}
    </div>
  );
}

/** Briefly flash the shared wrong overlay. */
function flash(setResult: (r: 'correct' | 'wrong' | null) => void) {
  setResult('wrong');
  setTimeout(() => setResult(null), 600);
}

interface GameProps {
  word: string;
  disabled: boolean;
  onSolve: () => void;
  onWrong?: () => void;
}

// ─── Game 1 · Letters ───────────────────────────────────────────────
function LettersGame({ word, disabled, onSolve, onWrong }: GameProps) {
  const [guess, setGuess] = useState('');
  const [wrong, setWrong] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const check = () => {
    if (!guess.trim() || disabled) return;
    if (guess.trim().toLowerCase() === word.toLowerCase()) {
      onSolve();
    } else {
      setWrong(true);
      onWrong?.();
      setTimeout(() => {
        setWrong(false);
        setGuess('');
        inputRef.current?.focus();
      }, 700);
    }
  };

  return (
    <>
      {/* Letter boxes — first and last shown, click to reveal more */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {word.split('').map((char, i) => {
          const shown = i === 0 || i === word.length - 1 || revealed.has(i);
          const canReveal = !shown && !disabled;
          return shown ? (
            <span key={i} className={`${boxBase} border-accent-cyan bg-accent-cyan/10 text-accent-cyan`}>
              {char}
            </span>
          ) : (
            <button
              key={i}
              onClick={() => canReveal && setRevealed((p) => new Set([...p, i]))}
              disabled={!canReveal}
              title="Click to reveal this letter"
              className={`${boxBase} border-border bg-bg-tertiary text-transparent select-none hover:border-accent-cyan/40 hover:bg-accent-cyan/5 cursor-pointer`}
            >
              ·
            </button>
          );
        })}
      </div>

      <GuessInput
        inputRef={inputRef}
        value={guess}
        wrong={wrong}
        disabled={disabled}
        onChange={setGuess}
        onSubmit={check}
      />
    </>
  );
}

// ─── Game 2 · Unscramble ────────────────────────────────────────────
interface Tile { char: string; id: number; }

function ScrambleGame({ word, disabled, onSolve, onWrong }: GameProps) {
  const tiles = useMemo<Tile[]>(() => {
    const base = word.split('').map((char, id) => ({ char, id }));
    let s = shuffle(base);
    // Avoid handing back the answer already in order.
    if (word.length > 1 && s.map((t) => t.char).join('') === word) s = shuffle(base);
    return s;
  }, [word]);

  const [picked, setPicked] = useState<number[]>([]);
  const [wrong, setWrong] = useState(false);

  const pickedSet = new Set(picked);
  const built = picked.map((id) => tiles.find((t) => t.id === id)!.char).join('');

  const place = (id: number) => {
    if (disabled || pickedSet.has(id)) return;
    const next = [...picked, id];
    setPicked(next);
    if (next.length === word.length) {
      const attempt = next.map((pid) => tiles.find((t) => t.id === pid)!.char).join('');
      if (attempt.toLowerCase() === word.toLowerCase()) {
        onSolve();
      } else {
        setWrong(true);
        onWrong?.();
        setTimeout(() => { setWrong(false); setPicked([]); }, 700);
      }
    }
  };

  return (
    <>
      {/* Answer slots */}
      <div className={`flex items-center gap-1.5 flex-wrap ${wrong ? 'animate-shake' : ''}`}>
        {word.split('').map((_, i) => {
          const char = built[i];
          return (
            <span
              key={i}
              className={`${boxBase} ${
                char
                  ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan'
                  : 'border-border bg-bg-tertiary text-transparent'
              }`}
            >
              {char ?? '·'}
            </span>
          );
        })}
        {picked.length > 0 && !disabled && (
          <button
            onClick={() => setPicked((p) => p.slice(0, -1))}
            title="Remove last letter"
            className="ml-1 w-9 h-9 rounded-lg flex items-center justify-center border border-border bg-bg-tertiary text-text-muted hover:text-text-primary hover:border-border-light transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" /><line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" />
            </svg>
          </button>
        )}
      </div>

      {/* Scrambled tile bank */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        {tiles.map((t) => {
          const used = pickedSet.has(t.id);
          return (
            <button
              key={t.id}
              onClick={() => place(t.id)}
              disabled={used || disabled}
              className={`${boxBase} ${
                used
                  ? 'border-border bg-bg-tertiary text-transparent opacity-40 cursor-default'
                  : 'border-border-light bg-bg-tertiary text-text-primary hover:border-accent-cyan/50 hover:bg-accent-cyan/5 cursor-pointer'
              }`}
            >
              {t.char}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ─── Game 3 · Multiple choice ───────────────────────────────────────
function ChoiceGame({ word, disabled, onSolve }: GameProps) {
  const options = useMemo(() => {
    const answer = word.toLowerCase();
    const pool = getActiveWordList()
      .map((w) => w.word)
      .filter((w) => w.toLowerCase() !== answer);
    // Prefer distractors of a similar length for a fairer challenge.
    const sorted = shuffle(pool).sort(
      (a, b) => Math.abs(a.length - word.length) - Math.abs(b.length - word.length),
    );
    const distractors: string[] = [];
    for (const w of sorted) {
      if (distractors.some((d) => d.toLowerCase() === w.toLowerCase())) continue;
      distractors.push(w);
      if (distractors.length === 3) break;
    }
    return shuffle([word, ...distractors]);
  }, [word]);

  const [wrongPick, setWrongPick] = useState<string | null>(null);

  const pick = (opt: string) => {
    if (disabled) return;
    if (opt.toLowerCase() === word.toLowerCase()) {
      onSolve();
    } else {
      setWrongPick(opt);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map((opt) => {
        const isWrong = wrongPick === opt;
        return (
          <button
            key={opt}
            onClick={() => pick(opt)}
            disabled={disabled || isWrong}
            className={`px-4 py-3 rounded-xl border text-sm font-display font-medium text-left transition-all ${
              isWrong
                ? 'border-accent-red/50 bg-accent-red/10 text-accent-red/80 cursor-default animate-shake'
                : 'border-border bg-bg-tertiary text-text-primary hover:border-accent-cyan/50 hover:bg-accent-cyan/5'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── Shared guess input (Letters game) ──────────────────────────────
interface GuessInputProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  wrong: boolean;
  disabled: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
}

function GuessInput({ inputRef, value, wrong, disabled, onChange, onSubmit }: GuessInputProps) {
  return (
    <div className={`flex gap-2 transition-all ${wrong ? 'animate-shake' : ''}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
        placeholder="Type your guess…"
        disabled={disabled}
        className={`flex-1 bg-bg-tertiary border rounded-xl px-4 py-3 text-text-primary text-sm font-display focus:outline-none placeholder:text-text-muted transition-colors ${
          wrong ? 'border-accent-red bg-accent-red/10' : 'border-border focus:border-accent-cyan/50'
        }`}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        onClick={onSubmit}
        disabled={!value.trim() || disabled}
        className="px-4 py-3 rounded-xl bg-accent-cyan text-bg-primary text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-all"
      >
        Check
      </button>
    </div>
  );
}
