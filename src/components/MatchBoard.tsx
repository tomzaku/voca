import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { Icon } from '@iconify/react';
import { playSelect, playWin, playWrong } from '../lib/sfx';

export interface MatchPair {
  word: string;
  definition: string;
}

/** One connector: the left word, the right definition it's linked to, and the
 *  endpoint coordinates (computed from the live DOM). */
interface LineCoords {
  leftWord: string;
  rightWord: string;
  x1: number; y1: number;
  x2: number; y2: number;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** Small deterministic PRNG seeded from a string, so a connection's wobble is
 *  stable across re-renders/resizes rather than twitching each time. */
function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An SVG cubic path from (x1,y1)→(x2,y2) with two jittered control points, for
 *  a hand-drawn, not-quite-straight ink look. */
function wobblyPath(l: LineCoords): string {
  const rand = seededRandom(l.leftWord + l.rightWord);
  const dx = l.x2 - l.x1;
  const dy = l.y2 - l.y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len; // unit normal
  const ny = dx / len;
  const amp = Math.min(9, len * 0.08); // wobble magnitude, capped
  const o1 = (rand() * 2 - 1) * amp;
  const o2 = (rand() * 2 - 1) * amp;
  const c1x = l.x1 + dx / 3 + nx * o1;
  const c1y = l.y1 + dy / 3 + ny * o1;
  const c2x = l.x1 + (2 * dx) / 3 + nx * o2;
  const c2y = l.y1 + (2 * dy) / 3 + ny * o2;
  return `M ${l.x1} ${l.y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${l.x2} ${l.y2}`;
}

/**
 * A single round of tap-to-connect matching: words on the left, their
 * definitions (shuffled) on the right. You link every word freely; nothing is
 * judged until you submit. When `reveal` is true, submitting shows which links
 * are right (green) or wrong (red) before continuing; when false (answers are
 * deferred to the end of the quiz) it just hands back the result. Reports
 * `onComplete(mistakes, links)` — `links` maps each word to the definition-word
 * the player chose. Mount a fresh one (via `key`) per round.
 */
export function MatchBoard({ pairs, reveal = true, onComplete }: {
  pairs: MatchPair[];
  reveal?: boolean;
  onComplete: (mistakes: number, links: Record<string, string>) => void;
}) {
  const [active, setActive] = useState<{ side: 'L' | 'R'; word: string } | null>(null);
  // left word → the right definition's word it's linked to (one-to-one).
  const [links, setLinks] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [lines, setLines] = useState<LineCoords[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef<Map<string, HTMLElement>>(new Map());
  const rightRefs = useRef<Map<string, HTMLElement>>(new Map());

  const rightPairs = useMemo(() => shuffle(pairs), [pairs]);

  const allLinked = Object.keys(links).length === pairs.length;
  const mistakes = Object.entries(links).filter(([l, r]) => l !== r).length;

  // ── Recompute connector endpoints from the DOM ──
  const recomputeLines = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    const cr = c.getBoundingClientRect();
    const next: LineCoords[] = [];
    for (const [leftWord, rightWord] of Object.entries(links)) {
      const l = leftRefs.current.get(leftWord);
      const r = rightRefs.current.get(rightWord);
      if (!l || !r) continue;
      const lr = l.getBoundingClientRect();
      const rr = r.getBoundingClientRect();
      next.push({
        leftWord, rightWord,
        x1: lr.right - cr.left, y1: lr.top - cr.top + lr.height / 2,
        x2: rr.left - cr.left, y2: rr.top - cr.top + rr.height / 2,
      });
    }
    setLines(next);
  }, [links]);

