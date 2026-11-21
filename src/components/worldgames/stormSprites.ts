import type { BugKind } from '../../lib/bugSwarm';

// The storm spirits, painted: cartoon characters with thick dark outlines,
// soft gradients and faces, drawn once per animation frame into a canvas and
// shown in the 3D scene (stormScene) as billboards. Built from primitives
// they read as lumps at this size; painted, each one is a character you can
// tell apart at a glance against the river.
//
// Painted in a 100×100 design space (bosses too, at a bigger canvas), facing
// down the field — towards the player.

type C = CanvasRenderingContext2D;

const INK = '#1a1030';

function canvas(px: number, draw: (c: C) => void) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = px;
  const c = cv.getContext('2d')!;
  c.scale(px / 100, px / 100);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  draw(c);
  return cv;
}

/** A shape filled with an outline round it only: the outline is stroked
 *  thick first and the fill laid over it, so the inner seams of a shape made
 *  of overlapping circles don't show. */
function blob(c: C, path: () => void, fill: string | CanvasGradient, ink = INK, width = 7) {
  c.beginPath(); path();
  c.strokeStyle = ink; c.lineWidth = width; c.stroke();
  c.fillStyle = fill; c.fill();
}

const circles = (c: C, list: [number, number, number][]) => () => { for (const [x, y, r] of list) { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); } };

function lin(c: C, y0: number, y1: number, stops: string[]) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
  return g;
}
function rad(c: C, x: number, y: number, r: number, stops: string[]) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
  return g;
}

/** Two eyes looking down at you. `mood`: angry brows, sly, or wide. */
function face(c: C, x: number, y: number, o: { gap: number; r: number; mood?: 'angry' | 'wide' | 'calm'; iris?: string; mouth?: 'grin' | 'o' | 'line' | 'fangs'; ink?: string }) {
  const ink = o.ink ?? INK;
  for (const s of [-1, 1]) {
    const ex = x + s * o.gap;
    c.beginPath(); c.ellipse(ex, y, o.r * 0.85, o.r, 0, 0, Math.PI * 2);
    c.fillStyle = '#ffffff'; c.fill(); c.strokeStyle = ink; c.lineWidth = 2.2; c.stroke();
    c.beginPath(); c.arc(ex - s * o.r * 0.12, y + o.r * 0.3, o.r * 0.52, 0, Math.PI * 2);
    c.fillStyle = o.iris ?? ink; c.fill();
    if (o.iris) { c.beginPath(); c.arc(ex - s * o.r * 0.12, y + o.r * 0.3, o.r * 0.24, 0, Math.PI * 2); c.fillStyle = ink; c.fill(); }
    c.beginPath(); c.arc(ex - s * o.r * 0.3, y - o.r * 0.05, o.r * 0.18, 0, Math.PI * 2); c.fillStyle = '#ffffff'; c.fill();
    if (o.mood !== 'wide') {
      c.beginPath();
      const tilt = o.mood === 'calm' ? 0 : 0.45;
      // Inner end low: a frown, not a worry.
      c.moveTo(ex - s * o.r * 1.05, y - o.r * (1.25 - tilt));
      c.lineTo(ex + s * o.r * 0.95, y - o.r * (1.25 + tilt));
      c.strokeStyle = ink; c.lineWidth = 3; c.stroke();
    }
  }
  const my = y + o.r * 1.75;
  c.strokeStyle = ink; c.lineWidth = 2.4;
  if (o.mouth === 'grin') {
    c.beginPath(); c.moveTo(x - o.gap * 0.9, my); c.quadraticCurveTo(x, my + o.r * 0.9, x + o.gap * 0.9, my);
    c.closePath(); c.fillStyle = '#3a0a1a'; c.fill(); c.stroke();
    c.fillStyle = '#ffffff';
    for (let k = -1; k <= 1; k += 2) { c.beginPath(); c.moveTo(x + k * o.gap * 0.4 - 1.6, my + 0.5); c.lineTo(x + k * o.gap * 0.4 + 1.6, my + 0.5); c.lineTo(x + k * o.gap * 0.4, my + 3.4); c.fill(); }
  } else if (o.mouth === 'o') {
    c.beginPath(); c.ellipse(x, my, o.r * 0.35, o.r * 0.45, 0, 0, Math.PI * 2); c.fillStyle = '#3a0a1a'; c.fill(); c.stroke();
  } else if (o.mouth === 'fangs') {
    c.beginPath(); c.moveTo(x - o.gap, my); c.quadraticCurveTo(x, my + o.r * 0.6, x + o.gap, my); c.stroke();
    c.fillStyle = '#ffffff';
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x + s * o.gap * 0.55 - 2, my + 1); c.lineTo(x + s * o.gap * 0.55 + 2, my + 1); c.lineTo(x + s * o.gap * 0.55, my + 6); c.closePath(); c.fill(); c.stroke(); }
  } else if (o.mouth === 'line') {
    c.beginPath(); c.moveTo(x - o.gap * 0.5, my); c.lineTo(x + o.gap * 0.5, my - 1); c.stroke();
  }
}

