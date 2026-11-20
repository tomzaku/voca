import { BUG_SIZE, H, SHIP_H, SHIP_W, W, isBoss, type BombKind, type BugKind, type DropKind, type ShotKind } from '../../lib/bugSwarm';

// Bug Swarm's art: drawn at the screen's own resolution, not pixel-scaled.
// Every sprite is painted once with gradients into an offscreen canvas at
// several times its size (`sprite`), then stamped each frame — so the ships
// and bugs stay sharp on any display and cost a drawImage apiece. What moves
// on its own (engine flames, glows, explosions, the sky) is drawn live, much
// of it with additive blending so light adds up the way it does in space.
//
// All coordinates are the game's (lib/bugSwarm's W×H); the caller scales.

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

/** The sprite as a white silhouette, for a hit's flash. */
function white(key: string, s: Sprite): Sprite {
  return sprite(`${key}:white`, s.w, s.h, s.pad, (c) => {
    c.save();
    c.translate(-s.pad, -s.pad);
    c.drawImage(s.cv, 0, 0, s.w + s.pad * 2, s.h + s.pad * 2);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, s.w + s.pad * 2, s.h + s.pad * 2);
    c.restore();
  });
}

const stamp = (c: C, s: Sprite, x: number, y: number) => c.drawImage(s.cv, x - s.pad, y - s.pad, s.w + s.pad * 2, s.h + s.pad * 2);

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

// ── The sky ─────────────────────────────────────────────────────────────────

const STARS = Array.from({ length: 3 }, (_, layer) =>
  Array.from({ length: 34 }, (_, i) => ({
    x: ((i * 97 + layer * 41) * 7.13) % W,
    y: ((i * 61 + layer * 137) * 3.71) % H,
    s: [0.5, 0.8, 1.2][layer] * (0.7 + ((i * 13) % 7) / 10),
    tw: (i * 1.7) % 6.28,
  })),
);

function nebula(key: string, inner: string, outer: string): Sprite {
  return sprite(`nebula:${key}`, 220, 220, 0, (c) => {
    for (let k = 0; k < 5; k++) {
      const x = 110 + Math.cos(k * 1.9) * 40, y = 110 + Math.sin(k * 2.3) * 36, r = 70 + k * 8;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, inner);
      g.addColorStop(0.5, outer);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 220, 220);
    }
  });
}

const planet = () => sprite('planet', 70, 70, 6, (c) => {
  const g = c.createRadialGradient(28, 26, 4, 35, 35, 30);
  g.addColorStop(0, '#f0b37a'); g.addColorStop(0.55, '#b0563f'); g.addColorStop(1, '#2a1020');
  c.fillStyle = g; ellipse(c, 35, 35, 26, 26); c.fill();
  c.globalAlpha = 0.25; c.strokeStyle = '#ffd9a8'; c.lineWidth = 2;
  for (let k = 0; k < 4; k++) { ellipse(c, 35, 33 + k * 5, 24 - k * 3, 2.5, 0); c.stroke(); }
  c.globalAlpha = 1;
  c.strokeStyle = 'rgba(255,220,180,0.55)'; c.lineWidth = 2.2;
  ellipse(c, 35, 37, 40, 8, -0.25); c.stroke();
  // The front of the ring, over the planet.
  c.save(); c.beginPath(); c.rect(-6, 37, 82, 40); c.clip();
  c.strokeStyle = 'rgba(255,230,200,0.8)'; ellipse(c, 35, 37, 40, 8, -0.25); c.stroke(); c.restore();
});

/** The sky over the region given (game units — it may reach past the play
 *  area, to fill a screen of another shape). */
export function drawSpace(c: C, t: number, x0 = 0, y0 = 0, w = W, h = H) {
  const bg = c.createLinearGradient(0, y0, 0, y0 + h);
  bg.addColorStop(0, '#060312'); bg.addColorStop(0.6, '#0b0f2e'); bg.addColorStop(1, '#130a26');
  c.fillStyle = bg;
  c.fillRect(x0, y0, w, h);
  const n1 = nebula('violet', 'rgba(150,70,220,0.20)', 'rgba(80,30,140,0.08)');
  const n2 = nebula('teal', 'rgba(40,180,200,0.16)', 'rgba(20,80,140,0.07)');
  const span = H + 240;
  c.drawImage(n1.cv, -60, ((t * 5) % span) - 220, 220, 220);
  c.drawImage(n2.cv, W - 150, ((t * 5 + span / 2) % span) - 220, 220, 220);
  const p = planet();
  // Dim, so it stays scenery behind the swarm.
  c.globalAlpha = 0.5;
  stamp(c, p, W * 0.62, ((t * 2.2 + 60) % (H + 160)) - 80);
  c.globalAlpha = 1;
  // More stars for a bigger sky.
  const reps = Math.max(1, Math.round((w * h) / (W * H)));
  for (let rep = 0; rep < reps; rep++) for (let layer = 0; layer < 3; layer++) {
    const speed = 8 + layer * 22;
    for (const s of STARS[layer]) {
      const sx = x0 + (s.x / W) * w;
      const y = y0 + (((s.y / H) * h + t * speed) % h);
      const a = 0.45 + 0.55 * Math.abs(Math.sin(t * 1.5 + s.tw));
      c.fillStyle = layer === 2 ? `rgba(255,255,255,${a})` : layer === 1 ? `rgba(190,200,255,${a * 0.8})` : `rgba(140,140,210,${a * 0.6})`;
      if (layer === 2) c.fillRect(sx, y, s.s * 0.8, s.s * 2.2);
      else { c.beginPath(); c.arc(sx, y, s.s / 2, 0, Math.PI * 2); c.fill(); }
    }
  }
  // Now and then a shooting star.
  const k = (t % 7) / 0.8;
  if (k < 1) {
    const seed = Math.floor(t / 7);
    const x0 = ((seed * 83) % (W - 60)) + 60, y0 = (seed * 47) % 120;
    const x = x0 - k * 90, y = y0 + k * 50;
    const g = c.createLinearGradient(x, y, x + 24, y - 13);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.strokeStyle = g; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + 24, y - 13); c.stroke();
  }
}

