import { useRef, useState, type PointerEvent } from 'react';
import { frontShapes, INK, MAX_JAW_DEG, PIVOT, type Frame } from './mouthGeometry';

/**
 * The mouth as a small 3D model — lips, both rows of teeth, tongue and roof
 * of the mouth — that turns when dragged. The flat views each hide something
 * (the side hides the lips' shape, the front hides the tongue); turned to a
 * three-quarter view, one picture shows how they work together.
 *
 * No 3D library: a few hundred shaded polygons projected into an SVG and
 * drawn back to front, built each frame from the same pose the flat views
 * use, so it animates and scrubs with them.
 *
 * Model space uses the side view's units: `d` front→back (the side view's
 * x), `h` top→bottom (its y), and `x` across the mouth, 0 in the middle.
 */

type V = [x: number, h: number, d: number];
type Poly = { pts: V[]; hue: number; sat: number; light: number; alpha?: number; edge?: boolean };

const CENTER: V = [0, 72, 90];
const LIGHT = norm([-0.35, -0.6, -0.7]);

function norm([a, b, c]: number[]): V {
  const l = Math.hypot(a, b, c) || 1;
  return [a / l, b / l, c / l];
}

const quad = (p0: number[], p1: number[], p2: number[], t: number) =>
  p0.map((_, i) => (1 - t) ** 2 * p0[i] + 2 * (1 - t) * t * p1[i] + t * t * p2[i]);
const cubic = (p0: number[], p1: number[], p2: number[], p3: number[], t: number) =>
  p0.map((_, i) => (1 - t) ** 3 * p0[i] + 3 * (1 - t) ** 2 * t * p1[i] + 3 * (1 - t) * t * t * p2[i] + t ** 3 * p3[i]);

/** Swings a side-view point with the lower jaw, as MouthDiagram does. */
function jawOf(f: Frame) {
  const rad = (-f.jaw * MAX_JAW_DEG * Math.PI) / 180;
  return ([d, h]: number[]): [number, number] => {
    const dx = d - PIVOT.x;
    const dy = h - PIVOT.y;
    return [PIVOT.x + dx * Math.cos(rad) - dy * Math.sin(rad), PIVOT.y + dx * Math.sin(rad) + dy * Math.cos(rad)];
  };
}

/** The tongue's midline, tip-underside → tip → body → root: the side view's
 *  tongue outline, sampled. Points are [d, h]. */
function tongueLine(f: Frame): number[][] {
  const low = jawOf(f);
  const floor = low([64, 96]);
  const root = low([150, 122]);
  const tip = [f.tx, f.ty];
  const out: number[][] = [];
  // From the tip, and only the start of the root: the underside and the
  // rest of the root hang below the mouth and read, in 3D, as a curtain.
  out.push(quad(floor, [f.tx - 5, f.ty + 8], tip, 0.75));
  out.push(tip);
  for (let i = 1; i <= 8; i++) out.push(cubic(tip, [f.tx + 8, f.ty - 5], [f.bx - 24, f.by], [f.bx, f.by], i / 8));
  for (let i = 1; i <= 3; i++) out.push(cubic([f.bx, f.by], [f.bx + 20, f.by], [154, 76], root, (i / 3) * 0.55));
  return out;
}

// The dental arch: front teeth at d≈54, molars at the sides further back.
const ARCH_X = 17;
const ARCH_D = 34;
const ARCH_N = 14;
const arch = (i: number) => {
  const a = -Math.PI / 2 + (Math.PI * i) / ARCH_N;
  return { x: ARCH_X * Math.sin(a), d: 54 + ARCH_D * (1 - Math.cos(a)), side: Math.abs(Math.sin(a)) };
};
/** Half the arch's width at depth `d` — where the palate meets the teeth. */
const archHalf = (d: number) => {
  const c = 1 - (d - 54) / ARCH_D;
  return c <= 0 ? ARCH_X : ARCH_X * Math.sqrt(Math.max(0, 1 - c * c));
};

function buildTongue(f: Frame, polys: Poly[]) {
  const line = tongueLine(f);
  const n = line.length;
  const across = 8;
  const rows = line.map(([d, h], i) => {
    const s = i / (n - 1);
    // Narrow at the tip, broad over the body, a little narrower at the root.
    const w = i === 0 ? 4 : i === 1 ? 6 : 7 + 9 * Math.min(1, (s - 0.1) / 0.3) - Math.max(0, s - 0.8) * 12;
    return Array.from({ length: across + 1 }, (_, j) => {
      const u = -1 + (2 * j) / across;
      return [u * w, h + u * u * 7, d] as V;
    });
  });
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < across; j++) {
      polys.push({ pts: [rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j]], hue: 346, sat: 82, light: 70 });
    }
  }
  return line;
}

function buildTeeth(f: Frame, polys: Poly[]) {
  const low = jawOf(f);
  for (let i = 0; i < ARCH_N; i++) {
    const a = arch(i);
    const b = arch(i + 1);
    // Upper: gum line to biting edge; back teeth are shorter.
    const ua = 71 - a.side * 3;
    const ub = 71 - b.side * 3;
    polys.push({ pts: [[a.x, 59, a.d], [b.x, 59, b.d], [b.x, ub, b.d], [a.x, ua, a.d]], hue: 225, sat: 20, light: 96, edge: true });
    // Lower: hung on the jaw, so they drop as it opens.
    const [lad, lah] = low([a.d, 74 + a.side * 2]);
    const [lbd, lbh] = low([b.d, 74 + b.side * 2]);
    const [lad2, lah2] = low([a.d, 86]);
    const [lbd2, lbh2] = low([b.d, 86]);
    polys.push({ pts: [[a.x, lah, lad], [b.x, lbh, lbd], [b.x, lbh2, lbd2], [a.x, lah2, lad2]], hue: 225, sat: 20, light: 93, edge: true });
  }
}

