import type { MouthPose } from '../data/articulation';

// Shared by the flat views (MouthDiagram) and the 3D one (Mouth3D).

// Mostly fixed illustration colours: a cavity that followed `bg-primary`
// would turn pale in the light theme, so it has its own `--mouth-cavity`.
export const INK = {
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

export type Frame = MouthPose & { active: number };

export const PIVOT = { x: 150, y: 58 };
export const MAX_JAW_DEG = 13;

/** The lips from the front: how wide, how round, how open, and what shows
 *  between them — teeth, the tongue, its tip between the teeth for /θ ð/,
 *  the top teeth on the lower lip for /f v/. The side view can't show any of
 *  that, and the lip shape is the part a learner can check in a mirror. */
export function frontShapes(f: Frame) {
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
    ow,
    lipU,
    lipL,
    upperTeeth: 3.5 * (1 - f.round * 0.8),
    lowerTeeth: 3 * open * (1 - f.round),
    // A back tongue sits low and out of sight; a front one fills the floor.
    tongueY: holeBottom + 3 + clamp((f.bx - 96) / 40) * 5,
    tongueRy: 5 + open * 9,
    tipOut: f.tx < 52,
    labio: f.labio > 0.5,
  };
}