// ── Ships ───────────────────────────────────────────────────────────────────

const SHIP_SW = 22, SHIP_SH = 20;

function shipSprite(color: string) {
  return sprite(`ship:${color}`, SHIP_SW, SHIP_SH, 2, (c) => {
    const dark = mix(color, '#000000', 0.55), light = mix(color, '#ffffff', 0.45);
    c.lineJoin = 'round';
    // Wings.
    const wg = c.createLinearGradient(0, 6, 0, 18);
    wg.addColorStop(0, light); wg.addColorStop(1, dark);
    c.fillStyle = wg; c.strokeStyle = 'rgba(0,0,0,0.65)'; c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(11, 5); c.lineTo(21, 15); c.lineTo(20.5, 17.5); c.lineTo(14, 15); c.lineTo(8, 15); c.lineTo(1.5, 17.5); c.lineTo(1, 15);
    c.closePath(); c.fill(); c.stroke();
    // Wing stripes and tips.
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath(); c.moveTo(15, 10); c.lineTo(19.5, 14.5); c.lineTo(18.5, 15); c.lineTo(14.5, 11); c.fill();
    c.beginPath(); c.moveTo(7, 10); c.lineTo(2.5, 14.5); c.lineTo(3.5, 15); c.lineTo(7.5, 11); c.fill();
    c.fillStyle = '#ffd23f';
    c.fillRect(0.6, 15, 1.4, 2.2); c.fillRect(20, 15, 1.4, 2.2);
    // Fuselage.
    const fg = c.createLinearGradient(7, 0, 15, 0);
    fg.addColorStop(0, dark); fg.addColorStop(0.45, light); fg.addColorStop(1, dark);
    c.fillStyle = fg;
    c.beginPath(); c.moveTo(11, 0); c.lineTo(14, 7); c.lineTo(13.5, 17); c.lineTo(8.5, 17); c.lineTo(8, 7); c.closePath(); c.fill(); c.stroke();
    // Engines.
    c.fillStyle = '#20232b';
    c.fillRect(8.6, 16.5, 1.8, 2.4); c.fillRect(11.6, 16.5, 1.8, 2.4);
    // Cockpit glass.
    const cg = c.createLinearGradient(11, 4, 11, 11);
    cg.addColorStop(0, '#f2fdff'); cg.addColorStop(0.5, '#7fd6ff'); cg.addColorStop(1, '#1b5f93');
    c.fillStyle = cg; ellipse(c, 11, 7.6, 1.7, 3.2); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 0.4; c.stroke();
  });
}

export function drawShip(c: C, x: number, y: number, color: string, o: { t: number; inv: number; shield: number; tilt: number; name?: string }) {
  if (o.inv > 0 && Math.floor(o.t * 16) % 2) return;
  const cx = x + SHIP_W / 2, cy = y + SHIP_H / 2;
  const s = shipSprite(color);
  // Engine flames, flickering, added as light.
  c.globalCompositeOperation = 'lighter';
  const flick = 0.75 + Math.sin(o.t * 40) * 0.12 + Math.sin(o.t * 23) * 0.08;
  for (const ex of [-1.5, 1.5]) {
    const fx = cx + ex, fy = cy + 9;
    const g = c.createLinearGradient(fx, fy, fx, fy + 9 * flick);
    g.addColorStop(0, 'rgba(255,255,230,0.95)'); g.addColorStop(0.35, 'rgba(255,190,70,0.8)'); g.addColorStop(1, 'rgba(255,80,30,0)');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(fx - 1.1, fy); c.quadraticCurveTo(fx, fy + 11 * flick, fx + 1.1, fy); c.fill();
  }
  drawGlow(c, cx, cy + 10, 6, '#ff9f3a', 0.55);
  c.globalCompositeOperation = 'source-over';
  c.save();
  c.translate(cx, cy);
  c.rotate(o.tilt * 0.22);
  c.scale(1 - Math.abs(o.tilt) * 0.12, 1);
  c.drawImage(s.cv, -SHIP_SW / 2 - s.pad, -SHIP_SH / 2 - s.pad, SHIP_SW + s.pad * 2, SHIP_SH + s.pad * 2);
  c.restore();
  if (o.shield > 0) {
    const fade = o.shield < 1.5 && Math.floor(o.t * 10) % 2 ? 0.35 : 1;
    c.globalCompositeOperation = 'lighter';
    const g = c.createRadialGradient(cx, cy, 6, cx, cy, 15);
    g.addColorStop(0, 'rgba(80,190,255,0)'); g.addColorStop(0.75, `rgba(80,190,255,${0.18 * fade})`); g.addColorStop(1, `rgba(150,230,255,${0.7 * fade})`);
    c.fillStyle = g; ellipse(c, cx, cy, 15, 15); c.fill();
    c.strokeStyle = `rgba(190,240,255,${0.5 * fade})`; c.lineWidth = 0.6;
    c.beginPath(); c.arc(cx, cy, 13, o.t * 3, o.t * 3 + 1.4); c.stroke();
    c.beginPath(); c.arc(cx, cy, 13, o.t * 3 + Math.PI, o.t * 3 + Math.PI + 1.4); c.stroke();
    c.globalCompositeOperation = 'source-over';
  }
  if (o.name) {
    c.font = '600 6px system-ui, sans-serif';
    c.textAlign = 'center';
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillText(o.name, cx + 0.5, y + SHIP_H + 12.5);
    c.fillStyle = color;
    c.fillText(o.name, cx, y + SHIP_H + 12);
  }
}

