import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { getActiveWordList } from '../lib/wordService';
import { speakText, stopSpeaking } from '../lib/tts';
import { playCorrect, playWrong, playSelect } from '../lib/sfx';
import { GUESS_GAMES, type GuessGameMode } from '../hooks/useGuessGame';
import { useGameScore } from '../hooks/useGameScore';
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

/** Tactile "keycap" tile shared across every game. */
const boxBase =
  'w-11 h-12 rounded-xl flex items-center justify-center font-display font-extrabold text-lg uppercase border-[3px] transition-all animate-tile-in shadow-[inset_0_-4px_0_rgba(0,0,0,0.28)]';

const CONFETTI_COLORS = ['#22d3ee', '#34e39b', '#ff9f43', '#b98bff', '#ffd23f', '#ff6ec7', '#ff5c8a'];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, () => ({
        dx: `${(Math.random() * 2 - 1) * 200}px`,
        dy: `${40 + Math.random() * 150}px`,
        rot: `${(Math.random() * 2 - 1) * 540}deg`,
        delay: `${Math.random() * 0.12}s`,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      })),
    [],
  );
  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            background: p.color,
            // @ts-expect-error — CSS custom props
            '--dx': p.dx, '--dy': p.dy, '--rot': p.rot,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

export function GuessGame({ wordData, game, onGameChange, onSolved }: Props) {
  // Guess the learn-language headword when set (falls back to the English word).
  const word = wordData.headword || wordData.word;
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const { points, streak, win, lastGain, winId } = useGameScore();
  const info = GUESS_GAMES.find((g) => g.id === game)!;

  const solve = () => {
    win();
    playCorrect();
    setResult('correct');
    setTimeout(onSolved, 1150);
  };

  return (
    <div className="relative overflow-hidden card-game border-accent-cyan animate-glow-pulse">
      {/* Top accent strip */}
      <div className="h-1 w-full bg-gradient-to-r from-accent-cyan via-accent-purple to-accent-green" />

      {/* Confetti + celebration overlay */}
      {result === 'correct' && (
        <>
          <Confetti />
          <div className="absolute inset-0 flex items-center justify-center bg-bg-card/95 rounded-2xl z-10 animate-fade-in">
            <div className="animate-bounce-in text-center">
              <div className="w-20 h-20 rounded-full bg-accent-green border-[3px] border-accent-green flex items-center justify-center mx-auto mb-3 animate-jelly shadow-[0_5px_0_0_var(--btn-lip)]">
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-bg-primary">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-accent-green font-title text-3xl">
                {streak >= 3 ? `${streak}× COMBO!` : 'Correct!'}
              </p>
              <p className="text-accent-cyan font-display font-extrabold text-base mt-1">+{lastGain} pts</p>
            </div>
          </div>
        </>
      )}
      {/* Wrong flash overlay */}
      {result === 'wrong' && (
        <div className="absolute inset-0 rounded-2xl bg-accent-red/10 pointer-events-none z-10 animate-flash-wrong" />
      )}

      <div className="p-6 space-y-5">
        {/* ── HUD: game badge + score/streak ── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Icon icon={info.icon} className="text-2xl text-accent-cyan shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-display font-bold text-text-primary leading-tight truncate">{info.label}</p>
              <p className="text-[10px] text-text-muted uppercase tracking-wider leading-tight">Guess the word</p>
            </div>
            {wordData.partOfSpeech && (
              <span className="text-[10px] font-medium text-accent-purple bg-accent-purple/10 px-2 py-0.5 rounded shrink-0">
                {wordData.partOfSpeech}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-bg-tertiary border-2 border-border text-center min-w-[3.25rem] tile-lip">
              <span className="block text-base font-display font-extrabold text-accent-cyan leading-none">{points}</span>
              <span className="block text-[9px] text-text-muted uppercase tracking-wider font-bold">pts</span>
            </div>
            <div className="relative px-3 py-1.5 rounded-xl bg-accent-orange/15 border-2 border-accent-orange/40 text-center min-w-[3.25rem] tile-lip">
              <span className="flex items-center justify-center gap-1 text-base font-display font-extrabold text-accent-orange leading-none">
                {streak > 0 && <span className="animate-flame">🔥</span>}
                {streak}
              </span>
              <span className="block text-[9px] text-text-muted uppercase tracking-wider">streak</span>
              {result === 'correct' && (
                <span key={winId} className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs font-display font-bold text-accent-green animate-float-up whitespace-nowrap">
                  +{lastGain}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Game picker pills ── */}
        <div className="flex flex-wrap gap-1.5">
          {GUESS_GAMES.map((g) => {
            const active = game === g.id;
            return (
              <button
                key={g.id}
                onClick={() => { playSelect(); onGameChange(g.id); }}
                title={g.description}
                className={`btn-3d flex items-center gap-1 px-3 py-1.5 text-xs ${
                  active
                    ? 'bg-accent-purple text-bg-primary'
                    : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
                }`}
              >
                <Icon icon={g.icon} className="text-base" />
                <span>{g.label}</span>
              </button>
            );
          })}
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
    </div>
  );
}

