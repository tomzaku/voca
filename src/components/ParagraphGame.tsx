import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { parseCloze, type ClozeParagraph } from '../lib/wordService';
import { speakText, stopSpeaking, isTtsPlaying } from '../lib/tts';
import { playCorrect, playWrong, playSelect, playWin } from '../lib/sfx';
import { getLearnLanguage } from '../lib/languages';
import { agoLabel } from '../lib/progress';
import { createStoryGap, deleteStoryGap, fetchStoryGaps, type StoryGap } from '../lib/storyGapsApi';
import { useGameWordPool } from '../hooks/useGameWordPool';
import { FilterTabs } from './FilterTabs';
import toast from 'react-hot-toast';

interface Props {
  /** Omit to let the player pick their own list (Recent/Saved/Struggling/…)
   *  right here — History's inline row still passes its own filtered words. */
  bookmarks?: string[];
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
  const explicitWords = bookmarks !== undefined;
  const pool = useGameWordPool('recent', !explicitWords);
  const words = explicitWords ? bookmarks! : pool.words;

  const [phase, setPhase] = useState<Phase>('select');
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(shuffle(words).slice(0, Math.min(5, words.length))),
  );
  // With no explicit list, the pool comes from a filter the player can change
  // right here — re-sample the default selection whenever it does. Content-
  // keyed (not the array reference) so History's own re-renders, which hand
  // down a freshly-built array every time, don't reset a mid-pick selection.
  const wordsKey = words.join('|');
  useEffect(() => {
    if (explicitWords) return;
    setSelected(new Set(shuffle(words).slice(0, Math.min(5, words.length))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordsKey, explicitWords]);
  const [cloze, setCloze] = useState<ClozeParagraph | null>(null);

  // Past generated stories — replaying one costs nothing (no AI call), only
  // "Generate story" below does.
  const [history, setHistory] = useState<StoryGap[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchStoryGaps().then((list) => { if (!cancelled) setHistory(list); });
    return () => { cancelled = true; };
  }, []);

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
      else if (next.size < MAX_WORDS) { next.add(word); playSelect(); }
      else toast(`Up to ${MAX_WORDS} words per paragraph`);
      return next;
    });
  };

  const start = async () => {
    if (selected.size < 2) return;
    setPhase('loading');
    try {
      const saved = await createStoryGap([...selected], getLearnLanguage());
      setHistory((h) => [saved, ...(h ?? [])]);
      openStory(saved);
    } catch (err) {
      const msg = (err as Error).message || '';
      toast.error(msg || 'Could not generate a story. Try again.');
      setPhase('select');
    }
  };

  /** Load a paragraph (fresh or previously saved) into the playing phase — no AI call. */
  const openStory = (story: StoryGap) => {
    const result = parseCloze(story.paragraph);
    setCloze(result);
    setPlaced(new Array(result.answers.length).fill(null));
    setPhase('playing');
  };

  const removeSaved = async (id: string) => {
    setHistory((h) => (h ?? []).filter((s) => s.id !== id));
    try {
      await deleteStoryGap(id);
    } catch {
      toast.error('Could not delete — try again.');
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
      if (next.every((p) => p !== null)) {
        playWin();
        setTimeout(() => setPhase('finished'), 650);
      } else {
        playCorrect();
      }
    } else {
      playWrong();
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

        {/* Past stories — replaying costs nothing, only "Generate story" below does. */}
        {history === null ? (
          <div className="py-6 flex items-center justify-center gap-2 text-sm text-text-muted">
            <div className="w-4 h-4 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" />
            Loading your stories…
          </div>
        ) : history.length > 0 ? (
          <div className="space-y-2 mb-6">
            <p className="text-xs font-display font-extrabold text-text-muted uppercase tracking-wide mb-2">
              Your stories
            </p>
            {history.map((s) => (
              <div
                key={s.id}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-[3px] border-border bg-bg-card hover:border-accent-purple/40 transition-colors"
              >
                <button onClick={() => openStory(s)} className="flex-1 min-w-0 text-left flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-accent-purple/10 text-accent-purple flex items-center justify-center shrink-0">
                    <Icon icon="lucide:book-open" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-text-primary truncate">
                      {s.words.slice(0, 4).join(', ')}{s.words.length > 4 ? `, +${s.words.length - 4} more` : ''}
                    </span>
                    <span className="block text-[11px] text-text-muted mt-0.5">{agoLabel(s.createdAt)}</span>
                  </span>
                </button>
                <button
                  onClick={() => removeSaved(s.id)}
                  title="Delete this story"
                  className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-text-muted hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                >
                  <Icon icon="lucide:trash-2" className="text-sm" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="card-game border-accent-purple p-5 mb-5">
          <p className="text-sm font-bold text-text-secondary">
            Pick <span className="text-accent-purple">2–{MAX_WORDS}</span> words. We'll write a short story
            using them, then you drag each word into its gap.
          </p>
        </div>

        {/* No explicit list from the caller — pick which words this round draws from. */}
        {!explicitWords && (
          <div className="mb-5">
            <FilterTabs active={pool.filter} counts={pool.counts} onSelect={pool.setFilter} />
          </div>
        )}

        {!explicitWords && pool.initialLoading ? (
          <div className="py-6 flex items-center justify-center gap-2 text-sm text-text-muted mb-6">
            <div className="w-4 h-4 rounded-full border-2 border-accent-purple/30 border-t-accent-purple animate-spin" />
            Loading words…
          </div>
        ) : (
        <div className="flex flex-wrap gap-2 mb-6">
          {words.map((word) => {
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
        )}

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
                onClick={() => { playSelect(); setActiveTile((t) => (t === word ? null : word)); }}
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
