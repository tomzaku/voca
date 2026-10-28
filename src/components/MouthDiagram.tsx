import { useEffect, useMemo, useState } from 'react';
import { articulationFor, REST_POSE, type MouthPose } from '../data/articulation';

/**
 * Side view of a mouth making one IPA sound — jaw, lips, tongue and soft
 * palate, drawn from `articulationFor`'s poses. Animated, it loops
 * rest → sound → rest so the movement is what reads, not just the end
 * position; diphthongs and affricates glide through both of their poses.
 * Static (or under reduced motion) it holds the sound's first pose.
 */

const MOVE_MS = 380;
const HOLD_MS = 650;
const REST_HOLD_MS = 700;

// Mostly fixed illustration colours: a cavity that followed `bg-primary`
// would turn pale in the light theme, so it has its own `--mouth-cavity`.
const INK = {
  head: 'var(--color-bg-tertiary)',
  outline: 'var(--color-border-light)',
  cavity: 'var(--mouth-cavity)',
  tongue: '#f27a96',
  tongueEdge: '#d3536f',
  lips: '#e45d80',
  teeth: '#ffffff',
  teethEdge: '#c9cede',
  cue: 'var(--color-accent-cyan)',
};

type Frame = MouthPose & { active: number };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

function mix(a: Frame, b: Frame, t: number): Frame {
  const out = {} as Frame;
  for (const k of Object.keys(a) as (keyof Frame)[]) out[k] = lerp(a[k], b[k], t);
  return out;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Steps through rest → each pose → rest on a loop, eased between holds. */
function useMouthFrame(poses: MouthPose[], animate: boolean): Frame {
  const still: Frame = { ...(poses[0] ?? REST_POSE), active: 1 };
  const [frame, setFrame] = useState<Frame>(still);
  const key = JSON.stringify(poses);

  useEffect(() => {
    const target: Frame = { ...(poses[0] ?? REST_POSE), active: 1 };
    if (!animate || prefersReducedMotion() || poses.length === 0) {
      setFrame(target);
      return;
    }
    const keys: Frame[] = [
      { ...REST_POSE, active: 0 },
      ...poses.map((p) => ({ ...p, active: 1 })),
    ];
    // Each step: move into keys[i], then hold it.
    const steps = keys.map((_, i) => ({ to: i, hold: i === 0 ? REST_HOLD_MS : HOLD_MS }));
    const cycle = steps.reduce((n, s) => n + MOVE_MS + s.hold, 0);
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      let t = (now - start) % cycle;
      for (const s of steps) {
        const from = keys[(s.to - 1 + keys.length) % keys.length];
        if (t < MOVE_MS) { setFrame(mix(from, keys[s.to], ease(t / MOVE_MS))); break; }
        t -= MOVE_MS;
        if (t < s.hold) { setFrame(keys[s.to]); break; }
        t -= s.hold;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // `key` stands in for `poses`, which is a fresh array on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, animate]);

  return frame;
}

const PIVOT = { x: 150, y: 58 };
const MAX_JAW_DEG = 13;

export function MouthDiagram({ symbol, animate = true, className = '' }: {
  symbol: string;
  animate?: boolean;
  className?: string;
}) {
  const art = useMemo(() => articulationFor(symbol), [symbol]);
  const f = useMouthFrame(art?.poses ?? [], animate);
  if (!art) return null;

  // The lower jaw (teeth, lip, chin, mouth floor) swings open around the jaw
  // joint; anything resting on it — the tongue's floor and root — follows.
  const deg = -f.jaw * MAX_JAW_DEG;
  const rad = (deg * Math.PI) / 180;
  const low = (x: number, y: number) => {
    const dx = x - PIVOT.x;
    const dy = y - PIVOT.y;
    return [PIVOT.x + dx * Math.cos(rad) - dy * Math.sin(rad), PIVOT.y + dx * Math.sin(rad) + dy * Math.cos(rad)];
  };
  const pt = ([x, y]: number[]) => `${x.toFixed(1)} ${y.toFixed(1)}`;
  const jawTransform = `rotate(${deg.toFixed(2)} ${PIVOT.x} ${PIVOT.y})`;

  const floor = low(64, 96);
  const root = low(150, 122);
  const rootBack = low(132, 126);
  const tongue = [
    `M ${pt(floor)}`,
    `Q ${pt([f.tx - 5, f.ty + 8])} ${pt([f.tx, f.ty])}`,
    `C ${pt([f.tx + 8, f.ty - 5])} ${pt([f.bx - 24, f.by])} ${pt([f.bx, f.by])}`,
    `C ${pt([f.bx + 20, f.by])} ${pt([154, 76])} ${pt(root)}`,
    `L ${pt(rootBack)} Z`,
  ].join(' ');

  const p = f.round * 7;
  const lowerLip = { x: f.labio * 9, y: -f.close * 5 - f.labio * 8 };
  const velumTip = { x: 156 - f.velum * 10, y: 58 + f.velum * 16 };

  return (
    <svg viewBox="0 14 186 146" className={className} role="img" aria-label={`Mouth position for /${symbol}/`}>
      {/* Head */}
      <path
        d="M200 0 L80 0 C74 14 60 28 36 40 Q24 45 30 51 L40 54 L47 57 L47 70 L62 70 L62 150 L200 160 Z"
        fill={INK.head}
      />
      <path d="M100 132 L200 124 L200 170 L104 170 Z" fill={INK.head} />
      {/* Nasal passage and mouth cavity */}
      <path d="M40 46 C70 36 118 32 150 50" fill="none" stroke={INK.cavity} strokeWidth="6" strokeLinecap="round" />
      <path d="M48 62 L60 60 C78 52 106 44 134 47 Q150 50 158 62 L160 130 L120 124 L70 112 L46 100 Z" fill={INK.cavity} />

      {/* Lower jaw */}
      <g transform={jawTransform}>
        <path
          d="M46 74 L62 80 L92 104 L132 118 L164 124 L200 124 L200 170 L110 170 L110 136 Q72 132 52 122 Q38 112 40 98 Q44 92 46 84 Z"
          fill={INK.head}
        />
        <path d="M46 85 Q44 92 40 98 Q38 112 52 122 Q72 132 110 136" fill="none" stroke={INK.outline} strokeWidth="1.5" strokeLinecap="round" />
      </g>

      <path d={tongue} fill={INK.tongue} stroke={INK.tongueEdge} strokeWidth="1.2" strokeLinejoin="round" />
      <g transform={jawTransform}>
        <path d="M51 74 Q54 72 57 74 L58 88 L52 88 Z" fill={INK.teeth} stroke={INK.teethEdge} strokeWidth="0.8" />
      </g>

      {/* Upper teeth and soft palate */}
      <path d="M52 58 L58 58 L57 71 Q54 73 51 70 Z" fill={INK.teeth} stroke={INK.teethEdge} strokeWidth="0.8" />
      <path
        d={`M126 46 Q146 48 ${velumTip.x.toFixed(1)} ${velumTip.y.toFixed(1)}`}
        fill="none"
        stroke={INK.head}
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* Lips */}
      <path
        d={`M48 56 C41 55 ${34 - p} 56 ${32 - p} 61 C${31 - p} 64 ${35 - p} 67 49 67 Z`}
        fill={INK.lips}
      />
      <g transform={`${jawTransform} translate(${lowerLip.x.toFixed(1)} ${lowerLip.y.toFixed(1)})`}>
        <path d={`M49 73 C${36 - p} 72 ${32 - p} 75 ${32 - p} 78 C${33 - p} 83 40 85 49 85 Z`} fill={INK.lips} />
      </g>

      {/* Profile outline, drawn over the fills so the face reads as one shape */}
      <path
        d="M80 0 C74 14 60 28 36 40 Q24 45 30 51 L40 54 Q45 55 48 56"
        fill="none"
        stroke={INK.outline}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Cues: buzzing throat, air out of the nose, air out of the mouth */}
      {art.voiced && (
        <g opacity={f.active} className={animate ? 'mouth-buzz' : undefined}>
          <path d="M168 128 l4 -4 l4 4 l4 -4 l4 4" fill="none" stroke={INK.cue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M168 136 l4 -4 l4 4 l4 -4 l4 4" fill="none" stroke={INK.cue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
      {art.nasal && (
        <path
          d="M140 48 C110 36 72 38 22 40"
          fill="none"
          stroke={INK.cue}
          strokeWidth="2"
          strokeDasharray="4 4"
          strokeLinecap="round"
          opacity={f.active}
          className={animate ? 'mouth-flow' : undefined}
        />
      )}
      {art.airflow && (
        <g opacity={f.active} stroke={INK.cue} strokeWidth="2" strokeLinecap="round" strokeDasharray="3 4" className={animate ? 'mouth-flow' : undefined}>
          <path d="M28 66 L6 62" />
          <path d="M28 70 L4 70" />
          <path d="M28 74 L6 78" />
        </g>
      )}
    </svg>
  );
}

/** The sound's tags ("Tongue high · front", "Voiced") as small chips. */
export function MouthTags({ symbol }: { symbol: string }) {
  const art = articulationFor(symbol);
  if (!art) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {art.tags.map((t) => (
        <span key={t} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-bg-tertiary text-text-secondary">
          {t}
        </span>
      ))}
    </div>
  );
}