/** A lightning bolt from (x, y) downwards. */
function bolt(c: C, x: number, y: number, len: number, w: number) {
  c.beginPath();
  c.moveTo(x - w * 0.3, y); c.lineTo(x + w * 0.6, y); c.lineTo(x + w * 0.1, y + len * 0.42);
  c.lineTo(x + w * 0.7, y + len * 0.42); c.lineTo(x - w * 0.4, y + len); c.lineTo(x - w * 0.05, y + len * 0.55);
  c.lineTo(x - w * 0.6, y + len * 0.55); c.closePath();
  c.fillStyle = '#ffe866'; c.strokeStyle = '#5a3000'; c.lineWidth = 2.4; c.stroke(); c.fill();
}

const shine = (c: C, x: number, y: number, rx: number, ry: number, rot = -0.5) => {
  c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fill();
};

// ── The rank and file ──────────────────────────────────────────────────────

function cloud(c: C, f: number) {
  if (f) bolt(c, 46, 70, 24, 9);
  blob(c, circles(c, [[28, 56, 17], [48, 42, 23], [70, 52, 18], [38, 66, 15], [60, 66, 16]]), lin(c, 20, 82, ['#ffffff', '#d8d0ff', '#8a80d0']));
  shine(c, 40, 32, 9, 4);
  face(c, 49, 55, { gap: 9, r: 6, mood: 'angry', mouth: 'line' });
  c.fillStyle = 'rgba(255,120,170,0.45)';
  for (const s of [-1, 1]) { c.beginPath(); c.ellipse(49 + s * 17, 64, 4, 2.4, 0, 0, Math.PI * 2); c.fill(); }
}

function wraith(c: C, f: number) {
  const w = f ? 5 : -5;
  blob(c, () => {
    c.moveTo(30, 58);
    c.bezierCurveTo(26, 30, 44 + w, 22, 50 - w, 6);
    c.bezierCurveTo(58 + w, 22, 76, 30, 70, 58);
    c.arc(50, 60, 20, 0, Math.PI);
  }, lin(c, 6, 80, ['rgba(200,255,245,0.55)', '#d8fff6', '#7fe8d8']), '#0e3a40');
  // Arms of wind.
  c.strokeStyle = '#0e3a40'; c.lineWidth = 6;
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(50 + s * 18, 62); c.quadraticCurveTo(50 + s * 32, 58 + w * s, 50 + s * 30, 46); c.stroke(); }
  c.strokeStyle = '#d8fff6'; c.lineWidth = 3;
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(50 + s * 18, 62); c.quadraticCurveTo(50 + s * 32, 58 + w * s, 50 + s * 30, 46); c.stroke(); }
  c.fillStyle = '#0e3a40';
  for (const s of [-1, 1]) { c.beginPath(); c.ellipse(50 + s * 8, 60, 4, 6.5, s * 0.2, 0, Math.PI * 2); c.fill(); }
  c.beginPath(); c.ellipse(50, 72, 3, 4, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#ff5a8a';
  for (const s of [-1, 1]) { c.beginPath(); c.arc(50 + s * 8, 61, 1.8, 0, Math.PI * 2); c.fill(); }
}

