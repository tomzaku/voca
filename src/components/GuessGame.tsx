import { useEffect, useMemo, useRef, useState } from 'react';
import { getActiveWordList } from '../lib/wordService';
import { speakWithKokoro, stopKokoroAudio } from '../lib/kokoroTts';
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
      {game === 'hangman' && (
        <HangmanGame key={word} word={word} disabled={result === 'correct'} onSolve={solve} onWrong={() => flash(setResult)} />
      )}
      {game === 'listen' && (
        <ListenGame key={word} word={word} disabled={result === 'correct'} onSolve={solve} onWrong={() => flash(setResult)} />
      )}
      {game === 'vowels' && (
        <VowelsGame key={word} word={word} disabled={result === 'correct'} onSolve={solve} onWrong={() => flash(setResult)} />
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

// ─── Game 4 · Hangman ───────────────────────────────────────────────
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const MAX_LIVES = 6;

function HangmanGame({ word, disabled, onSolve, onWrong }: GameProps) {
  const answer = word.toLowerCase();
  const letters = useMemo(() => new Set(answer.split('').filter((c) => /[a-z]/.test(c))), [answer]);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [lives, setLives] = useState(MAX_LIVES);

  const dead = lives <= 0;
  const solved = [...letters].every((c) => guessed.has(c));

  // Reveal once every letter is found.
  useEffect(() => {
    if (solved && letters.size > 0 && !disabled) onSolve();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved]);

  const guess = (letter: string) => {
    if (disabled || dead || guessed.has(letter)) return;
    setGuessed((p) => new Set([...p, letter]));
    if (!letters.has(letter)) {
      setLives((l) => l - 1);
      onWrong?.();
    }
  };

  return (
    <>
      {/* Masked word */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {word.split('').map((char, i) => {
          const lower = char.toLowerCase();
          const isLetter = /[a-z]/.test(lower);
          const shown = !isLetter || guessed.has(lower) || dead;
          return (
            <span
              key={i}
              className={`${boxBase} ${
                shown
                  ? isLetter
                    ? `border-accent-cyan bg-accent-cyan/10 ${dead && !guessed.has(lower) ? 'text-accent-red' : 'text-accent-cyan'}`
                    : 'border-transparent text-text-muted'
                  : 'border-border bg-bg-tertiary text-transparent'
              }`}
            >
              {shown ? char : '·'}
            </span>
          );
        })}
      </div>

      {/* Lives */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: MAX_LIVES }).map((_, i) => (
          <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={i < lives ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className={i < lives ? 'text-accent-red' : 'text-border'}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        ))}
        {dead && <span className="ml-2 text-xs text-accent-red font-medium">Out of lives — “Give up” to reveal</span>}
      </div>

      {/* Keyboard */}
      <div className="flex flex-wrap gap-1.5">
        {ALPHABET.map((letter) => {
          const used = guessed.has(letter);
          const hit = used && letters.has(letter);
          return (
            <button
              key={letter}
              onClick={() => guess(letter)}
              disabled={used || dead || disabled}
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-xs uppercase border-2 transition-all ${
                !used
                  ? 'border-border bg-bg-tertiary text-text-primary hover:border-accent-cyan/50 hover:bg-accent-cyan/5 cursor-pointer'
                  : hit
                  ? 'border-accent-green/50 bg-accent-green/10 text-accent-green cursor-default'
                  : 'border-border bg-bg-tertiary text-text-muted/40 cursor-default'
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </>
  );
}

// ─── Game 5 · Listen & spell ────────────────────────────────────────
function ListenGame({ word, disabled, onSolve, onWrong }: GameProps) {
  const [guess, setGuess] = useState('');
  const [wrong, setWrong] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const speak = async () => {
    stopKokoroAudio();
    setSpeaking(true);
    await speakWithKokoro(word, { onEnd: () => setSpeaking(false) });
  };

  // Play the word once on mount, then focus the input.
  useEffect(() => {
    speak();
    inputRef.current?.focus();
    return () => stopKokoroAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const check = () => {
    if (!guess.trim() || disabled) return;
    if (guess.trim().toLowerCase() === word.toLowerCase()) {
      stopKokoroAudio();
      onSolve();
    } else {
      setWrong(true);
      onWrong?.();
      setTimeout(() => { setWrong(false); setGuess(''); inputRef.current?.focus(); }, 700);
    }
  };

  return (
    <>
      {/* Replay button */}
      <div className="flex items-center gap-3">
        <button
          onClick={speak}
          disabled={disabled}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${
            speaking
              ? 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30'
              : 'bg-bg-tertiary text-text-muted border-border hover:text-accent-cyan hover:border-accent-cyan/30'
          }`}
          title="Hear the word again"
        >
          {speaking ? (
            <svg width="20" height="20" viewBox="0 0 10 10" fill="currentColor">
              <rect x="0" y="0" width="4" height="10" rx="1" /><rect x="6" y="0" width="4" height="10" rx="1" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </button>
        <div>
          <p className="text-sm text-text-primary font-medium">Listen and spell the word</p>
          <p className="text-xs text-text-muted">{word.length} letters · tap to replay</p>
        </div>
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

// ─── Game 6 · Missing vowels ────────────────────────────────────────
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

function VowelsGame({ word, disabled, onSolve, onWrong }: GameProps) {
  const [guess, setGuess] = useState('');
  const [wrong, setWrong] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const check = () => {
    if (!guess.trim() || disabled) return;
    if (guess.trim().toLowerCase() === word.toLowerCase()) {
      onSolve();
    } else {
      setWrong(true);
      onWrong?.();
      setTimeout(() => { setWrong(false); setGuess(''); inputRef.current?.focus(); }, 700);
    }
  };

  return (
    <>
      {/* Consonants shown, vowels blanked */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {word.split('').map((char, i) => {
          const isVowel = VOWELS.has(char.toLowerCase());
          return (
            <span
              key={i}
              className={`${boxBase} ${
                isVowel
                  ? 'border-accent-orange/40 bg-accent-orange/5 text-transparent'
                  : 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan'
              }`}
            >
              {isVowel ? '·' : char}
            </span>
          );
        })}
      </div>
      <p className="text-xs text-text-muted -mt-2">Vowels (a, e, i, o, u) are hidden — type the full word.</p>

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
