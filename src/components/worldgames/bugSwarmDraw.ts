import { BUG_SIZE, H, SHIP_H, SHIP_W, W, type BugKind, type DropKind } from '../../lib/bugSwarm';

// Bug Swarm's pixel art: the ships and bugs are character grids (the way the
// world's PixelIcons are), painted a pixel at a time at the game's own
// resolution and scaled up by the canvas. The queen, too big for a grid
// worth reading, is built from rectangles.

type C = CanvasRenderingContext2D;
type Palette = Record<string, string>;

export const SHIP_COLORS = ['#2fd38a', '#ff6b5a'] as const;
export const SHOT_COLORS = ['#b5ffd9', '#ffd0c8'] as const;

function sprite(c: C, rows: readonly string[], x: number, y: number, pal: Palette) {
  const ox = Math.round(x), oy = Math.round(y);
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let k = 0; k < row.length; k++) {
      const col = pal[row[k]];
      if (!col) continue;
      c.fillStyle = col;
      c.fillRect(ox + k, oy + r, 1, 1);
    }
  }
}

const SHIP = [
  '......BB......',
  '.....BWWB.....',
  '.....BWWB.....',
  '....BBBBBB....',
  '...BBBDDBBB...',
  '.D.BBBBBBBB.D.',
  'DD.BBBBBBBB.DD',
  'DDBBBBBBBBBBDD',
  'DDDBBBBBBBBDDD',
  'DD..BBBBBB..DD',
  'D....D..D....D',
  '.....F..F.....',
];

const BEETLE = [
  [
    '..A........A..',
    '...A......A...',
    '....SSSSSS....',
    '..SSLLSSSSSS..',
    '.SSLLSSSSSSSS.',
    '.SSSSSSDSSSSS.',
    'SSSSSSSDSSSSSS',
    'SESSSSSDSSSSES',
    '.SSSSSSDSSSSS.',
    '..SSSSSDSSSS..',
    '.G..G....G..G.',
    'G..G......G..G',
  ],
  [
    '..A........A..',
    '...A......A...',
    '....SSSSSS....',
    '..SSLLSSSSSS..',
    '.SSLLSSSSSSSS.',
    '.SSSSSSDSSSSS.',
    'SSSSSSSDSSSSSS',
    'SESSSSSDSSSSES',
    '.SSSSSSDSSSSS.',
    '..SSSSSDSSSS..',
    '..G..G..G..G..',
    '..G..G..G..G..',
  ],
];
const BEETLE_PAL: Palette = { S: '#6a3fb0', L: '#a98bf0', D: '#2b1650', E: '#ffe066', A: '#c9b8ff', G: '#2b1650' };

const MOTH = [
  [
    'WW............WW',
    'WWW..A....A..WWW',
    'WWWW..A..A..WWWW',
    'WWWWW.BBBB.WWWWW',
    'WWPWWBBBBBBWWPWW',
    'WWWWWBEBBEBWWWWW',
    '.WWWWBBBBBBWWWW.',
    '..WWWBBBBBBWWW..',
    '...WW.BBBB.WW...',
    '.......BB.......',
    '.......BB.......',
    '................',
  ],
  [
    '................',
    '.....A....A.....',
    '......A..A......',
    '.WWWW.BBBB.WWWW.',
    'WWPWWBBBBBBWWPWW',
    'WWWWWBEBBEBWWWWW',
    'WWWWWBBBBBBWWWWW',
    '.WWWWBBBBBBWWWW.',
    '..WWW.BBBB.WWW..',
    '.......BB.......',
    '.......BB.......',
    '................',
  ],
];
const MOTH_PAL: Palette = { W: '#e8dcc0', P: '#b06ad8', B: '#8a6a4a', E: '#ff4d6d', A: '#e8dcc0' };

const WASP = [
  [
    'ww..........ww',
    'www........www',
    '.www.YYYY.www.',
    '..wwYYYYYYww..',
    '...YKEYYEKY...',
    '...YYYYYYYY...',
    '....KKKKKK....',
    '....YYYYYY....',
    '....KKKKKK....',
    '.....YYYY.....',
    '.....KKKK.....',
    '......YY......',
    '......K.......',
  ],
  [
    '..............',
    '.ww........ww.',
    'wwww.YYYY.wwww',
    '.wwwYYYYYYwww.',
    '...YKEYYEKY...',
    '...YYYYYYYY...',
    '....KKKKKK....',
    '....YYYYYY....',
    '....KKKKKK....',
    '.....YYYY.....',
    '.....KKKK.....',
    '......YY......',
    '......K.......',
  ],
];
const WASP_PAL: Palette = { w: 'rgba(200,235,255,0.65)', Y: '#ffd23f', K: '#2a2110', E: '#ff3b3b' };