// ── Bugs ────────────────────────────────────────────────────────────────────

function eyes(c: C, pts: [number, number][], r: number, color: string) {
  c.save();
  c.shadowColor = color; c.shadowBlur = 3;
  c.fillStyle = color;
  for (const [x, y] of pts) { ellipse(c, x, y, r, r); c.fill(); }
  c.restore();
  c.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [x, y] of pts) { ellipse(c, x - r * 0.35, y - r * 0.35, r * 0.35, r * 0.35); c.fill(); }
}

function beetle(frame: number) {
  const { w, h } = BUG_SIZE.beetle;
  return sprite(`beetle:${frame}`, w, h, 3, (c) => {
    c.strokeStyle = '#6a4fa0'; c.lineWidth = 0.8; c.lineCap = 'round';
    const sw = frame ? 1 : -1;
    for (const [y, dx] of [[4, 0], [6.5, 1], [9, 0]] as const) {
      c.beginPath(); c.moveTo(3, y); c.lineTo(0.2, y + sw * 1.2 + dx); c.stroke();
      c.beginPath(); c.moveTo(11, y); c.lineTo(13.8, y - sw * 1.2 + dx); c.stroke();
    }
    const g = c.createRadialGradient(5, 3.5, 0.5, 7, 6, 7);
    g.addColorStop(0, '#d9c2ff'); g.addColorStop(0.35, '#8a5ad8'); g.addColorStop(1, '#2b1650');
    c.fillStyle = g; ellipse(c, 7, 5.8, 5.8, 5.2); c.fill();
    c.strokeStyle = 'rgba(20,8,40,0.8)'; c.lineWidth = 0.5; c.stroke();
    c.beginPath(); c.moveTo(7, 1); c.lineTo(7, 10.5); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.4)'; ellipse(c, 4.6, 3.4, 1.4, 0.8, -0.6); c.fill();
    c.fillStyle = '#1b1030'; ellipse(c, 7, 10.6, 3, 1.8); c.fill();
    c.strokeStyle = '#3b2a5c'; c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(5.8, 11.8); c.quadraticCurveTo(4.5, 13.5, 3.5, 13.2); c.stroke();
    c.beginPath(); c.moveTo(8.2, 11.8); c.quadraticCurveTo(9.5, 13.5, 10.5, 13.2); c.stroke();
    eyes(c, [[5.6, 10.4], [8.4, 10.4]], 0.75, '#ffe066');
  });
}

function moth(frame: number) {
  const { w, h } = BUG_SIZE.moth;
  const open = [1, 0.8, 0.55, 0.8][frame];
  return sprite(`moth:${frame}`, w, h, 3, (c) => {
    const wing = (side: number, upper: boolean) => {
      const cx = 8 + side * (upper ? 4.2 : 3.2) * open, cy = upper ? 4.2 : 8.4;
      const g = c.createRadialGradient(cx, cy, 0.5, cx, cy, upper ? 5 : 3.6);
      g.addColorStop(0, '#fff6dc'); g.addColorStop(0.6, '#e2cfa1'); g.addColorStop(1, '#9c8358');
      c.fillStyle = g;
      ellipse(c, cx, cy, (upper ? 4.4 : 3.2) * open + 0.6, upper ? 3.8 : 2.8, side * (upper ? -0.35 : 0.4));
      c.fill();
      c.strokeStyle = 'rgba(90,60,30,0.6)'; c.lineWidth = 0.4; c.stroke();
      if (upper) {
        c.fillStyle = '#8f3fd0'; ellipse(c, cx + side * 0.6, cy - 0.2, 1.3 * open + 0.2, 1.3); c.fill();
        c.fillStyle = '#ffe066'; ellipse(c, cx + side * 0.6, cy - 0.2, 0.5 * open + 0.1, 0.5); c.fill();
      }
    };
    for (const s of [-1, 1]) { wing(s, false); wing(s, true); }
    const bg = c.createLinearGradient(6.5, 0, 9.5, 0);
    bg.addColorStop(0, '#4a3220'); bg.addColorStop(0.5, '#a07a52'); bg.addColorStop(1, '#4a3220');
    c.fillStyle = bg; ellipse(c, 8, 6.4, 1.6, 4.6); c.fill();
    c.strokeStyle = '#e9d9b0'; c.lineWidth = 0.4;
    c.beginPath(); c.moveTo(7.3, 2); c.quadraticCurveTo(6, 0, 4.8, -0.6); c.stroke();
    c.beginPath(); c.moveTo(8.7, 2); c.quadraticCurveTo(10, 0, 11.2, -0.6); c.stroke();
    eyes(c, [[7.2, 2.6], [8.8, 2.6]], 0.6, '#ff4d6d');
  });
}