/** Briefly flash the shared wrong overlay. */
function flash(setResult: (r: 'correct' | 'wrong' | null) => void) {
  playWrong();
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
            <span key={i} style={{ animationDelay: `${i * 45}ms` }} className={`${boxBase} border-accent-cyan bg-accent-cyan/10 text-accent-cyan`}>
              {char}
            </span>
          ) : (
            <button
              key={i}
              onClick={() => { if (canReveal) { playSelect(); setRevealed((p) => new Set([...p, i])); } }}
              disabled={!canReveal}
              title="Click to reveal this letter"
              style={{ animationDelay: `${i * 45}ms` }}
              className={`${boxBase} border-border bg-bg-tertiary text-transparent select-none hover:border-accent-cyan/40 hover:bg-accent-cyan/5 cursor-pointer hover:-translate-y-0.5`}
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
    if (next.length < word.length) {
      playSelect();
    } else {
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
                  ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan animate-tile-pop'
                  : 'border-dashed border-border bg-bg-tertiary text-transparent'
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
            className="ml-1 w-10 h-11 rounded-lg flex items-center justify-center border-2 border-border bg-bg-tertiary text-text-muted hover:text-accent-red hover:border-accent-red/40 transition-all active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" /><line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" />
            </svg>
          </button>
        )}
      </div>

      {/* Scrambled tile bank */}
      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        {tiles.map((t, i) => {
          const used = pickedSet.has(t.id);
          return (
            <button
              key={t.id}
              onClick={() => place(t.id)}
              disabled={used || disabled}
              style={{ animationDelay: `${i * 50}ms` }}
              className={`${boxBase} ${
                used
                  ? 'border-border bg-bg-tertiary text-transparent opacity-30 cursor-default'
                  : 'border-border-light bg-gradient-to-b from-bg-tertiary to-bg-hover text-text-primary hover:border-accent-cyan/60 hover:-translate-y-0.5 hover:text-accent-cyan cursor-pointer active:scale-95'
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
      playWrong();
      setWrongPick(opt);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {options.map((opt, i) => {
        const isWrong = wrongPick === opt;
        return (
          <button
            key={opt}
            onClick={() => pick(opt)}
            disabled={disabled || isWrong}
            style={{ animationDelay: `${i * 60}ms` }}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-[3px] text-base font-display font-extrabold text-left animate-tile-in tile-lip transition-all ${
              isWrong
                ? 'border-accent-red bg-accent-red/15 text-accent-red cursor-default animate-shake'
                : 'border-border bg-bg-tertiary text-text-primary hover:border-accent-cyan hover:-translate-y-0.5 hover:text-accent-cyan active:translate-y-0.5'
            }`}
          >
            <span className={`w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-xs font-bold border ${
              isWrong ? 'border-accent-red/40 text-accent-red/70' : 'border-border-light text-text-muted'
            }`}>
              {String.fromCharCode(65 + i)}
            </span>
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
              className={`w-8 h-9 rounded-lg flex items-center justify-center font-display font-bold text-xs uppercase border-2 shadow-[inset_0_-2px_0_rgba(0,0,0,0.3)] transition-all ${
                !used
                  ? 'border-border bg-gradient-to-b from-bg-tertiary to-bg-hover text-text-primary hover:border-accent-cyan/60 hover:-translate-y-0.5 hover:text-accent-cyan cursor-pointer active:scale-95'
                  : hit
                  ? 'border-accent-green/50 bg-accent-green/10 text-accent-green cursor-default'
                  : 'border-border bg-bg-tertiary text-text-muted/40 opacity-50 cursor-default shadow-none'
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
    stopSpeaking();
    setSpeaking(true);
    await speakText(word, { onEnd: () => setSpeaking(false) });
  };

  // Play the word once on mount, then focus the input.
  useEffect(() => {
    speak();
    inputRef.current?.focus();
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const check = () => {
    if (!guess.trim() || disabled) return;
    if (guess.trim().toLowerCase() === word.toLowerCase()) {
      stopSpeaking();
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
        className={`flex-1 bg-bg-tertiary border-[3px] rounded-2xl px-4 py-3 text-text-primary text-base font-bold font-display focus:outline-none placeholder:text-text-muted placeholder:font-semibold transition-colors ${
          wrong ? 'border-accent-red bg-accent-red/10' : 'border-border focus:border-accent-cyan'
        }`}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        onClick={onSubmit}
        disabled={!value.trim() || disabled}
        className="btn-3d px-5 py-3 bg-accent-green text-bg-primary text-base"
      >
        Check ✓
      </button>
    </div>
  );
}
