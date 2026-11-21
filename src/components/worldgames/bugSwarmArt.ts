import type { BombKind, DropKind, ShotKind } from '../../lib/bugSwarm';

// Storm over Huế's flat layer: what's drawn over the 3D scene (stormScene) on
// a 2D canvas — bullets, the storm's rain and lightning coming down, the
// icons on the lanterns, sparks, shell bits and floating scores. These are
// small and many and must read instantly, so they're crisp 2D drawn live,
// much of it with additive blending so light adds up against the dark sky.
//
// All coordinates are the game's (lib/bugSwarm's W×H). The caller sets the
// canvas transform for each thing from where the 3D camera puts that point
// (stormScene's `local`), so a bolt far up the field is drawn smaller.

type C = CanvasRenderingContext2D;

export const SHIP_COLORS = ['#2fd38a', '#ff6b5a'] as const;
export const SHOT_COLORS = ['#7dffc4', '#ffb09e'] as const;

/** Pixels per game unit in the cached sprites. */
const RES = 5;

interface Sprite { cv: HTMLCanvasElement; w: number; h: number; pad: number }
const cache = new Map<string, Sprite>();

function sprite(key: string, w: number, h: number, pad: number, paint: (c: C) => void): Sprite {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = Math.ceil((w + pad * 2) * RES);
  cv.height = Math.ceil((h + pad * 2) * RES);
  const c = cv.getContext('2d')!;
  c.scale(RES, RES);
  c.translate(pad, pad);
  paint(c);
  const s = { cv, w, h, pad };
  cache.set(key, s);
  return s;
}

function mix(hex: string, to: string, k: number) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16);
  const ch = (n: number, s: number) => Math.round(((n >> s) & 255) * (1 - k) + ((b >> s) & 255) * k);
  return `rgb(${ch(a, 16)},${ch(a, 8)},${ch(a, 0)})`;
}