function imp(c: C, f: number) {
  const n = 9, off = f ? Math.PI / n : 0;
  blob(c, () => {
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2 + off, r = i % 2 ? 26 : 42;
      const x = 50 + Math.cos(a) * r, y = 52 + Math.sin(a) * r;
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    }
  }, rad(c, 44, 44, 44, ['#fffbe0', '#ffd23f', '#ff8a00']), '#4a1a00');
  face(c, 50, 50, { gap: 10, r: 7, mood: 'angry', mouth: 'grin', iris: '#ff3b1a', ink: '#4a1a00' });
}

function wisp(c: C, f: number) {
  const tip = f ? 6 : -6;
  const flame = (s: number, dy: number) => () => {
    c.moveTo(50, 86 - dy);
    c.bezierCurveTo(50 - 30 * s, 84 - dy, 50 - 30 * s, 56, 50 - 12 * s, 38 + dy);
    c.quadraticCurveTo(50 + tip * s, 22 + dy, 50 + tip * s, 6 + dy * 2);
    c.quadraticCurveTo(50 + 30 * s, 30 + dy, 50 + 28 * s, 60);
    c.bezierCurveTo(50 + 28 * s, 80 - dy, 50 + 14 * s, 86 - dy, 50, 86 - dy);
  };
  blob(c, flame(1, 0), rad(c, 50, 70, 40, ['#f4ffd0', '#8dff5a', '#18a040']), '#0a3a10');
  c.beginPath(); flame(0.55, 10)(); c.fillStyle = 'rgba(250,255,220,0.75)'; c.fill();
  face(c, 50, 64, { gap: 8, r: 5.5, mood: 'wide', mouth: 'o', ink: '#0a3a10' });
}

function hail(c: C) {
  const pts: [number, number][] = [[50, 10], [80, 28], [84, 64], [52, 90], [18, 70], [16, 32]];
  blob(c, () => { c.moveTo(...pts[0]); for (const p of pts.slice(1)) c.lineTo(...p); c.closePath(); }, '#bfe6ff', '#123048');
  // Facets, light from the top left.
  const centre: [number, number] = [50, 52];
  const tones = ['#f4fcff', '#d8f2ff', '#8cc4e8', '#6aa8d8', '#a8d8f4', '#e8f8ff'];
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length];
    c.beginPath(); c.moveTo(...centre); c.lineTo(...p); c.lineTo(...q); c.closePath();
    c.fillStyle = tones[i]; c.fill();
    c.strokeStyle = 'rgba(18,48,72,0.35)'; c.lineWidth = 1.2; c.stroke();
  });
  c.beginPath(); c.moveTo(...pts[0]); for (const p of pts.slice(1)) c.lineTo(...p); c.closePath();
  c.strokeStyle = '#123048'; c.lineWidth = 4; c.stroke();
  face(c, 50, 54, { gap: 10, r: 6, mood: 'calm', mouth: 'line', iris: '#2a7ac0', ink: '#123048' });
}