function wasp(frame: number) {
  const { w, h } = BUG_SIZE.wasp;
  return sprite(`wasp:${frame}`, w, h, 3, (c) => {
    c.fillStyle = 'rgba(200,235,255,0.45)'; c.strokeStyle = 'rgba(230,250,255,0.7)'; c.lineWidth = 0.4;
    const a = frame ? 0.5 : 0.15;
    for (const s of [-1, 1]) { ellipse(c, 7 + s * 4.4, 3, 4.2, 1.8, s * a); c.fill(); c.stroke(); }
    // Abdomen, striped, to a sting.
    c.save();
    c.beginPath(); c.moveTo(3.6, 5.5); c.quadraticCurveTo(7, 3.5, 10.4, 5.5); c.quadraticCurveTo(10, 10, 7, 13); c.quadraticCurveTo(4, 10, 3.6, 5.5); c.closePath();
    const g = c.createLinearGradient(3.6, 0, 10.4, 0);
    g.addColorStop(0, '#c98a00'); g.addColorStop(0.45, '#ffe066'); g.addColorStop(1, '#c98a00');
    c.fillStyle = g; c.fill(); c.clip();
    c.fillStyle = '#1e1606';
    for (let k = 0; k < 3; k++) c.fillRect(2, 6.6 + k * 2.1, 10, 1.05);
    c.restore();
    c.strokeStyle = '#1e1606'; c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(7, 12.6); c.lineTo(7, 13.8); c.stroke();
    // Head.
    const hg = c.createRadialGradient(6.3, 2.6, 0.2, 7, 3.4, 3);
    hg.addColorStop(0, '#fff2a0'); hg.addColorStop(1, '#b07800');
    c.fillStyle = hg; ellipse(c, 7, 3.6, 2.8, 2.2); c.fill();
    eyes(c, [[5.6, 3.6], [8.4, 3.6]], 0.85, '#ff3b3b');
  });
}

function queen(frame: number) {
  const { w, h } = BUG_SIZE.queen;
  const beat = [0, 0.15, 0.3, 0.15][frame];
  return sprite(`queen:${frame}`, w, h, 8, (c) => {
    // Wings, veined.
    for (const s of [-1, 1]) {
      for (const [ox, oy, rx, ry, rot] of [[15, 8, 15, 7, 0.35], [11, 16, 11, 5, -0.25]] as const) {
        const cx = 26 + s * ox, cy = oy - beat * 4;
        const g = c.createRadialGradient(cx, cy, 1, cx, cy, rx);
        g.addColorStop(0, 'rgba(220,245,255,0.55)'); g.addColorStop(1, 'rgba(120,180,255,0.15)');
        c.fillStyle = g; ellipse(c, cx, cy, rx, ry * (1 - beat * 0.5), s * rot); c.fill();
        c.strokeStyle = 'rgba(200,235,255,0.45)'; c.lineWidth = 0.5; c.stroke();
        c.beginPath(); c.moveTo(26 + s * 6, cy); c.lineTo(cx + s * rx * 0.8, cy - 1); c.stroke();
      }
    }
    // Abdomen.
    const ag = c.createRadialGradient(22, 9, 2, 26, 13, 18);
    ag.addColorStop(0, '#d6a8ff'); ag.addColorStop(0.4, '#8a3fd0'); ag.addColorStop(1, '#2a0e4a');
    c.fillStyle = ag; ellipse(c, 26, 13, 14, 12); c.fill();
    c.save(); ellipse(c, 26, 13, 14, 12); c.clip();
    c.fillStyle = 'rgba(30,8,60,0.75)';
    for (let k = 0; k < 4; k++) { ellipse(c, 26, 2 + k * 5.5, 16, 1.3); c.fill(); }
    c.restore();
    c.strokeStyle = 'rgba(20,5,40,0.9)'; c.lineWidth = 0.8; ellipse(c, 26, 13, 14, 12); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.3)'; ellipse(c, 20, 6.5, 4, 1.8, -0.5); c.fill();
    // Thorax and head.
    const tg = c.createRadialGradient(24, 24, 1, 26, 26, 9);
    tg.addColorStop(0, '#7a3fb8'); tg.addColorStop(1, '#1c0836');
    c.fillStyle = tg; ellipse(c, 26, 26, 9, 6.5); c.fill();
    c.strokeStyle = '#120424'; c.lineWidth = 0.7; c.stroke();
    // Mandibles.
    c.fillStyle = '#e9d9b0'; c.strokeStyle = '#3b2a1a'; c.lineWidth = 0.5;
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(26 + s * 3, 31); c.quadraticCurveTo(26 + s * 6, 35, 26 + s * 1.5, 36.5); c.lineTo(26 + s * 2.5, 33); c.closePath(); c.fill(); c.stroke();
    }
    eyes(c, [[21.5, 25], [30.5, 25], [23.8, 28.5], [28.2, 28.5]], 1.4, '#ff3b5c');
    // Crown.
    const cg = c.createLinearGradient(0, -6, 0, 2);
    cg.addColorStop(0, '#fff3a0'); cg.addColorStop(1, '#c98a00');
    c.fillStyle = cg; c.strokeStyle = '#7a5200'; c.lineWidth = 0.5;
    c.beginPath(); c.moveTo(16, 2.5);
    for (let k = 0; k <= 5; k++) { c.lineTo(16 + k * 4, k % 2 ? -1 : -5); c.lineTo(18 + k * 4, 1); }
    c.lineTo(36, 2.5); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#ff3b5c'; ellipse(c, 26, -0.5, 1.2, 1.2); c.fill();
  });
}