function ellipse(c: C, x: number, y: number, rx: number, ry: number, rot = 0) {
  c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

/** A soft round glow, cached per colour. */
function glow(color: string): Sprite {
  return sprite(`glow:${color}`, 16, 16, 0, (c) => {
    const g = c.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, color);
    g.addColorStop(0.35, color.replace(')', ',0.45)').replace('rgb', 'rgba'));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 16, 16);
  });
}
const hexRgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16},${(n >> 8) & 255},${n & 255})`; };
function drawGlow(c: C, x: number, y: number, r: number, color: string, alpha = 1) {
  c.globalAlpha = alpha;
  c.drawImage(glow(hexRgb(color)).cv, x - r, y - r, r * 2, r * 2);
  c.globalAlpha = 1;
}

// ── Shots, larvae, power-ups ───────────────────────────────────────────────

export function drawShot(c: C, kind: ShotKind, x: number, y: number, vx: number, vy: number, color: string) {
  c.globalCompositeOperation = 'lighter';
  if (kind === 'beam') {
    // A long thin beam, white-hot down its middle.
    drawGlow(c, x + 1, y + 6, 6, '#c77dff', 0.6);
    const g = c.createLinearGradient(0, y, 0, y + 14);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#d9a8ff'); g.addColorStop(1, 'rgba(160,80,255,0)');
    c.fillStyle = g; c.fillRect(x, y, 2, 14);
    c.fillStyle = '#ffffff'; c.fillRect(x + 0.6, y, 0.8, 8);
  } else if (kind === 'rocket') {
    const a = Math.atan2(vy, vx);
    // A trail of flame behind it, then the rocket.
    for (let k = 1; k <= 4; k++) drawGlow(c, x - Math.cos(a) * k * 2.5, y - Math.sin(a) * k * 2.5, 3.2 - k * 0.5, '#ff8a3a', 0.6 - k * 0.12);
    c.globalCompositeOperation = 'source-over';
    c.save(); c.translate(x, y); c.rotate(a + Math.PI / 2);
    c.fillStyle = '#e8ecf2'; c.beginPath(); c.roundRect(-1.3, -3, 2.6, 6, 1.2); c.fill();
    c.fillStyle = '#ff5d8f'; c.beginPath(); c.moveTo(-1.3, -3); c.lineTo(0, -5); c.lineTo(1.3, -3); c.closePath(); c.fill();
    c.fillStyle = '#9aa3b2'; c.fillRect(-2.2, 1.5, 1, 2); c.fillRect(1.2, 1.5, 1, 2);
    c.restore();
  } else if (kind === 'pellet') {
    drawGlow(c, x, y, 4, '#ffd166', 0.75);
    c.fillStyle = '#fff6d8'; ellipse(c, x, y, 1.2, 1.2); c.fill();
  } else {
    drawGlow(c, x + 1, y + 3, 5, color, 0.7);
    c.fillStyle = color;
    c.beginPath(); c.roundRect(x, y, 2, 7, 1); c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath(); c.roundRect(x + 0.5, y + 0.5, 1, 4, 0.5); c.fill();
  }
  c.globalCompositeOperation = 'source-over';
}

/** What the storm throws down. Every one is hot — red, orange, yellow —
 *  against the night's blues, with a dark rim and a white-hot core, and a
 *  streak showing which way it's going: the one thing on screen you must
 *  never lose sight of. `larva` an ember, `orb` a fireball, `sting` a
 *  lightning bolt, `blade` a spinning gust. */
export function drawBomb(c: C, x: number, y: number, t: number, id: number, kind: BombKind = 'larva', vx = 0, vy = 1) {
  const pulse = 0.85 + Math.sin(t * 12 + id) * 0.15;
  const hot = { larva: '#ff2a5a', orb: '#ff5a1a', sting: '#ffc21a', blade: '#ff4ad0' }[kind];
  // The streak behind it.
  const sp = Math.hypot(vx, vy) || 1;
  c.globalCompositeOperation = 'lighter';
  const tail = c.createLinearGradient(x, y, x - (vx / sp) * 12, y - (vy / sp) * 12);
  tail.addColorStop(0, hot); tail.addColorStop(1, 'rgba(0,0,0,0)');
  c.strokeStyle = tail; c.lineWidth = kind === 'orb' ? 4 : 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y); c.lineTo(x - (vx / sp) * 12, y - (vy / sp) * 12); c.stroke();
  drawGlow(c, x, y, (kind === 'orb' ? 12 : 9) * pulse, hot, 0.75);
  c.globalCompositeOperation = 'source-over';
  const rim = '#2a0010';
  if (kind === 'sting') {
    const j = Math.floor(t * 20 + id) % 2 ? 1 : -1;
    const path = () => { c.beginPath(); c.moveTo(x - 1 * j, y - 6); c.lineTo(x + 2.4 * j, y - 1.4); c.lineTo(x - 1.6 * j, y + 0.6); c.lineTo(x + 1 * j, y + 6.5); };
    c.lineJoin = 'round';
    path(); c.strokeStyle = rim; c.lineWidth = 3.6; c.stroke();
    path(); c.strokeStyle = hot; c.lineWidth = 2.2; c.stroke();
    path(); c.strokeStyle = '#fffbe0'; c.lineWidth = 0.9; c.stroke();
    return;
  }
  if (kind === 'blade') {
    c.save(); c.translate(x, y); c.rotate(t * 14 + id);
    for (let k = 0; k < 2; k++) {
      c.rotate(Math.PI);
      c.beginPath(); c.arc(0, 0, 4.2, 0, 2); c.strokeStyle = rim; c.lineWidth = 3.4; c.stroke();
      c.beginPath(); c.arc(0, 0, 4.2, 0, 2); c.strokeStyle = hot; c.lineWidth = 2; c.stroke();
    }
    c.beginPath(); c.arc(0, 0, 1.6, 0, Math.PI * 2); c.fillStyle = '#fff0fa'; c.fill();
    c.restore();
    return;
  }
  // A ball of fire: dark rim, hot body, white core.
  const r = kind === 'orb' ? 4.6 : 3.4;
  c.beginPath(); c.arc(x, y, r + 0.9, 0, Math.PI * 2); c.fillStyle = rim; c.fill();
  const g = c.createRadialGradient(x - r * 0.25, y - r * 0.25, 0.2, x, y, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#fff0c8'); g.addColorStop(0.75, hot); g.addColorStop(1, hot);
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fillStyle = g; c.fill();
  if (kind === 'orb') {
    c.strokeStyle = 'rgba(255,240,200,0.85)'; c.lineWidth = 0.7;
    c.beginPath(); c.arc(x, y, r + 2.4, t * 8 + id, t * 8 + id + 1.8); c.stroke();
    c.beginPath(); c.arc(x, y, r + 2.4, t * 8 + id + Math.PI, t * 8 + id + Math.PI + 1.8); c.stroke();
  }
}

export const DROP_COLOR: Record<DropKind, string> = { time: '#7aa2ff', nova: '#9be7ff', gun: '#ff9f1c', shield: '#4cc9f0', life: '#ff4d6d', blaster: '#2fd38a', laser: '#c77dff', rockets: '#ff5d8f', scatter: '#ffd166' };
/** A weapon's own colour — on its capsule and in the scoreboard. */
export const WEAPON_COLOR = { blaster: DROP_COLOR.blaster, laser: DROP_COLOR.laser, rockets: DROP_COLOR.rockets, scatter: DROP_COLOR.scatter };

function dropIcon(c: C, kind: DropKind, x: number, y: number) {
  c.fillStyle = '#ffffff'; c.strokeStyle = '#ffffff'; c.lineWidth = 1; c.lineCap = 'round'; c.lineJoin = 'round';
  if (kind === 'gun') {
    for (const dx of [-2.2, 0, 2.2]) { c.beginPath(); c.moveTo(x + dx, y + 2.5); c.lineTo(x + dx, y - 1.5); c.stroke(); }
    c.beginPath(); c.moveTo(x - 3, y - 0.5); c.lineTo(x, y - 3.2); c.lineTo(x + 3, y - 0.5); c.stroke();
  } else if (kind === 'time') {
    // An hourglass.
    c.beginPath(); c.moveTo(x - 2.6, y - 3.4); c.lineTo(x + 2.6, y - 3.4); c.lineTo(x, y); c.lineTo(x + 2.6, y + 3.4); c.lineTo(x - 2.6, y + 3.4); c.lineTo(x, y); c.closePath(); c.fill();
  } else if (kind === 'nova') {
    // A burst: a star with rays.
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2, r = k % 2 ? 2.4 : 4;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.stroke();
    }
    ellipse(c, x, y, 1.4, 1.4); c.fill();
  } else if (kind === 'blaster') {
    c.beginPath(); c.roundRect(x - 1, y - 3.5, 2, 6, 1); c.fill();
    c.beginPath(); c.moveTo(x - 3, y + 3); c.lineTo(x, y + 1); c.lineTo(x + 3, y + 3); c.stroke();
  } else if (kind === 'laser') {
    c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, y - 4); c.lineTo(x, y + 4); c.stroke();
    c.lineWidth = 0.7; c.beginPath(); c.moveTo(x - 2.6, y - 2.5); c.lineTo(x - 2.6, y + 3); c.moveTo(x + 2.6, y - 2.5); c.lineTo(x + 2.6, y + 3); c.stroke();
  } else if (kind === 'rockets') {
    c.beginPath(); c.moveTo(x, y - 4); c.lineTo(x + 1.6, y - 1.5); c.lineTo(x + 1.6, y + 2.5); c.lineTo(x - 1.6, y + 2.5); c.lineTo(x - 1.6, y - 1.5); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(x - 1.6, y + 1); c.lineTo(x - 3, y + 3.6); c.lineTo(x - 1.6, y + 2.5); c.moveTo(x + 1.6, y + 1); c.lineTo(x + 3, y + 3.6); c.lineTo(x + 1.6, y + 2.5); c.fill();
  } else if (kind === 'scatter') {
    for (const [dx, dy] of [[0, -3.2], [-2.6, -1.6], [2.6, -1.6], [-3.4, 1.2], [3.4, 1.2], [0, 0]]) { ellipse(c, x + dx, y + dy + 0.8, 0.95, 0.95); c.fill(); }
  } else if (kind === 'shield') {
    c.beginPath(); c.moveTo(x, y - 3.4); c.lineTo(x + 3, y - 2.2); c.quadraticCurveTo(x + 2.6, y + 2, x, y + 3.6); c.quadraticCurveTo(x - 2.6, y + 2, x - 3, y - 2.2); c.closePath(); c.fill();
  } else {
    c.beginPath(); c.moveTo(x, y + 3); c.bezierCurveTo(x - 4.5, y - 0.5, x - 2, y - 4, x, y - 1.6); c.bezierCurveTo(x + 2, y - 4, x + 4.5, y - 0.5, x, y + 3); c.fill();
  }
}

/** The mark on a falling lantern (the lantern itself is 3D, stormScene):
 *  what it gives, in white, and now and then a glint — so it reads as
 *  something to grab, not another bullet. */
export function drawDropIcon(c: C, kind: DropKind, x: number, y: number, t: number, id = 0) {
  const glint = (t * 0.9 + id * 0.31) % 1.6;
  if (glint < 0.25) {
    const a = Math.sin((glint / 0.25) * Math.PI);
    c.globalCompositeOperation = 'lighter';
    c.strokeStyle = `rgba(255,255,255,${0.9 * a})`; c.lineWidth = 0.7; c.lineCap = 'round';
    const gx = x + 4.5, gy = y - 5, r = 1 + a * 3.5;
    c.beginPath(); c.moveTo(gx - r, gy); c.lineTo(gx + r, gy); c.moveTo(gx, gy - r); c.lineTo(gx, gy + r); c.stroke();
    c.globalCompositeOperation = 'source-over';
  }
  c.save();
  c.shadowColor = DROP_COLOR[kind]; c.shadowBlur = 4;
  c.translate(x, y); c.scale(0.8, 0.8); c.translate(-x, -y);
  dropIcon(c, kind, x, y);
  c.restore();
}

// ── Explosions and the rest of the fireworks ───────────────────────────────

/** `chunk` is a piece of a bug's shell, tumbling as it falls: `rot` its turn, `spin` how fast. */
export interface Fx { kind: 'spark' | 'smoke' | 'ring' | 'flash' | 'ember' | 'text' | 'chunk'; x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; text?: string; rot?: number; spin?: number }

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export function explode(fx: Fx[], x: number, y: number, big: boolean, tint = '#ffb347') {
  fx.push({ kind: 'flash', x, y, vx: 0, vy: 0, life: big ? 0.35 : 0.18, max: big ? 0.35 : 0.18, size: big ? 70 : 18, color: '#fff1c2' });
  fx.push({ kind: 'ring', x, y, vx: 0, vy: 0, life: big ? 0.7 : 0.35, max: big ? 0.7 : 0.35, size: big ? 70 : 16, color: tint });
  if (big) fx.push({ kind: 'ring', x, y, vx: 0, vy: 0, life: 1, max: 1, size: 120, color: '#c040ff' });
  const n = big ? 70 : 16;
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), v = rnd(30, big ? 200 : 120);
    fx.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.25, big ? 1 : 0.5), max: 1, size: rnd(0.6, 1.4), color: ['#fff6c8', '#ffd23f', tint, '#ff6a3c'][i % 4] });
  }
  for (let i = 0; i < (big ? 14 : 4); i++) {
    const a = rnd(0, Math.PI * 2), v = rnd(5, big ? 40 : 18);
    fx.push({ kind: 'smoke', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.5, big ? 1.4 : 0.8), max: 1, size: rnd(3, big ? 10 : 5), color: '#6a5a80' });
  }
  // The bug itself comes apart: bits of shell in its colour, flung up and
  // out, tumbling as they fall — what makes a kill feel like a kill.
  for (let i = 0; i < (big ? 18 : 6); i++) {
    const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05), v = rnd(30, big ? 130 : 80);
    fx.push({ kind: 'chunk', x: x + rnd(-3, 3), y: y + rnd(-3, 3), vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.5, big ? 1.3 : 0.8), max: 1, size: rnd(1.6, big ? 4.4 : 3.2), color: tint, rot: rnd(0, 6.3), spin: rnd(-14, 14) });
  }
  for (const f of fx) if (f.max === 1) f.max = f.life;
}

/** The points a kill was worth, floating up from it. */
export function scorePop(fx: Fx[], x: number, y: number, pts: number, color: string) {
  const big = pts >= 200;
  fx.push({ kind: 'text', x, y, vx: 0, vy: -26, life: big ? 1.3 : 0.8, max: big ? 1.3 : 0.8, size: big ? 9 : pts >= 60 ? 7 : 6, color, text: `+${pts}` });
}

/** A nova: a white flash, and rings racing out to the edges. */
export function novaBlast(fx: Fx[], x: number, y: number) {
  fx.push({ kind: 'flash', x, y, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 160, color: '#e6faff' });
  for (const [size, life, color] of [[420, 0.7, '#9be7ff'], [300, 0.9, '#ffffff'], [200, 1.1, '#c77dff']] as const) {
    fx.push({ kind: 'ring', x, y, vx: 0, vy: 0, life, max: life, size, color });
  }
  for (let i = 0; i < 40; i++) {
    const a = rnd(0, Math.PI * 2), v = rnd(120, 300);
    const life = rnd(0.4, 0.8);
    fx.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, size: rnd(0.8, 1.6), color: ['#ffffff', '#9be7ff', '#c77dff'][i % 3] });
  }
}

/** A shot landing on a bug that lives through it. */
export function hitSpark(fx: Fx[], x: number, y: number, color: string) {
  for (let i = 0; i < 5; i++) {
    const a = rnd(-Math.PI, 0), v = rnd(30, 80);
    const life = rnd(0.12, 0.25);
    fx.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, size: 0.7, color });
  }
}

/** Embers off an engine, drifting back. */
export function engineEmber(fx: Fx[], x: number, y: number) {
  const life = rnd(0.15, 0.35);
  fx.push({ kind: 'ember', x: x + rnd(-1.5, 1.5), y, vx: rnd(-6, 6), vy: rnd(40, 70), life, max: life, size: rnd(0.5, 1), color: '#ffb347' });
}

export function stepFx(fx: Fx[], dt: number) {
  for (const f of fx) {
    f.life -= dt;
    f.x += f.vx * dt; f.y += f.vy * dt;
    if (f.kind === 'spark') { f.vx *= 0.94; f.vy *= 0.94; }
    if (f.kind === 'smoke') { f.vx *= 0.97; f.vy *= 0.97; }
    if (f.kind === 'chunk') { f.vy += 260 * dt; f.vx *= 0.985; f.rot = (f.rot ?? 0) + (f.spin ?? 0) * dt; }
  }
  return fx.filter((f) => f.life > 0);
}

/** `place` sets the canvas up for drawing at a point (the 3D camera's view
 *  of it) — called before each effect, so far-off ones are drawn smaller. */
export function drawFx(c: C, fx: Fx[], place?: (x: number, y: number) => void) {
  for (const f of fx) {
    if (f.kind !== 'smoke') continue;
    place?.(f.x, f.y);
    const k = 1 - f.life / f.max;
    c.fillStyle = `rgba(90,80,120,${0.35 * (1 - k)})`;
    ellipse(c, f.x, f.y, f.size * (0.6 + k), f.size * (0.6 + k)); c.fill();
  }
  for (const f of fx) {
    if (f.kind !== 'chunk') continue;
    place?.(f.x, f.y);
    const k = 1 - f.life / f.max, r = f.size;
    c.save();
    c.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    c.translate(f.x, f.y); c.rotate(f.rot ?? 0);
    // A curved shard: lit on one edge, dark on the other, so it reads as a
    // piece of something round even at a few pixels.
    c.beginPath(); c.moveTo(-r, r * 0.5); c.quadraticCurveTo(0, -r * 1.2, r, r * 0.4); c.quadraticCurveTo(0, -r * 0.1, -r, r * 0.5); c.closePath();
    c.fillStyle = f.color; c.fill();
    c.strokeStyle = 'rgba(10,6,20,0.7)'; c.lineWidth = 0.4; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.55)'; ellipse(c, -r * 0.2, -r * 0.25, r * 0.35, r * 0.15, -0.4); c.fill();
    c.restore();
  }
  c.globalCompositeOperation = 'lighter';
  for (const f of fx) {
    const k = 1 - f.life / f.max;
    if (f.kind !== 'smoke' && f.kind !== 'chunk') place?.(f.x, f.y);
    if (f.kind === 'spark') {
      c.strokeStyle = f.color; c.globalAlpha = 1 - k; c.lineWidth = f.size; c.lineCap = 'round';
      c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(f.x - f.vx * 0.03, f.y - f.vy * 0.03); c.stroke();
    } else if (f.kind === 'ember') {
      drawGlow(c, f.x, f.y, 2.5 * f.size + 1, f.color, (1 - k) * 0.8);
    } else if (f.kind === 'flash') {
      drawGlow(c, f.x, f.y, f.size * (0.6 + k * 0.6), f.color, 1 - k);
    } else if (f.kind === 'text' && f.text) {
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = Math.min(1, (1 - k) * 2);
      // Pops in big and settles — a score that lands, not one that fades in.
      const pop = 1 + 0.7 * Math.max(0, 1 - k * 7) * Math.cos(k * 30);
      c.font = `800 ${f.size * pop}px system-ui, sans-serif`;
      c.textAlign = 'center';
      c.lineWidth = 1.6; c.strokeStyle = 'rgba(0,0,0,0.7)';
      c.strokeText(f.text, f.x, f.y);
      c.fillStyle = f.color;
      c.fillText(f.text, f.x, f.y);
      c.globalCompositeOperation = 'lighter';
    } else if (f.kind === 'ring') {
      c.strokeStyle = f.color; c.globalAlpha = (1 - k) * 0.8; c.lineWidth = 1.5 * (1 - k) + 0.3;
      c.beginPath(); c.arc(f.x, f.y, f.size * (0.2 + k * 0.8), 0, Math.PI * 2); c.stroke();
    }
  }
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
}

/** A drone wingman: a small glowing orb in its ship's colour, with a gun. */
export function drawDrone(c: C, x: number, y: number, color: string, t: number) {
  c.globalCompositeOperation = 'lighter';
  drawGlow(c, x, y, 6 + Math.sin(t * 9) * 0.8, color, 0.6);
  c.globalCompositeOperation = 'source-over';
  const g = c.createRadialGradient(x - 1, y - 1, 0.3, x, y, 3);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, color); g.addColorStop(1, mix(color, '#000000', 0.5));
  c.fillStyle = g; ellipse(c, x, y, 2.8, 2.8); c.fill();
  c.fillStyle = '#20232b'; c.fillRect(x - 0.6, y - 4.2, 1.2, 2);
}

/** Overdrive: a golden aura round the ship, crackling. */
export function drawOverdrive(c: C, x: number, y: number, t: number) {
  c.globalCompositeOperation = 'lighter';
  drawGlow(c, x, y, 18 + Math.sin(t * 20) * 2, '#ffd23f', 0.55);
  c.strokeStyle = 'rgba(255,230,140,0.8)'; c.lineWidth = 0.7;
  for (let k = 0; k < 3; k++) {
    const a = t * 7 + k * 2.1;
    c.beginPath(); c.arc(x, y, 13, a, a + 0.7); c.stroke();
  }
  c.globalCompositeOperation = 'source-over';
}

/** Slow-mo: the screen tinted cold while it lasts. */
export function drawSlowTint(c: C, x: number, y: number, w: number, h: number, left: number) {
  c.fillStyle = `rgba(90,140,255,${0.1 * Math.min(1, left)})`;
  c.fillRect(x, y, w, h);
}
