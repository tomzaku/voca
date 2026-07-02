import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { generateClozeParagraph, type ClozeParagraph } from '../lib/wordService';
import { speakText, stopSpeaking, isTtsPlaying } from '../lib/tts';
import toast from 'react-hot-toast';

interface Props {
  bookmarks: string[];
  onBack: () => void;
}

type Phase = 'select' | 'loading' | 'playing' | 'finished';

const MAX_WORDS = 8;
const CONFETTI_COLORS = ['#22d3ee', '#34e39b', '#ff9f43', '#b98bff', '#ffd23f', '#ff6ec7', '#ff5c8a'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 40 }, () => ({
        dx: `${(Math.random() * 2 - 1) * 260}px`,
        dy: `${60 + Math.random() * 220}px`,
        rot: `${(Math.random() * 2 - 1) * 620}deg`,
        delay: `${Math.random() * 0.2}s`,
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

export function ParagraphGame({ bookmarks, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('select');
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(shuffle(bookmarks).slice(0, Math.min(5, bookmarks.length))),
  );
  const [cloze, setCloze] = useState<ClozeParagraph | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Per-gap placed answer (null = empty). Blanks are keyed by their order.
  const [placed, setPlaced] = useState<(string | null)[]>([]);
  const [wrongGap, setWrongGap] = useState<number | null>(null);
  const [activeTile, setActiveTile] = useState<string | null>(null); // tap-to-place selection
  const [dragOverGap, setDragOverGap] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // The complete story text (blanks filled in) for read-aloud.
  const fullText = useMemo(
    () => (cloze ? cloze.segments.map((s) => s.value).join('') : ''),
    [cloze],
  );

  const handleSpeak = async () => {
    if (isTtsPlaying() || isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    await speakText(fullText, { onEnd: () => setIsSpeaking(false) });
  };

  // Stop any narration when the game unmounts.
  useEffect(() => () => stopSpeaking(), []);

  const toggle = (word: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else if (next.size < MAX_WORDS) next.add(word);
      else toast(`Up to ${MAX_WORDS} words per paragraph`);
      return next;
    });
  };

  const start = async () => {
    if (selected.size < 2) return;
    setPhase('loading');
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const result = await generateClozeParagraph([...selected], abortRef.current.signal);
      setCloze(result);
      setPlaced(new Array(result.answers.length).fill(null));
      setPhase('playing');
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const msg = (err as Error).message || '';
      toast.error(msg.includes('API key') ? msg : 'Could not generate a paragraph. Try again.');
      setPhase('select');
    }
  };

  // Answers still waiting to be placed (drives the tile bank).
  const remaining = useMemo(() => {
    if (!cloze) return [];
    const counts = new Map<string, number>();
    cloze.answers.forEach((a) => counts.set(a, (counts.get(a) ?? 0) + 1));
    placed.forEach((p) => {
      if (p) counts.set(p, (counts.get(p) ?? 0) - 1);
    });
    const out: string[] = [];
    counts.forEach((n, word) => { for (let i = 0; i < n; i++) out.push(word); });
    return out;
  }, [cloze, placed]);

  // Stable shuffled order for the tile bank so it doesn't reshuffle on re-render.
  const tileOrder = useMemo(() => (cloze ? shuffle(cloze.answers) : []), [cloze]);
  const bankTiles = useMemo(() => {
    const rem = [...remaining];
    // Render in the stable shuffled order, consuming from remaining counts.
    return tileOrder.filter((w) => {
      const i = rem.indexOf(w);
      if (i === -1) return false;
      rem.splice(i, 1);
      return true;
    });
  }, [tileOrder, remaining]);

  const eq = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

  const tryPlace = (gapIndex: number, word: string) => {
    if (!cloze || placed[gapIndex]) return;
    if (eq(cloze.answers[gapIndex], word)) {
      const next = [...placed];
      next[gapIndex] = cloze.answers[gapIndex]; // store canonical form
      setPlaced(next);
      setActiveTile(null);
      if (next.every((p) => p !== null)) setTimeout(() => setPhase('finished'), 650);
    } else {
      setWrongGap(gapIndex);
      setActiveTile(null);
      setTimeout(() => setWrongGap(null), 500);
    }
  };

  const reset = () => {
    stopSpeaking();
    setIsSpeaking(false);
    setCloze(null);
    setPlaced([]);
    setActiveTile(null);
    setPhase('select');
  };

  // ── Header shared across phases ──
  const header = (
    <div className="flex items-center gap-3 mb-6">
      <button onClick={onBack} className="btn-3d w-10 h-10 rounded-xl bg-bg-card text-text-secondary flex items-center justify-center shrink-0">
        <Icon icon="solar:arrow-left-bold" className="text-xl" />
      </button>
      <div>
        <h1 className="font-title text-2xl text-accent-purple leading-none">Story Gaps</h1>
        <p className="text-xs text-text-muted font-bold mt-0.5">Drag your words into the blanks</p>
      </div>
    </div>
  );

  // ── SELECT ──
  if (phase === 'select') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        {header}
        <div className="card-game border-accent-purple p-5 mb-5">
          <p className="text-sm font-bold text-text-secondary">
            Pick <span className="text-accent-purple">2–{MAX_WORDS}</span> saved words. We'll write a short story
            using them, then you drag each word into its gap.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {bookmarks.map((word) => {
            const on = selected.has(word);
            return (
              <button
                key={word}
                onClick={() => toggle(word)}
                className={`px-3.5 py-2 rounded-full text-sm font-display font-extrabold border-[3px] tile-lip transition-all hover:-translate-y-0.5 ${
                  on
                    ? 'bg-accent-purple text-bg-primary border-accent-purple'
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
          disabled={selected.size < 2}
          className="btn-3d w-full py-3.5 bg-accent-green text-bg-primary text-lg flex items-center justify-center gap-2"
        >
          <Icon icon="solar:magic-stick-3-bold" className="text-xl" />
          Generate story ({selected.size})
        </button>
      </div>
    );
  }

  // ── LOADING ──
  if (phase === 'loading') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        {header}
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <div className="text-5xl animate-bob">✍️</div>
          <div className="w-10 h-10 rounded-full border-[3px] border-accent-purple/30 border-t-accent-purple animate-spin" />
          <p className="text-sm text-text-muted font-bold animate-fade-in">Writing your story…</p>
        </div>
      </div>
    );
  }

  // ── FINISHED ──
  if (phase === 'finished') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        {header}
        <div className="relative card-game border-accent-green p-8 text-center overflow-hidden">
          <Confetti />
          <div className="animate-bounce-in">
            <div className="text-6xl mb-3 animate-bob">🎉</div>
            <h2 className="font-title text-3xl text-accent-green mb-2">Story complete!</h2>
            <p className="text-sm text-text-secondary font-bold">
              You filled all {cloze?.answers.length} gaps correctly.
            </p>
          </div>

          {/* Read the whole story aloud */}
          <button
            onClick={handleSpeak}
            className="btn-3d mx-auto mt-5 px-5 py-2.5 bg-accent-cyan text-bg-primary flex items-center gap-2"
          >
            {isSpeaking ? (
              <svg width="18" height="18" viewBox="0 0 10 10" fill="currentColor">
                <rect x="0" y="0" width="4" height="10" rx="1" />
                <rect x="6" y="0" width="4" height="10" rx="1" />
              </svg>
            ) : (
              <Icon icon="solar:volume-loud-bold" className="text-xl" />
            )}
            {isSpeaking ? 'Stop' : 'Listen to the story'}
          </button>

          {/* The finished paragraph */}
          <p className="mt-6 text-left text-base leading-loose text-text-primary font-semibold">
            {cloze?.segments.map((seg, i) =>
              seg.type === 'text' ? (
                <span key={i}>{seg.value}</span>
              ) : (
                <span key={i} className="font-display font-extrabold text-accent-green">{seg.value}</span>
              ),
            )}
          </p>
          <div className="flex gap-2 mt-7">
            <button onClick={reset} className="btn-3d flex-1 py-3 bg-accent-purple text-bg-primary flex items-center justify-center gap-2">
              <Icon icon="solar:refresh-bold" className="text-lg" /> New story
            </button>
            <button onClick={onBack} className="btn-3d flex-1 py-3 bg-bg-card text-text-secondary">
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING ──
  const filledCount = placed.filter((p) => p !== null).length;
  const total = cloze?.answers.length ?? 0;
  let blankIndex = -1;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {header}

      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-extrabold text-text-secondary">
          <span className="text-accent-green">{filledCount}</span> / {total} filled
        </span>
        <button onClick={reset} className="btn-3d px-3 py-1.5 bg-bg-card text-text-secondary text-xs flex items-center gap-1.5">
          <Icon icon="solar:refresh-bold" /> Restart
        </button>
      </div>

      {/* Paragraph with gaps */}
      <div className="card-game border-accent-cyan p-6 mb-6">
        <p className="text-lg leading-loose text-text-primary font-semibold">
          {cloze?.segments.map((seg, i) => {
            if (seg.type === 'text') return <span key={i}>{seg.value}</span>;
            blankIndex++;
            const gi = blankIndex;
            const word = placed[gi];
            const isWrong = wrongGap === gi;
            const isOver = dragOverGap === gi;
            if (word) {
              return (
                <span
                  key={i}
                  className="inline-flex items-center mx-0.5 px-3 py-1 rounded-xl bg-accent-green text-bg-primary font-display font-extrabold align-baseline animate-tile-pop tile-lip"
                >
                  {word}
                </span>
              );
            }
            return (
              <span
                key={i}
                onDragOver={(e) => { e.preventDefault(); setDragOverGap(gi); }}
                onDragLeave={() => setDragOverGap((g) => (g === gi ? null : g))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverGap(null);
                  const w = e.dataTransfer.getData('text/plain');
                  if (w) tryPlace(gi, w);
                }}
                onClick={() => activeTile && tryPlace(gi, activeTile)}
                className={`inline-flex items-center justify-center mx-0.5 min-w-[5.5rem] h-9 px-3 rounded-xl border-[3px] border-dashed align-baseline transition-all cursor-pointer ${
                  isWrong
                    ? 'border-accent-red bg-accent-red/15 animate-shake'
                    : isOver || activeTile
                    ? 'border-accent-cyan bg-accent-cyan/15 scale-105'
                    : 'border-border-light bg-bg-tertiary'
                }`}
              >
                <span className="text-text-muted text-sm font-bold">{isOver ? '▾' : `${gi + 1}`}</span>
              </span>
            );
          })}
        </p>
      </div>

      {/* Tile bank */}
      <div className="card-game p-4">
        <p className="text-xs font-display font-extrabold text-text-muted uppercase tracking-wide mb-3">
          {activeTile ? 'Now tap a blank ↑' : 'Drag or tap a word'}
        </p>
        <div className="flex flex-wrap gap-2.5">
          {bankTiles.length === 0 ? (
            <span className="text-sm text-text-muted font-bold py-2">All placed! 🎈</span>
          ) : (
            bankTiles.map((word, i) => (
              <button
                key={`${word}-${i}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', word);
                  e.dataTransfer.effectAllowed = 'move';
                  setActiveTile(word);
                }}
                onDragEnd={() => setDragOverGap(null)}
                onClick={() => setActiveTile((t) => (t === word ? null : word))}
                className={`px-4 py-2.5 rounded-xl font-display font-extrabold text-base border-[3px] tile-lip cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5 ${
                  activeTile === word
                    ? 'bg-accent-cyan text-bg-primary border-accent-cyan scale-105'
                    : 'bg-bg-tertiary text-text-primary border-border-light hover:border-accent-cyan'
                }`}
              >
                {word}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