function mantis(frame: number) {
  const { w, h } = BUG_SIZE.mantis;
  const raise = [0, 1, 2, 1][frame];
  return sprite(`mantis:${frame}`, w, h, 8, (c) => {
    // Wings folded back along the body.
    c.fillStyle = 'rgba(190,255,200,0.35)'; c.strokeStyle = 'rgba(200,255,210,0.5)'; c.lineWidth = 0.5;
    for (const s of [-1, 1]) { ellipse(c, 25 + s * 9, 10, 12, 4, s * 0.5); c.fill(); c.stroke(); }
    // Abdomen, long and segmented.
    const ag = c.createLinearGradient(18, 0, 32, 0);
    ag.addColorStop(0, '#1f6a2a'); ag.addColorStop(0.5, '#6ad86a'); ag.addColorStop(1, '#1f6a2a');
    c.fillStyle = ag; ellipse(c, 25, 9, 6, 11); c.fill();
    c.strokeStyle = 'rgba(10,50,20,0.7)'; c.lineWidth = 0.6;
    for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(20, 2 + k * 4); c.quadraticCurveTo(25, 4 + k * 4, 30, 2 + k * 4); c.stroke(); }
    // Thorax and the scythes, raised and lowered.
    c.fillStyle = '#3fae46'; ellipse(c, 25, 22, 4, 6); c.fill();
    for (const s of [-1, 1]) {
      c.strokeStyle = '#2b8a33'; c.lineWidth = 2.2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(25 + s * 3, 21); c.lineTo(25 + s * 12, 17 - raise); c.stroke();
      c.strokeStyle = '#d9ffd0'; c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(25 + s * 12, 17 - raise); c.quadraticCurveTo(25 + s * 22, 22 - raise, 25 + s * 17, 34 - raise); c.stroke();
      c.strokeStyle = '#2b8a33'; c.lineWidth = 0.6;
      for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(25 + s * (17 + k), 22 + k * 3 - raise); c.lineTo(25 + s * (15 + k), 23 + k * 3 - raise); c.stroke(); }
    }
    // A triangular head with great eyes.
    const hg = c.createLinearGradient(0, 26, 0, 34);
    hg.addColorStop(0, '#8af08a'); hg.addColorStop(1, '#2b8a33');
    c.fillStyle = hg;
    c.beginPath(); c.moveTo(18, 27); c.lineTo(32, 27); c.lineTo(25, 35); c.closePath(); c.fill();
    eyes(c, [[20, 27.5], [30, 27.5]], 2, '#ffe066');
  });
}

function spider(frame: number) {
  const { w, h } = BUG_SIZE.spider;
  const step = [0, 1.5, 0, -1.5][frame];
  return sprite(`spider:${frame}`, w, h, 8, (c) => {
    // Eight legs, jointed, stepping.
    c.strokeStyle = '#8a6a9a'; c.lineWidth = 1.6; c.lineCap = 'round'; c.lineJoin = 'round';
    for (const s of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const y0 = 16 + k * 3.5, sw = (k % 2 ? step : -step) * s;
        c.beginPath(); c.moveTo(26 + s * 7, y0); c.lineTo(26 + s * (17 + k * 2), y0 - 9 + k * 3 + sw); c.lineTo(26 + s * (24 + k), y0 + 6 + k * 3 + sw); c.stroke();
      }
    }
    // Abdomen, with the red hourglass.
    const ag = c.createRadialGradient(22, 7, 1, 26, 11, 14);
    ag.addColorStop(0, '#a888c8'); ag.addColorStop(0.45, '#5a3a78'); ag.addColorStop(1, '#22123a');
    c.fillStyle = ag; ellipse(c, 26, 11, 12, 11); c.fill();
    c.fillStyle = '#e02a3a';
    c.beginPath(); c.moveTo(23, 5); c.lineTo(29, 5); c.lineTo(26, 10); c.lineTo(29, 15); c.lineTo(23, 15); c.lineTo(26, 10); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.25)'; ellipse(c, 20.5, 5.5, 3, 1.4, -0.5); c.fill();
    // Head with a cluster of eyes, and fangs.
    const hg = c.createRadialGradient(26, 24, 1, 26, 25, 8);
    hg.addColorStop(0, '#8a68a8'); hg.addColorStop(1, '#2a1640');
    c.fillStyle = hg; ellipse(c, 26, 25, 8, 6.5); c.fill();
    eyes(c, [[23, 23.5], [29, 23.5], [24.6, 26.5], [27.4, 26.5], [21, 26], [31, 26]], 0.9, '#ff3b5c');
    c.fillStyle = '#e9d9b0';
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(26 + s * 2.5, 30); c.lineTo(26 + s * 1, 35); c.lineTo(26 + s * 3.5, 31); c.closePath(); c.fill(); }
  });
}