function carp(c: C, f: number) {
  const sw = f ? 9 : -9;
  // The tail, then the fins, then the body over them.
  blob(c, () => { c.moveTo(50, 26); c.quadraticCurveTo(36 + sw, 12, 30 + sw, 2); c.quadraticCurveTo(50 + sw, 10, 70 + sw, 2); c.quadraticCurveTo(64 + sw, 12, 50, 26); }, lin(c, 0, 26, ['#ffb030', '#ff6a1a']), '#5a2000', 5);
  for (const s of [-1, 1]) blob(c, () => { c.moveTo(50 + s * 14, 56); c.quadraticCurveTo(50 + s * 32, 58 - sw * s * 0.3, 50 + s * 28, 72); c.quadraticCurveTo(50 + s * 20, 66, 50 + s * 12, 64); }, '#ff8a1a', '#5a2000', 5);
  blob(c, () => { c.ellipse(50, 54, 17, 32, 0, 0, Math.PI * 2); }, rad(c, 44, 46, 34, ['#fff6c0', '#ffd23f', '#e08a00']), '#5a2000');
  c.strokeStyle = 'rgba(160,80,0,0.55)'; c.lineWidth = 1.4;
  for (let row = 0; row < 4; row++) for (let k = -1; k <= 1; k++) { c.beginPath(); c.arc(50 + k * 8 + (row % 2) * 4 - 2, 34 + row * 8, 4, 0.2, Math.PI - 0.2); c.stroke(); }
  shine(c, 42, 38, 4, 10, 0.1);
  face(c, 50, 72, { gap: 8, r: 4.5, mood: 'wide', mouth: 'o', ink: '#5a2000' });
  c.strokeStyle = '#5a2000'; c.lineWidth = 1.6;
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(50 + s * 5, 84); c.quadraticCurveTo(50 + s * 14, 90, 50 + s * 12, 97); c.stroke(); }
}

function jelly(c: C, f: number) {
  const sq = f ? 3 : 0;
  blob(c, () => {
    c.moveTo(50, 10 + sq);
    c.bezierCurveTo(60, 30, 80 + sq, 46, 80 + sq, 62);
    c.bezierCurveTo(80 + sq, 80, 66, 90 - sq, 50, 90 - sq);
    c.bezierCurveTo(34, 90 - sq, 20 - sq, 80, 20 - sq, 62);
    c.bezierCurveTo(20 - sq, 46, 40, 30, 50, 10 + sq);
  }, rad(c, 42, 52, 44, ['#f0fbff', '#7cd0ff', '#2a74d0']), '#0a2a5a');
  c.beginPath(); c.arc(56, 70, 9, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,0.28)'; c.fill();
  shine(c, 38, 40, 4, 9, 0.5);
  face(c, 50, 62, { gap: 9, r: 5.5, mood: 'wide', mouth: 'o', ink: '#0a2a5a' });
}

// ── The bosses ─────────────────────────────────────────────────────────────

function stormMother(c: C, f: number) {
  // Lightning hanging from her, flickering between frames.
  for (const [x, len] of [[26, 22], [50, 30], [74, 22]] as const) if ((x + f * 24) % 48 < 30) bolt(c, x, 70, len, 7);
  blob(c, circles(c, [[20, 54, 15], [34, 40, 19], [52, 32, 22], [70, 40, 18], [82, 54, 14], [30, 64, 15], [50, 66, 17], [70, 64, 15]]), lin(c, 10, 82, ['#e8dcff', '#9a80e0', '#4a2a8a']), INK, 6);
  // A crown of lightning.
  for (const [x, h] of [[36, 16], [50, 22], [64, 16]] as const) {
    c.beginPath(); c.moveTo(x - 5, 16); c.lineTo(x, 16 - h); c.lineTo(x + 5, 16); c.closePath();
    c.fillStyle = '#ffe866'; c.strokeStyle = '#5a3000'; c.lineWidth = 2.2; c.stroke(); c.fill();
  }
  shine(c, 40, 24, 9, 3.5);
  face(c, 51, 46, { gap: 12, r: 7.5, mood: 'angry', mouth: 'fangs', iris: '#ff3ba0' });
}

