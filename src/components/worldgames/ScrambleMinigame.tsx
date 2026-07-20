import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { playCorrect, playSelect } from '../../lib/sfx';
import { useVocabularyStore } from '../../hooks/useVocabulary';
import { useAuth } from '../../hooks/useAuth';

// A tiny in-world game: unscramble the hidden word by tapping its letters into
// order. Fully offline — it only needs the word list, so it works with any
// collection. This is the first bespoke "building UI"; others follow the same
// self-contained shape (take the data they need, render a game, no routing).

const FALLBACK = ['apple', 'river', 'garden', 'puzzle', 'rocket', 'flower', 'bridge', 'planet', 'silver', 'forest'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Tile { id: number; ch: string; }

/** Scramble a word into positioned tiles, avoiding the already-solved order. */
function makeTiles(word: string): Tile[] {
  const chars = word.split('');
  let s = shuffle(chars);
  for (let i = 0; i < 8 && s.join('') === word; i++) s = shuffle(chars);
  return s.map((ch, i) => ({ id: i, ch }));
}

export function ScrambleMinigame({ words }: { words: string[] }) {
  const markWord = useVocabularyStore((s) => s.markWord);
  const { user } = useAuth();

  // Keep short, single-token words that scramble cleanly.
  const pool = useMemo(() => {
    const clean = words.filter((w) => /^[a-z]+$/.test(w) && w.length >= 3 && w.length <= 9);
    return clean.length ? clean : FALLBACK;
  }, [words]);
  const order = useMemo(() => shuffle(pool.map((_, i) => i)), [pool]);

  const [round, setRound] = useState(0);
  const [streak, setStreak] = useState(0);
  const [solved, setSolved] = useState(0);
  const word = pool[order[round % order.length]];

  const [tiles, setTiles] = useState<Tile[]>([]);
  const [picked, setPicked] = useState<number[]>([]); // tile ids, in answer order
  const [status, setStatus] = useState<'playing' | 'correct'>('playing');

  // (Re)build the scramble whenever the word changes.
  useEffect(() => {
    setTiles(makeTiles(word));
    setPicked([]);
    setStatus('playing');
  }, [word]);

  const charOf = (id: number) => tiles.find((t) => t.id === id)?.ch ?? '';
  const available = tiles.filter((t) => !picked.includes(t.id));
  const full = picked.length === word.length;
  const wrong = full && status === 'playing';

  const pickTile = (id: number) => {
    if (status !== 'playing' || picked.includes(id)) return;
    playSelect();
    const next = [...picked, id];
    setPicked(next);
    if (next.length === word.length) {
      const guess = next.map(charOf).join('');
      if (guess === word) {
        setStatus('correct');
        setStreak((s) => s + 1);
        setSolved((s) => s + 1);
        playCorrect();
        markWord(word, 'known', user?.id, 0, 'letters');
        setTimeout(() => setRound((r) => r + 1), 850);
      }
    }
  };
  const removeTile = (id: number) => status === 'playing' && setPicked((p) => p.filter((x) => x !== id));
  const reshuffle = () => { if (status === 'playing') { setTiles(makeTiles(word)); setPicked([]); } };
  const skip = () => { setStreak(0); setRound((r) => r + 1); };

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <h2 className="font-display font-bold text-text-primary flex items-center gap-2">
          <Icon icon="lucide:shuffle" className="text-accent-cyan" />
          Word Scramble
        </h2>
        <span className="flex items-center gap-1 text-xs font-bold text-accent-orange bg-accent-orange/10 border border-accent-orange/30 rounded-full px-2.5 py-1">
          <Icon icon="lucide:flame" />
          {streak}
        </span>
      </div>
      <p className="text-xs text-text-muted mb-4">Tap the letters to spell the hidden word.</p>

      {/* Answer slots */}
      <div className="flex flex-wrap justify-center gap-2 mb-5 min-h-[3.25rem]">
        {Array.from({ length: word.length }).map((_, i) => {
          const id = picked[i];
          const filled = id != null;
          return (
            <button
              key={i}
              onClick={() => filled && removeTile(id)}
              disabled={!filled || status === 'correct'}
              className={`w-11 h-12 rounded-lg border-2 flex items-center justify-center text-xl font-display font-bold uppercase transition-all ${
                status === 'correct'
                  ? 'border-accent-green bg-accent-green/15 text-accent-green'
                  : wrong
                    ? 'border-accent-red bg-accent-red/10 text-accent-red animate-shake'
                    : filled
                      ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan cursor-pointer'
                      : 'border-dashed border-border bg-bg-tertiary/40 text-transparent'
              }`}
            >
              {filled ? charOf(id) : '·'}
            </button>
          );
        })}
      </div>

      {/* Letter tray */}
      <div className="flex flex-wrap justify-center gap-2 mb-5 min-h-[3rem]">
        {available.map((t) => (
          <button
            key={t.id}
            onClick={() => pickTile(t.id)}
            className="btn-3d w-11 h-12 rounded-lg bg-bg-tertiary text-text-primary text-xl font-display font-bold uppercase hover:bg-accent-cyan/15"
          >
            {t.ch}
          </button>
        ))}
        {available.length === 0 && status === 'correct' && (
          <span className="flex items-center gap-1.5 text-accent-green font-display font-bold">
            <Icon icon="lucide:party-popper" /> Nice!
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={reshuffle}
          disabled={status === 'correct'}
          className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-accent-cyan transition-colors disabled:opacity-40"
        >
          <Icon icon="lucide:dices" /> New letters
        </button>
        <span className="text-xs font-bold text-text-muted">{solved} solved</span>
        <button
          onClick={skip}
          className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-accent-orange transition-colors"
        >
          Skip <Icon icon="lucide:chevron-right" />
        </button>
      </div>
    </div>
  );
}