function hornet(frame: number) {
  const { w, h } = BUG_SIZE.hornet;
  return sprite(`hornet:${frame}`, w, h, 8, (c) => {
    // Wings, a blur of beats.
    c.fillStyle = 'rgba(220,240,255,0.4)'; c.strokeStyle = 'rgba(240,250,255,0.6)'; c.lineWidth = 0.5;
    const a = frame ? 0.55 : 0.2;
    for (const s of [-1, 1]) { ellipse(c, 23 + s * 13, 7, 13, 5, s * a); c.fill(); c.stroke(); ellipse(c, 23 + s * 10, 13, 9, 3.5, s * (a + 0.3)); c.fill(); }
    // Abdomen: armoured, orange and black, to a sting.
    c.save();
    c.beginPath(); c.moveTo(13, 6); c.quadraticCurveTo(23, -1, 33, 6); c.quadraticCurveTo(33, 20, 23, 25); c.quadraticCurveTo(13, 20, 13, 6); c.closePath();
    const g = c.createLinearGradient(13, 0, 33, 0);
    g.addColorStop(0, '#a84a00'); g.addColorStop(0.45, '#ffb030'); g.addColorStop(1, '#a84a00');
    c.fillStyle = g; c.fill(); c.clip();
    c.fillStyle = '#1a1006';
    for (let k = 0; k < 4; k++) c.fillRect(10, 5 + k * 4.5, 26, 2);
    c.restore();
    c.strokeStyle = '#1a1006'; c.lineWidth = 0.8;
    c.beginPath(); c.moveTo(13, 6); c.quadraticCurveTo(23, -1, 33, 6); c.quadraticCurveTo(33, 20, 23, 25); c.quadraticCurveTo(13, 20, 13, 6); c.stroke();
    // Head with a horned crest, and a long sting below.
    const hg = c.createRadialGradient(21, 25, 1, 23, 27, 7);
    hg.addColorStop(0, '#ffd27a'); hg.addColorStop(1, '#8a3a00');
    c.fillStyle = hg; ellipse(c, 23, 28, 7, 5.5); c.fill();
    c.fillStyle = '#1a1006';
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(23 + s * 3, 23.5); c.lineTo(23 + s * 7, 18.5); c.lineTo(23 + s * 5, 24); c.closePath(); c.fill(); }
    eyes(c, [[20, 28], [26, 28]], 1.6, '#ff3b3b');
    c.strokeStyle = '#1a1006'; c.lineWidth = 1.1;
    c.beginPath(); c.moveTo(23, 33); c.lineTo(23, 37); c.stroke();
  });
}

function firefly(frame: number) {
  const { w, h } = BUG_SIZE.firefly;
  return sprite(`firefly:${frame}`, w, h, 5, (c) => {
    // A lantern of a tail, pulsing.
    const glowR = frame ? 6 : 4.5;
    const g = c.createRadialGradient(5, 7, 0, 5, 7, glowR);
    g.addColorStop(0, 'rgba(230,255,120,0.95)'); g.addColorStop(0.5, 'rgba(170,255,60,0.5)'); g.addColorStop(1, 'rgba(120,255,60,0)');
    c.fillStyle = g; ellipse(c, 5, 7, glowR, glowR); c.fill();
    c.fillStyle = '#f4ff9a'; ellipse(c, 5, 7.5, 2.6, 3.2); c.fill();
    c.fillStyle = 'rgba(220,240,255,0.55)';
    ellipse(c, 2, 3.5, 2.6, 1.3, frame ? -0.6 : -0.2); c.fill(); ellipse(c, 8, 3.5, 2.6, 1.3, frame ? 0.6 : 0.2); c.fill();
    c.fillStyle = '#3a2a14'; ellipse(c, 5, 3.4, 2, 2.4); c.fill();
    eyes(c, [[4, 2.6], [6, 2.6]], 0.55, '#ff5a3c');
  });
}

function shell(frame: number) {
  const { w, h } = BUG_SIZE.shell;
  return sprite(`shell:${frame}`, w, h, 3, (c) => {
    c.strokeStyle = '#6a7c94'; c.lineWidth = 0.9; c.lineCap = 'round';
    const sw = frame ? 1 : -1;
    for (const y of [4, 7.5, 11]) {
      c.beginPath(); c.moveTo(3, y); c.lineTo(0, y + sw); c.stroke();
      c.beginPath(); c.moveTo(13, y); c.lineTo(16, y - sw); c.stroke();
    }
    // Plated armour, steel blue, riveted.
    const g = c.createLinearGradient(2, 0, 14, 0);
    g.addColorStop(0, '#3a4a62'); g.addColorStop(0.45, '#b9c9e0'); g.addColorStop(1, '#3a4a62');
    c.fillStyle = g;
    c.beginPath(); c.roundRect(2, 1, 12, 11, 3); c.fill();
    c.strokeStyle = 'rgba(15,20,35,0.8)'; c.lineWidth = 0.6; c.stroke();
    for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(2.5, 3.8 + k * 2.8); c.lineTo(13.5, 3.8 + k * 2.8); c.stroke(); }
    c.fillStyle = '#e8eef8';
    for (const [x, y] of [[4, 2.4], [12, 2.4], [4, 10], [12, 10]]) { ellipse(c, x, y, 0.5, 0.5); c.fill(); }
    // A barrel underneath — it shoots back.
    c.fillStyle = '#20283a'; c.fillRect(6.6, 11, 2.8, 3);
    eyes(c, [[5.6, 11.2], [10.4, 11.2]], 0.7, '#ff8a3a');
  });
}