function typhoon(c: C, f: number) {
  const turn = f * (Math.PI / 6);
  // Arms of wind, wound round the eye.
  for (let i = 0; i < 4; i++) {
    const a0 = (i / 4) * Math.PI * 2 + turn;
    c.beginPath();
    for (let k = 0; k <= 24; k++) {
      const a = a0 + k * 0.12, r = 14 + k * 1.45;
      const x = 50 + Math.cos(a) * r, y = 50 + Math.sin(a) * r * 0.9;
      if (k) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.strokeStyle = '#123a44'; c.lineWidth = 12; c.stroke();
    c.strokeStyle = i % 2 ? '#bff0e8' : '#7cc8d0'; c.lineWidth = 7; c.stroke();
  }
  blob(c, () => c.arc(50, 50, 17, 0, Math.PI * 2), rad(c, 46, 46, 18, ['#ffffff', '#d8fff0']), '#123a44', 5);
  c.beginPath(); c.arc(50, 52, 11, 0, Math.PI * 2); c.fillStyle = rad(c, 50, 52, 11, ['#f0ffb0', '#40ff70', '#0a7a30']); c.fill();
  c.beginPath(); c.ellipse(50, 52, 3, 9, 0, 0, Math.PI * 2); c.fillStyle = '#0a1a10'; c.fill();
  shine(c, 45, 45, 3, 2);
  c.strokeStyle = '#123a44'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(34, 38); c.lineTo(48, 33); c.stroke();
  c.beginPath(); c.moveTo(66, 38); c.lineTo(52, 33); c.stroke();
}

function serpent(c: C, f: number) {
  const sway = f % 2 ? 5 : -5;
  // The coils behind the head, up the field.
  for (let i = 5; i >= 1; i--) {
    const x = 50 + Math.sin(i * 1.3 + f * 0.8) * (8 + i * 3) + sway * (i % 2 ? 1 : -1) * 0.4, y = 56 - i * 9.5, r = 15 - i * 1.4;
    blob(c, () => c.arc(x, y, r, 0, Math.PI * 2), rad(c, x - 4, y - 4, r * 1.4, ['#8ff0d8', '#2aa090', '#105050']), '#06282a', 5);
    c.strokeStyle = 'rgba(6,40,42,0.45)'; c.lineWidth = 1.4;
    c.beginPath(); c.arc(x, y + 2, r * 0.55, 0.3, Math.PI - 0.3); c.stroke();
  }
  // Horns and fins, then the head.
  for (const s of [-1, 1]) {
    blob(c, () => { c.moveTo(50 + s * 10, 52); c.quadraticCurveTo(50 + s * 24, 36, 50 + s * 30, 30); c.quadraticCurveTo(50 + s * 22, 44, 50 + s * 16, 56); }, '#f4ecc8', '#3a3018', 4);
    blob(c, () => { c.moveTo(50 + s * 18, 62); c.lineTo(50 + s * 34, 58); c.lineTo(50 + s * 30, 66); c.lineTo(50 + s * 36, 70); c.lineTo(50 + s * 18, 72); }, '#3fd0b0', '#06282a', 4);
  }
  blob(c, () => { c.moveTo(50, 48); c.bezierCurveTo(70, 48, 74, 66, 64, 84); c.quadraticCurveTo(50, 94, 36, 84); c.bezierCurveTo(26, 66, 30, 48, 50, 48); }, rad(c, 44, 60, 34, ['#9ff8e0', '#30b0a0', '#0e5a5a']), '#06282a', 6);
  face(c, 50, 64, { gap: 9, r: 5.5, mood: 'angry', mouth: 'fangs', iris: '#ff2a5a', ink: '#06282a' });
}

function dragon(c: C, f: number) {
  const wave = f % 2 ? 4 : -4;
  // Mane of flame behind the head.
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI, r = 40 + (i % 2) * 6;
    blob(c, () => { c.moveTo(50 + Math.cos(a - 0.18) * 22, 46 + Math.sin(a - 0.18) * 22); c.lineTo(50 + Math.cos(a) * r, 46 + Math.sin(a) * r); c.lineTo(50 + Math.cos(a + 0.18) * 22, 46 + Math.sin(a + 0.18) * 22); }, i % 2 ? '#ff7a1a' : '#ffb030', '#5a1a00', 4);
  }
  // Branched horns.
  for (const s of [-1, 1]) {
    c.strokeStyle = '#5a3a10'; c.lineWidth = 7;
    const horn = () => { c.beginPath(); c.moveTo(50 + s * 12, 30); c.quadraticCurveTo(50 + s * 20, 14, 50 + s * 30, 6); c.moveTo(50 + s * 20, 18); c.lineTo(50 + s * 30, 20); c.stroke(); };
    horn(); c.strokeStyle = '#fff2c0'; c.lineWidth = 3.5; horn();
  }
  // Head: brow, cheeks, snout.
  blob(c, () => {
    c.moveTo(50, 22);
    c.bezierCurveTo(72, 22, 80, 40, 74, 56);
    c.bezierCurveTo(70, 68, 64, 80, 50, 84);
    c.bezierCurveTo(36, 80, 30, 68, 26, 56);
    c.bezierCurveTo(20, 40, 28, 22, 50, 22);
  }, rad(c, 44, 40, 44, ['#fff2b0', '#ffc030', '#c06a00']), '#4a2000');
  // Whiskers, flowing.
  for (const s of [-1, 1]) {
    c.strokeStyle = '#4a2000'; c.lineWidth = 4.5;
    const wh = () => { c.beginPath(); c.moveTo(50 + s * 10, 74); c.bezierCurveTo(50 + s * 26, 80 + wave * s, 50 + s * 34, 70 - wave * s, 50 + s * 44, 84 + wave); c.stroke(); };
    wh(); c.strokeStyle = '#fff2c0'; c.lineWidth = 2; wh();
  }
  // Nostrils and snout ridge.
  c.fillStyle = '#4a2000';
  for (const s of [-1, 1]) { c.beginPath(); c.ellipse(50 + s * 6, 74, 2.4, 1.6, 0, 0, Math.PI * 2); c.fill(); }
  c.strokeStyle = 'rgba(74,32,0,0.6)'; c.lineWidth = 1.6;
  for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(44, 30 + k * 5); c.quadraticCurveTo(50, 27 + k * 5, 56, 30 + k * 5); c.stroke(); }
  // A pearl, held in its mouth — the dragon's own.
  c.beginPath(); c.arc(50, 87, 5, 0, Math.PI * 2); c.fillStyle = rad(c, 48, 85, 6, ['#ffffff', '#ffe6f0', '#e0a0c0']); c.fill();
  c.strokeStyle = '#4a2000'; c.lineWidth = 2; c.stroke();
  face(c, 50, 50, { gap: 12, r: 6.5, mood: 'angry', iris: '#ff3b1a', ink: '#4a2000' });
}