/** The roof of the mouth, see-through: the hard palate from the ridge behind
 *  the teeth to the soft palate, which lifts to close off the nose. */
function buildPalate(f: Frame, polys: Poly[]) {
  const mid: number[][] = [];
  for (let i = 0; i <= 6; i++) mid.push(cubic([58, 60], [78, 52], [106, 44], [134, 47], i / 6));
  const vt = [156 - f.velum * 10, 58 + f.velum * 16];
  for (let i = 1; i <= 3; i++) mid.push(quad([134, 47], [146, 48], vt, i / 3));
  const across = 6;
  const rows = mid.map(([d, h]) => {
    const w = archHalf(Math.min(d, 54 + ARCH_D));
    return Array.from({ length: across + 1 }, (_, j) => {
      const u = -1 + (2 * j) / across;
      return [u * w, h + u * u * Math.max(0, 59 - h), d] as V;
    });
  });
  for (let i = 0; i < mid.length - 1; i++) {
    for (let j = 0; j < across; j++) {
      polys.push({ pts: [rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j]], hue: 340, sat: 35, light: 62, alpha: 0.22 });
    }
  }
}

/** The lips as a ring around the opening, from the front view's shape:
 *  inner edge, a ridge that pushes forward as they round, and an outer edge
 *  back against the face. */
function lipRings(f: Frame) {
  const m = frontShapes(f);
  const N = 28;
  const p = f.round * 7;
  const rings: V[][] = [[], [], []];
  for (let i = 0; i < N; i++) {
    const a = (2 * Math.PI * i) / N;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const up = s < 0;
    const rIn = up ? m.yc - m.yu : m.yl - m.yc;
    const rOut = rIn + (up ? m.lipU : m.lipL) * 1.3;
    const corner = c * c;
    const h = (r: number) => m.yc + 20 + s * r;
    rings[0].push([c * m.iw * 0.8, h(rIn), 47]);
    rings[1].push([c * ((m.iw + m.ow) / 2) * 0.85, h((rIn + rOut) / 2), 36 - p + corner * 9]);
    rings[2].push([c * m.ow * 0.85, h(rOut), 48]);
  }
  return rings;
}

function buildLips(f: Frame, polys: Poly[]) {
  const rings = lipRings(f);
  const N = rings[0].length;
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < N; i++) {
      const k = (i + 1) % N;
      polys.push({ pts: [rings[r][i], rings[r][k], rings[r + 1][k], rings[r + 1][i]], hue: 344, sat: 70, light: 62 });
    }
  }
}

export default function Mouth3D({ f, g, label, className }: { f: Frame; g: Frame | undefined; label: string; className: string }) {
  // Three-quarter view from the speaker's left, slightly above.
  const [yaw, setYaw] = useState(-38);
  const [pitch, setPitch] = useState(14);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const ry = (yaw * Math.PI) / 180;
  const rp = (pitch * Math.PI) / 180;
  const project = ([x, h, d]: V): V => {
    const dz = d - CENTER[2];
    const dy = h - CENTER[1];
    const x1 = x * Math.cos(ry) - dz * Math.sin(ry);
    const z1 = x * Math.sin(ry) + dz * Math.cos(ry);
    const y2 = dy * Math.cos(rp) - z1 * Math.sin(rp);
    const z2 = dy * Math.sin(rp) + z1 * Math.cos(rp);
    const k = 420 / (420 + z2);
    return [x1 * k, y2 * k, z2];
  };

  const polys: Poly[] = [];
  buildPalate(f, polys);
  buildTongue(f, polys);
  buildTeeth(f, polys);
  buildLips(f, polys);

  const drawn = polys.map((poly) => {
    const pts = poly.pts.map(project);
    const depth = pts.reduce((n, p) => n + p[2], 0) / pts.length;
    const [a, b, c] = pts;
    const n = norm([
      (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]),
      (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
      (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]),
    ]);
    const lit = Math.abs(n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
    const light = poly.light * (0.62 + 0.38 * lit);
    return { d: `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}Z`, depth, fill: `hsl(${poly.hue} ${poly.sat}% ${light.toFixed(0)}%)`, alpha: poly.alpha, edge: poly.edge };
  }).sort((a, b) => b.depth - a.depth);

  // The compared sound: its lip ridge and tongue midline, dashed.
  const line = (pts: V[], close: boolean) => `M${pts.map(project).map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}${close ? 'Z' : ''}`;
  const ghost = g && {
    lips: line(lipRings(g)[1], true),
    tongue: line(tongueLine(g).map(([d, h]) => [0, h, d] as V), false),
  };

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    drag.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    setYaw((v) => ((v + dx * 0.8 + 540) % 360) - 180);
    setPitch((v) => Math.max(-60, Math.min(70, v + dy * 0.6)));
  };
  const onUp = () => { drag.current = null; };

  return (
    <svg
      viewBox="-66 -48 132 96"
      className={`${className} cursor-grab active:cursor-grabbing touch-none select-none`}
      role="img"
      aria-label={label}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <rect x="-66" y="-48" width="132" height="96" rx="12" fill={INK.cavity} />
      {drawn.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.fill}
          fillOpacity={p.alpha}
          stroke={p.edge ? INK.teethEdge : p.fill}
          strokeOpacity={p.alpha}
          strokeWidth={p.edge ? 0.4 : 0.5}
          strokeLinejoin="round"
        />
      ))}
      {ghost && (
        <g fill="none" stroke={INK.ghost} strokeWidth="1.4" strokeDasharray="3 2.5" strokeLinejoin="round">
          <path d={ghost.lips} />
          <path d={ghost.tongue} />
        </g>
      )}
    </svg>
  );
}