/** A moth in gold, worth a fortune. */
function golden(frame: number) {
  const base = moth(frame);
  return sprite(`golden:${frame}`, base.w, base.h, base.pad, (c) => {
    c.save();
    c.translate(-base.pad, -base.pad);
    c.drawImage(base.cv, 0, 0, base.w + base.pad * 2, base.h + base.pad * 2);
    c.globalCompositeOperation = 'source-atop';
    const g = c.createLinearGradient(0, 0, base.w + base.pad * 2, base.h + base.pad * 2);
    g.addColorStop(0, 'rgba(255,240,150,0.85)'); g.addColorStop(0.5, 'rgba(255,190,40,0.8)'); g.addColorStop(1, 'rgba(255,240,150,0.85)');
    c.fillStyle = g;
    c.fillRect(0, 0, base.w + base.pad * 2, base.h + base.pad * 2);
    c.restore();
  });
}

function splitter(frame: number) {
  const { w, h } = BUG_SIZE.splitter;
  const wob = frame ? 0.6 : 0;
  return sprite(`splitter:${frame}`, w, h, 3, (c) => {
    // A jelly sac, two cores inside — what it splits into.
    const g = c.createRadialGradient(6, 4, 0.5, 7.5, 6.5, 8);
    g.addColorStop(0, 'rgba(210,255,230,0.95)'); g.addColorStop(0.5, 'rgba(60,220,160,0.75)'); g.addColorStop(1, 'rgba(10,110,90,0.9)');
    c.fillStyle = g; ellipse(c, 7.5, 6.5, 7 + wob, 6 - wob); c.fill();
    c.strokeStyle = 'rgba(5,60,50,0.8)'; c.lineWidth = 0.5; c.stroke();
    c.fillStyle = '#ff6ad5';
    ellipse(c, 5, 6.5, 1.8, 1.8); c.fill(); ellipse(c, 10, 6.5, 1.8, 1.8); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)'; ellipse(c, 4.5, 3, 2, 1, -0.4); c.fill();
    c.strokeStyle = '#1a7a60'; c.lineWidth = 0.7; c.lineCap = 'round';
    for (const x of [3.5, 7.5, 11.5]) { c.beginPath(); c.moveTo(x, 11.5); c.quadraticCurveTo(x + (frame ? 1 : -1), 13, x, 14); c.stroke(); }
  });
}

function mite(frame: number) {
  const { w, h } = BUG_SIZE.mite;
  return sprite(`mite:${frame}`, w, h, 2, (c) => {
    c.strokeStyle = '#b0306a'; c.lineWidth = 0.6;
    const sw = frame ? 0.8 : -0.8;
    for (const y of [3, 5]) { c.beginPath(); c.moveTo(1.5, y); c.lineTo(-0.5, y + sw); c.moveTo(6.5, y); c.lineTo(8.5, y - sw); c.stroke(); }
    const g = c.createRadialGradient(3.4, 3, 0.2, 4, 4, 4);
    g.addColorStop(0, '#ffc0e8'); g.addColorStop(1, '#c02a7a');
    c.fillStyle = g; ellipse(c, 4, 4, 3.2, 3.4); c.fill();
    eyes(c, [[3, 6], [5, 6]], 0.5, '#ffffff');
  });
}

const BUGS: Record<BugKind, { frames: number; fps: number; make: (f: number) => Sprite }> = {
  splitter: { frames: 2, fps: 4, make: splitter },
  mite: { frames: 2, fps: 16, make: mite },
  firefly: { frames: 2, fps: 8, make: firefly },
  shell: { frames: 2, fps: 5, make: shell },
  golden: { frames: 4, fps: 14, make: golden },
  beetle: { frames: 2, fps: 6, make: beetle },
  moth: { frames: 4, fps: 12, make: moth },
  wasp: { frames: 2, fps: 18, make: wasp },
  queen: { frames: 4, fps: 8, make: queen },
  mantis: { frames: 4, fps: 6, make: mantis },
  spider: { frames: 4, fps: 6, make: spider },
  hornet: { frames: 2, fps: 20, make: hornet },
};
const BOSS_GLOW: Record<string, string> = { queen: '#a040ff', mantis: '#40ff70', spider: '#ff2040', hornet: '#ff9020' };