const PAINT: Record<BugKind, { frames: number; fps: number; px: number; paint: (c: C, f: number) => void }> = {
  beetle: { frames: 2, fps: 3, px: 128, paint: cloud },
  moth: { frames: 2, fps: 6, px: 128, paint: wraith },
  wasp: { frames: 2, fps: 10, px: 128, paint: imp },
  firefly: { frames: 2, fps: 9, px: 128, paint: wisp },
  shell: { frames: 1, fps: 1, px: 128, paint: hail },
  golden: { frames: 2, fps: 8, px: 128, paint: carp },
  splitter: { frames: 2, fps: 4, px: 128, paint: jelly },
  mite: { frames: 2, fps: 6, px: 96, paint: jelly },
  queen: { frames: 2, fps: 6, px: 320, paint: stormMother },
  mantis: { frames: 3, fps: 10, px: 320, paint: typhoon },
  spider: { frames: 4, fps: 4, px: 320, paint: serpent },
  hornet: { frames: 2, fps: 4, px: 320, paint: dragon },
};

const cache = new Map<string, HTMLCanvasElement>();

/** A spirit's painting for this moment, and the same as a white silhouette (for a hit's flash). */
export function spiritArt(kind: BugKind, t: number, id: number) {
  const p = PAINT[kind];
  const f = Math.floor(t * p.fps + id * 0.37) % p.frames;
  const key = `${kind}:${f}`;
  let art = cache.get(key);
  if (!art) { art = canvas(p.px, (c) => p.paint(c, f)); cache.set(key, art); }
  let white = cache.get(`${key}:w`);
  if (!white) {
    const src = art;
    white = canvas(p.px, (c) => {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(src, 0, 0);
      c.globalCompositeOperation = 'source-atop';
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, p.px, p.px);
    });
    cache.set(`${key}:w`, white);
  }
  return { key, art, white };
}