  useLayoutEffect(() => { recomputeLines(); }, [recomputeLines]);
  useEffect(() => {
    const onResize = () => recomputeLines();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [recomputeLines]);

  const tap = (side: 'L' | 'R', word: string) => {
    if (revealed) return;
    playSelect();

    if (!active || active.side === side) {
      setActive({ side, word }); // first pick, or switch on the same side
      return;
    }

    const leftWord = side === 'L' ? word : active.word;
    const rightWord = side === 'R' ? word : active.word;
    setActive(null);

    // Link left→right, keeping it one-to-one: drop any prior use of either endpoint.
    setLinks((prev) => {
      const next: Record<string, string> = {};
      for (const [l, r] of Object.entries(prev)) {
        if (l === leftWord || r === rightWord) continue;
        next[l] = r;
      }
      next[leftWord] = rightWord;
      return next;
    });
  };

  const finish = () => {
    if (done) return;
    setDone(true);
    onComplete(mistakes, links);
  };

  // Submit: reveal right/wrong in place, or (deferred mode) just hand back.
  const submit = () => {
    if (reveal) {
      setRevealed(true);
      if (mistakes === 0) playWin(); else playWrong();
    } else {
      finish();
    }
  };

  // Colour of a card while connecting, and once answers are revealed.
  const cardState = (side: 'L' | 'R', word: string): 'default' | 'active' | 'linked' | 'correct' | 'wrong' => {
    const isLinked = side === 'L' ? word in links : Object.values(links).includes(word);
    if (revealed && isLinked) {
      const ok = side === 'L'
        ? links[word] === word
        : Object.entries(links).find(([, r]) => r === word)?.[0] === word;
      return ok ? 'correct' : 'wrong';
    }
    if (active?.side === side && active.word === word) return 'active';
    if (isLinked) return 'linked';
    return 'default';
  };

  const cardClass = (state: ReturnType<typeof cardState>) =>
    `w-full text-left px-4 py-3 rounded-xl border-2 font-semibold transition-all ${
      state === 'correct'
        ? 'border-accent-green bg-accent-green/10 text-accent-green'
        : state === 'wrong'
        ? 'border-accent-red bg-accent-red/10 text-accent-red'
        : state === 'active'
        ? 'border-accent-cyan bg-accent-cyan/15 text-text-primary scale-[1.02]'
        : state === 'linked'
        ? 'border-accent-cyan/60 bg-accent-cyan/5 text-text-primary'
        : 'border-border bg-bg-card text-text-primary hover:border-border-light cursor-pointer'
    } ${revealed ? 'cursor-default' : ''}`;

  const lineStroke = (l: LineCoords) =>
    !revealed ? 'var(--color-accent-cyan)' : l.leftWord === l.rightWord ? 'var(--color-accent-green)' : 'var(--color-accent-red)';

  return (
    <div>
      <div ref={containerRef} className="relative grid grid-cols-2 gap-x-6 sm:gap-x-14 gap-y-3">
        {/* Hand-drawn connector lines (behind the cards) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" aria-hidden>
          {lines.map((l) => (
            <path
              key={l.leftWord}
              d={wobblyPath(l)}
              fill="none"
              stroke={lineStroke(l)}
              strokeWidth={2.5}
              strokeLinecap="round"
              className="animate-fade-in"
            />
          ))}
        </svg>

        {/* Left — words */}
        <div className="space-y-3 relative z-10">
          {pairs.map((p) => {
            const state = cardState('L', p.word);
            return (
              <button
                key={p.word}
                ref={(el) => { if (el) leftRefs.current.set(p.word, el); else leftRefs.current.delete(p.word); }}
                onClick={() => tap('L', p.word)}
                disabled={revealed}
                className={`${cardClass(state)} font-display font-extrabold flex items-center justify-between gap-2`}
              >
                <span className="truncate">{p.word}</span>
                {state === 'correct' && <Icon icon="solar:check-circle-bold" className="shrink-0" />}
                {state === 'wrong' && <Icon icon="solar:close-circle-bold" className="shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Right — definitions (shuffled) */}
        <div className="space-y-3 relative z-10">
          {rightPairs.map((p) => {
            const state = cardState('R', p.word);
            return (
              <button
                key={p.word}
                ref={(el) => { if (el) rightRefs.current.set(p.word, el); else rightRefs.current.delete(p.word); }}
                onClick={() => tap('R', p.word)}
                disabled={revealed}
                className={`${cardClass(state)} text-sm leading-snug`}
              >
                {p.definition}
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6">
        {!revealed ? (
          <button
            onClick={submit}
            disabled={!allLinked}
            className="w-full py-3 rounded-xl bg-accent-cyan text-bg-primary font-display font-extrabold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            <Icon icon="solar:check-read-bold" className="text-lg" />
            {!allLinked
              ? `Connect all (${Object.keys(links).length}/${pairs.length})`
              : reveal ? 'Check answers' : 'Submit'}
          </button>
        ) : (
          <div className="text-center">
            <p className="text-sm font-bold mb-3">
              {mistakes === 0
                ? <span className="text-accent-green">All correct! 🎉</span>
                : <span className="text-accent-red">{mistakes} wrong — the red links are your misses.</span>}
            </p>
            <button
              onClick={finish}
              disabled={done}
              className="w-full py-3 rounded-xl bg-accent-cyan text-bg-primary font-display font-extrabold hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