export function drawBackground(c: C, t: number) {
  c.fillStyle = '#07071a';
  c.fillRect(0, 0, W, H);
  // A nebula drifting by.
  const g = c.createRadialGradient(W * 0.3, ((t * 6) % (H + 200)) - 100, 10, W * 0.3, ((t * 6) % (H + 200)) - 100, 140);
  g.addColorStop(0, 'rgba(120,60,170,0.22)');
  g.addColorStop(1, 'rgba(120,60,170,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  // Three layers of stars, the near ones faster.
  for (let layer = 0; layer < 3; layer++) {
    const speed = 12 + layer * 26;
    c.fillStyle = ['#5a5a8a', '#9a9ad0', '#ffffff'][layer];
    for (let i = 0; i < 26; i++) {
      const x = (i * 83 + layer * 31) % W;
      const y = ((i * 137 + layer * 59) % H + t * speed) % H;
      c.fillRect(x, Math.floor(y), layer === 2 && i % 3 === 0 ? 2 : 1, 1);
    }
  }
}

export function drawShip(c: C, x: number, y: number, color: string, o: { t: number; inv: number; shield: number; name?: string }) {
  if (o.inv > 0 && Math.floor(o.t * 14) % 2) return;
  const flame = Math.floor(o.t * 20) % 2 ? '#ffd23f' : '#ff7b1c';
  sprite(c, SHIP, x, y, { B: color, D: shade(color), W: '#d6f6ff', F: flame });
  if (o.shield > 0) {
    c.strokeStyle = o.shield < 1.5 && Math.floor(o.t * 10) % 2 ? 'rgba(120,210,255,0.3)' : 'rgba(120,210,255,0.8)';
    c.lineWidth = 1;
    c.beginPath(); c.arc(Math.round(x + SHIP_W / 2) + 0.5, Math.round(y + SHIP_H / 2) + 0.5, 11, 0, Math.PI * 2); c.stroke();
  }
  if (o.name) {
    c.font = 'bold 8px ui-monospace, monospace';
    c.textAlign = 'center';
    c.fillStyle = color;
    c.fillText(o.name, Math.round(x + SHIP_W / 2), Math.round(y + SHIP_H + 10));
  }
}

function shade(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.round(v * 0.55);
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

export function drawBug(c: C, kind: BugKind, x: number, y: number, t: number, id: number, hurt: number) {
  const frame = Math.floor(t * 6 + id) % 2;
  if (kind === 'beetle') sprite(c, BEETLE[frame], x, y, BEETLE_PAL);
  else if (kind === 'moth') sprite(c, MOTH[frame], x, y, MOTH_PAL);
  else if (kind === 'wasp') sprite(c, WASP[frame], x, y, WASP_PAL);
  else drawQueen(c, x, y, t, hurt);
}

function drawQueen(c: C, x0: number, y0: number, t: number, hurt: number) {
  const x = Math.round(x0), y = Math.round(y0);
  const { w } = BUG_SIZE.queen;
  const flap = Math.floor(t * 8) % 2;
  const r = (col: string, dx: number, dy: number, ww: number, hh: number) => { c.fillStyle = col; c.fillRect(x + dx, y + dy, ww, hh); };
  // Wings.
  const wing = 'rgba(200,235,255,0.45)';
  r(wing, -8, 2 + flap * 3, 20, 14 - flap * 3); r(wing, w - 12, 2 + flap * 3, 20, 14 - flap * 3);
  r(wing, -4, 14, 14, 8); r(wing, w - 10, 14, 14, 8);
  // Abdomen, striped.
  r('#5a2a8a', 10, 8, w - 20, 22);
  r('#7a3fb8', 12, 6, w - 24, 26);
  for (let k = 0; k < 3; k++) r('#3a1760', 12, 12 + k * 6, w - 24, 2);
  r('#a970ff', 16, 8, 6, 3);
  // Head, eyes, crown and mandibles.
  r('#3a1760', 18, 26, w - 36, 8);
  r('#ff3b5c', 19, 28, 4, 3); r('#ff3b5c', w - 23, 28, 4, 3);
  r('#2a1040', 20, 34, 3, 3); r('#2a1040', w - 23, 34, 3, 3);
  r('#ffd23f', 16, 0, w - 32, 4);
  for (let k = 0; k < 5; k++) r('#ffd23f', 17 + k * 4, -4 + (k % 2) * 2, 2, 4);
  if (hurt > 0) { c.globalAlpha = Math.min(0.7, hurt * 6); r('#ffffff', 10, 6, w - 20, 28); c.globalAlpha = 1; }
}

export function drawHealth(c: C, x: number, y: number, w: number, frac: number) {
  c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(Math.round(x), Math.round(y), w, 3);
  c.fillStyle = frac > 0.3 ? '#ff4d6d' : '#ffd23f'; c.fillRect(Math.round(x), Math.round(y), Math.round(w * frac), 3);
}

export function drawBomb(c: C, x: number, y: number, t: number) {
  const ox = Math.round(x - 2), oy = Math.round(y - 3);
  const wig = Math.floor(t * 10) % 2;
  c.fillStyle = '#62d84e'; c.fillRect(ox, oy + 1, 4, 5);
  c.fillStyle = '#b8ff9e'; c.fillRect(ox + 1, oy, 2, 2);
  c.fillStyle = '#2f7a25'; c.fillRect(ox + wig, oy + 6, 2, 1);
}

export function drawShot(c: C, x: number, y: number, color: string) {
  c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), 2, 6);
  c.fillStyle = '#ffffff'; c.fillRect(Math.round(x), Math.round(y), 2, 2);
}

const DROP_ICON: Record<DropKind, readonly string[]> = {
  gun: ['.#.#.#.', '.#.#.#.', '.#.#.#.', '#######', '.#####.'],
  shield: ['..###..', '.#...#.', '#.....#', '.#...#.', '..###..'],
  life: ['.##.##.', '#######', '.#####.', '..###..', '...#...'],
};
const DROP_COLOR: Record<DropKind, string> = { gun: '#ff9f1c', shield: '#4cc9f0', life: '#ff4d6d' };

export function drawDrop(c: C, kind: DropKind, x: number, y: number, t: number) {
  const ox = Math.round(x - 6), oy = Math.round(y - 6);
  const glow = 0.6 + 0.4 * Math.sin(t * 8);
  c.fillStyle = DROP_COLOR[kind]; c.globalAlpha = glow; c.fillRect(ox - 1, oy - 1, 14, 14); c.globalAlpha = 1;
  c.fillStyle = '#10102a'; c.fillRect(ox, oy, 12, 12);
  sprite(c, DROP_ICON[kind], ox + 3, oy + 4, { '#': DROP_COLOR[kind] });
}