/** A bug; `flash` (0–1) whitens it, just hit. */
export function drawBug(c: C, kind: BugKind, x: number, y: number, t: number, id: number, flash: number) {
  const b = BUGS[kind];
  const f = Math.floor(t * b.fps + id * 0.37) % b.frames;
  const s = b.make(f);
  if (kind === 'golden') drawGlow(c, x + 8, y + 6, 14 + Math.sin(t * 8) * 2, '#ffd23f', 0.6);
  if (isBoss(kind)) drawGlow(c, x + BUG_SIZE[kind].w / 2, y + BUG_SIZE[kind].h / 2 + 4, 30 + Math.sin(t * 4) * 3, BOSS_GLOW[kind], 0.35);
  stamp(c, s, x, y);
  if (flash > 0) {
    c.globalAlpha = Math.min(1, flash);
    stamp(c, white(`${kind}:${f}`, s), x, y);
    c.globalAlpha = 1;
  }
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

export function drawBomb(c: C, x: number, y: number, t: number, id: number, kind: BombKind = 'larva') {
  const pulse = 0.8 + Math.sin(t * 10 + id) * 0.2;
  if (kind === 'orb') {
    c.globalCompositeOperation = 'lighter';
    drawGlow(c, x, y, 7 * pulse, '#ff2a5a', 0.7);
    c.globalCompositeOperation = 'source-over';
    const g = c.createRadialGradient(x - 0.8, y - 0.8, 0.2, x, y, 3);
    g.addColorStop(0, '#ffe0ea'); g.addColorStop(0.5, '#ff4d7a'); g.addColorStop(1, '#8a0a2a');
    c.fillStyle = g; ellipse(c, x, y, 3, 3); c.fill();
    return;
  }
  if (kind === 'sting' || kind === 'blade') {
    const color = kind === 'sting' ? '#ffb030' : '#7dff8a';
    c.globalCompositeOperation = 'lighter';
    drawGlow(c, x, y, 6 * pulse, color, 0.6);
    c.globalCompositeOperation = 'source-over';
    c.save(); c.translate(x, y); c.rotate(t * (kind === 'blade' ? 14 : 0));
    c.fillStyle = kind === 'sting' ? '#fff0c8' : '#e0ffe4';
    if (kind === 'sting') { c.beginPath(); c.moveTo(0, 4.5); c.lineTo(1.4, -2.5); c.lineTo(-1.4, -2.5); c.closePath(); c.fill(); }
    else { c.beginPath(); c.moveTo(-4, 0); c.quadraticCurveTo(0, -3, 4, 0); c.quadraticCurveTo(0, -1, -4, 0); c.fill(); }
    c.restore();
    return;
  }
  c.globalCompositeOperation = 'lighter';
  drawGlow(c, x, y, 6 * pulse, '#62ff6e', 0.6);
  c.globalCompositeOperation = 'source-over';
  const g = c.createRadialGradient(x - 0.8, y - 1.2, 0.2, x, y, 3.2);
  g.addColorStop(0, '#eaffd6'); g.addColorStop(0.5, '#62d84e'); g.addColorStop(1, '#1f6a1a');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(x, y - 4); c.quadraticCurveTo(x + 3, y - 0.5, x + 2.2, y + 2); c.quadraticCurveTo(x, y + 3.6, x - 2.2, y + 2); c.quadraticCurveTo(x - 3, y - 0.5, x, y - 4); c.fill();
}

const DROP_COLOR: Record<DropKind, string> = { time: '#7aa2ff', nova: '#9be7ff', gun: '#ff9f1c', shield: '#4cc9f0', life: '#ff4d6d', blaster: '#2fd38a', laser: '#c77dff', rockets: '#ff5d8f', scatter: '#ffd166' };
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

export function drawDrop(c: C, kind: DropKind, x: number, y: number, t: number) {
  const col = DROP_COLOR[kind];
  c.globalCompositeOperation = 'lighter';
  drawGlow(c, x, y, 11 + Math.sin(t * 6) * 1.5, col, 0.55);
  c.globalCompositeOperation = 'source-over';
  const g = c.createRadialGradient(x - 2, y - 2, 0.5, x, y, 6.5);
  g.addColorStop(0, mix(col, '#ffffff', 0.5)); g.addColorStop(0.6, col); g.addColorStop(1, mix(col, '#000000', 0.5));
  c.fillStyle = g; ellipse(c, x, y, 6.5, 6.5); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 0.6;
  c.beginPath(); c.arc(x, y, 8, t * 2.5, t * 2.5 + 1.2); c.stroke();
  c.beginPath(); c.arc(x, y, 8, t * 2.5 + Math.PI, t * 2.5 + Math.PI + 1.2); c.stroke();
  dropIcon(c, kind, x, y);
}

// ── Explosions and the rest of the fireworks ───────────────────────────────

export interface Fx { kind: 'spark' | 'smoke' | 'ring' | 'flash' | 'ember' | 'text'; x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; text?: string }

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
  }
  return fx.filter((f) => f.life > 0);
}

export function drawFx(c: C, fx: Fx[]) {
  for (const f of fx) {
    if (f.kind !== 'smoke') continue;
    const k = 1 - f.life / f.max;
    c.fillStyle = `rgba(90,80,120,${0.35 * (1 - k)})`;
    ellipse(c, f.x, f.y, f.size * (0.6 + k), f.size * (0.6 + k)); c.fill();
  }
  c.globalCompositeOperation = 'lighter';
  for (const f of fx) {
    const k = 1 - f.life / f.max;
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
      c.font = `800 ${f.size}px system-ui, sans-serif`;
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
