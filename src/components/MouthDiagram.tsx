import { useEffect, useId, useMemo, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { articulationFor, REST_POSE, type Articulation, type MouthPose } from '../data/articulation';
import { useIpaText } from '../hooks/useIpaText';

/**
 * Side view of a mouth making one IPA sound — jaw, lips, tongue and soft
 * palate, drawn from `articulationFor`'s poses. Animated, it loops
 * rest → sound → rest so the movement is what reads, not just the end
 * position; diphthongs and affricates glide through both of their poses.
 * Static (or under reduced motion) it holds the sound's first pose.
 *
 * With `view="both"` the lips are drawn from the front too — the side view
 * shows the tongue, but only the front shows the lips' shape.
 *
 * Given a `ghost`, it also outlines that sound's tongue and lips, dashed,
 * on the same timeline — the Compare view's pairs differ by a few pixels,
 * which two separate drawings side by side can't show.
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
  // Yellow reads on both the dark cavity and the light theme's grey head.
  ghost: 'var(--color-accent-yellow)',
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

/** Steps through rest → each pose → rest on a loop, eased between holds —
 *  for several sounds at once, on one timeline, so a ghost moves with the
 *  sound it's compared to. A shorter script holds its last pose while a
 *  longer one (an affricate, a diphthong) takes its second step. */
function useMouthFrames(sets: MouthPose[][], animate: boolean): Frame[] {
  const stillFrames = () => sets.map((poses) => ({ ...(poses[0] ?? REST_POSE), active: 1 }));
  const [frames, setFrames] = useState<Frame[]>(stillFrames);
  const key = JSON.stringify(sets);

  useEffect(() => {
    const steps = Math.max(0, ...sets.map((p) => p.length));
    if (!animate || prefersReducedMotion() || steps === 0) {
      setFrames(stillFrames());
      return;
    }
    const keys: Frame[][] = sets.map((poses) => [
      { ...REST_POSE, active: 0 },
      ...Array.from({ length: steps }, (_, i) => ({ ...(poses[Math.min(i, poses.length - 1)] ?? REST_POSE), active: 1 })),
    ]);
    const holds = keys[0].map((_, i) => (i === 0 ? REST_HOLD_MS : HOLD_MS));
    const cycle = holds.reduce((n, h) => n + MOVE_MS + h, 0);
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      let t = (now - start) % cycle;
      for (let i = 0; i < holds.length; i++) {
        const from = (i - 1 + holds.length) % holds.length;
        if (t < MOVE_MS) { const e = ease(t / MOVE_MS); setFrames(keys.map((k) => mix(k[from], k[i], e))); break; }
        t -= MOVE_MS;
        if (t < holds[i]) { setFrames(keys.map((k) => k[i])); break; }
        t -= holds[i];
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // `key` stands in for `sets`, which is a fresh array on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, animate]);

  return frames;
}

const PIVOT = { x: 150, y: 58 };
const MAX_JAW_DEG = 13;

/** The moving parts of one frame, as SVG paths and transforms. */
function shapes(f: Frame) {
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
  return {
    jawTransform,
    tongue,
    upperLip: `M48 56 C41 55 ${34 - p} 56 ${32 - p} 61 C${31 - p} 64 ${35 - p} 67 49 67 Z`,
    lowerLip: `M49 73 C${36 - p} 72 ${32 - p} 75 ${32 - p} 78 C${33 - p} 83 40 85 49 85 Z`,
    lowerLipTransform: `${jawTransform} translate(${lowerLip.x.toFixed(1)} ${lowerLip.y.toFixed(1)})`,
    velumTip: { x: 156 - f.velum * 10, y: 58 + f.velum * 16 },
  };
}

/** The lips from the front: how wide, how round, how open, and what shows
 *  between them — teeth, the tongue, its tip between the teeth for /θ ð/,
 *  the top teeth on the lower lip for /f v/. The side view can't show any of
 *  that, and the lip shape is the part a learner can check in a mirror. */
function frontShapes(f: Frame) {
  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  const open = clamp((f.jaw - 0.04) / 0.86);
  const shut = 1 - Math.max(f.close, f.labio);
  // A front tongue pulls the lips into a smile; rounding pinches them in.
  const spread = clamp((124 - f.bx) / 38) * (1 - f.round) * shut;
  const ow = 30 + spread * 5 - f.round * 13;
  const iw = ow * (1 - f.round * 0.45);
  const gap = shut * Math.max(1.5 + open * 26, f.round * 9);
  const yu = 50 - gap * 0.3;
  const yl = 50 + gap * 0.7;
  const yc = (yu + yl) / 2;
  const lipU = 7 + f.round * 3;
  const lipL = 9 + f.round * 3;
  const k = 0.6 + f.round * 0.3; // bulge: rounder lips make an oval hole
  const n = (v: number) => v.toFixed(1);
  const hole = `M${n(60 - iw)} ${n(yc)} C${n(60 - iw * k)} ${n(yu)} ${n(60 + iw * k)} ${n(yu)} ${n(60 + iw)} ${n(yc)} `
    + `C${n(60 + iw * k)} ${n(yl)} ${n(60 - iw * k)} ${n(yl)} ${n(60 - iw)} ${n(yc)} Z`;
  const top = yu - lipU;
  const outline = `M${n(60 - ow)} ${n(yc)} C${n(60 - ow * 0.7)} ${n(top + 2)} ${n(50)} ${n(top - 1)} ${n(54)} ${n(top)} `
    + `Q60 ${n(top + 2.5)} 66 ${n(top)} C70 ${n(top - 1)} ${n(60 + ow * 0.7)} ${n(top + 2)} ${n(60 + ow)} ${n(yc)} `
    + `C${n(60 + ow * (0.6 + f.round * 0.2))} ${n(yl + lipL)} ${n(60 - ow * (0.6 + f.round * 0.2))} ${n(yl + lipL)} ${n(60 - ow)} ${n(yc)} Z`;
  // The hole's curves only get 3/4 of the way to their control points, so
  // its real top and bottom edges sit inside yu/yl — place teeth on those.
  const holeTop = yc - (yc - yu) * 0.75;
  const holeBottom = yc + (yl - yc) * 0.75;
  return {
    hole,
    lips: `${outline} ${hole}`,
    outline,
    yu: holeTop,
    yl: holeBottom,
    yc,
    iw,
    upperTeeth: 3.5 * (1 - f.round * 0.8),
    lowerTeeth: 3 * open * (1 - f.round),
    // A back tongue sits low and out of sight; a front one fills the floor.
    tongueY: holeBottom + 3 + clamp((f.bx - 96) / 40) * 5,
    tongueRy: 5 + open * 9,
    tipOut: f.tx < 52,
    labio: f.labio > 0.5,
  };
}

function SideView({ f, g, art, animate, label, className }: {
  f: Frame;
  g: Frame | undefined;
  art: Articulation;
  animate: boolean;
  label: string;
  className: string;
}) {
  const { jawTransform, tongue, upperLip, lowerLip, lowerLipTransform, velumTip } = shapes(f);
  const gs = g ? shapes(g) : null;

  return (
    <svg viewBox="0 14 186 146" className={className} role="img" aria-label={label}>
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
      <path d={upperLip} fill={INK.lips} />
      <g transform={lowerLipTransform}>
        <path d={lowerLip} fill={INK.lips} />
      </g>

      {/* Profile outline, drawn over the fills so the face reads as one shape */}
      <path
        d="M80 0 C74 14 60 28 36 40 Q24 45 30 51 L40 54 Q45 55 48 56"
        fill="none"
        stroke={INK.outline}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* The compared sound, outlined */}
      {gs && (
        <g fill="none" stroke={INK.ghost} strokeWidth="1.6" strokeDasharray="3 2.5" strokeLinejoin="round">
          <path d={gs.tongue} />
          <path d={gs.upperLip} />
          <g transform={gs.lowerLipTransform}>
            <path d={gs.lowerLip} />
          </g>
        </g>
      )}

      {/* Cues: buzzing throat, air out of the nose, air out of the mouth */}
      {art.voiced && (
        <g opacity={f.active} className={animate ? 'mouth-buzz' : undefined}>
          <path d="M168 128 l4 -4 l4 4 l4 -4 l4 4" fill="none" stroke={INK.cue} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M168 136 l4 -4 l4 4 l4 -4 l4 4" fill="none" stroke={INK.cue} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
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

function FrontView({ f, g, label, className }: { f: Frame; g: Frame | undefined; label: string; className: string }) {
  const clip = useId();
  const m = frontShapes(f);
  const gm = g ? frontShapes(g) : null;
  const tw = Math.min(15, m.iw);
  return (
    <svg viewBox="16 12 88 82" className={className} role="img" aria-label={label}>
      <rect x="16" y="12" width="88" height="82" rx="20" fill={INK.head} />
      {/* Nose base and chin, just enough to say "a face, from the front" */}
      <path d="M48 19 Q53 23 60 21.5 Q67 23 72 19" fill="none" stroke={INK.outline} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M44 86 Q60 92 76 86" fill="none" stroke={INK.outline} strokeWidth="1.5" strokeLinecap="round" />

      <clipPath id={clip}><path d={m.hole} /></clipPath>
      <g clipPath={`url(#${clip})`}>
        <rect x="0" y="0" width="120" height="110" fill={INK.cavity} />
        <ellipse cx="60" cy={m.tongueY} rx={m.iw * 0.85} ry={m.tongueRy} fill={INK.tongue} stroke={INK.tongueEdge} strokeWidth="0.8" />
        {m.lowerTeeth > 0.3 && (
          <path
            d={`M${60 - tw} ${m.yl + 4} L${60 - tw} ${m.yl - m.lowerTeeth} L${60 + tw} ${m.yl - m.lowerTeeth} L${60 + tw} ${m.yl + 4} Z M${60 - tw / 2} ${m.yl - m.lowerTeeth} L${60 - tw / 2} ${m.yl} M60 ${m.yl - m.lowerTeeth} L60 ${m.yl} M${60 + tw / 2} ${m.yl - m.lowerTeeth} L${60 + tw / 2} ${m.yl}`}
            fill={INK.teeth}
            stroke={INK.teethEdge}
            strokeWidth="0.6"
          />
        )}
        <path
          d={`M${60 - tw} ${m.yu - 4} L${60 - tw} ${m.yu + m.upperTeeth} L${60 + tw} ${m.yu + m.upperTeeth} L${60 + tw} ${m.yu - 4} Z M${60 - tw / 2} ${m.yu} L${60 - tw / 2} ${m.yu + m.upperTeeth} M60 ${m.yu} L60 ${m.yu + m.upperTeeth} M${60 + tw / 2} ${m.yu} L${60 + tw / 2} ${m.yu + m.upperTeeth}`}
          fill={INK.teeth}
          stroke={INK.teethEdge}
          strokeWidth="0.6"
        />
        {m.tipOut && <ellipse cx="60" cy={m.yc + 0.5} rx="9" ry="3.2" fill={INK.tongue} stroke={INK.tongueEdge} strokeWidth="0.8" />}
      </g>
      <path d={m.lips} fill={INK.lips} fillRule="evenodd" />
      {/* /f v/: the top teeth resting on the lower lip */}
      {m.labio && <rect x="49" y={m.yc - 2} width="22" height="5" rx="1.2" fill={INK.teeth} stroke={INK.teethEdge} strokeWidth="0.6" />}

      {gm && (
        <g fill="none" stroke={INK.ghost} strokeWidth="1.4" strokeDasharray="3 2.5" strokeLinejoin="round">
          <path d={gm.outline} />
          <path d={gm.hole} />
        </g>
      )}
    </svg>
  );
}

export function MouthDiagram({ symbol, ghost, animate = true, view = 'side', className = '' }: {
  symbol: string;
  /** Another sound to outline on top, for comparing the two. */
  ghost?: string;
  animate?: boolean;
  /** `both` adds the lips from the front beside the side view, on one
   *  timeline. `className` then sizes the pair; each view keeps its ratio. */
  view?: 'side' | 'both';
  className?: string;
}) {
  const intl = useIntl();
  const art = useMemo(() => articulationFor(symbol), [symbol]);
  const ghostArt = useMemo(() => (ghost ? articulationFor(ghost) : null), [ghost]);
  const [f, gf] = useMouthFrames(ghostArt ? [art?.poses ?? [], ghostArt.poses] : [art?.poses ?? []], animate);
  if (!art) return null;

  const label = intl.formatMessage({ id: 'ipa.mouthPositionFor' }, { symbol });
  if (view === 'side') return <SideView f={f} g={gf} art={art} animate={animate} label={label} className={className} />;
  return (
    <div className={`grid grid-cols-[127fr_107fr] gap-2 items-end ${className}`}>
      <figure className="min-w-0">
        <SideView f={f} g={gf} art={art} animate={animate} label={label} className="w-full h-auto" />
        <figcaption className="text-center text-[10px] font-bold uppercase tracking-wider text-text-muted"><FormattedMessage id="ipa.viewSide" /></figcaption>
      </figure>
      <figure className="min-w-0">
        <FrontView f={f} g={gf} label={intl.formatMessage({ id: 'ipa.lipsFor' }, { symbol })} className="w-full h-auto" />
        <figcaption className="text-center text-[10px] font-bold uppercase tracking-wider text-text-muted"><FormattedMessage id="ipa.viewFront" /></figcaption>
      </figure>
    </div>
  );
}

/** The sound's tags ("Tongue high · front", "Voiced") as small chips. */
export function MouthTags({ symbol }: { symbol: string }) {
  const text = useIpaText();
  const art = articulationFor(symbol);
  if (!art) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {art.tags.map((t) => (
        <span key={t} className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-bg-tertiary text-text-secondary">
          {text.mouth(t)}
        </span>
      ))}
    </div>
  );
}
