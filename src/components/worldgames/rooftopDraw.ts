import { PLAYER_H, ROWS, T, tileAt, type Boat, type EnemyKind, type Level } from '../../lib/rooftop';

// Rooftop Run's pixel art, painted with rectangles at the game's own
// resolution (the canvas is scaled up, pixelated): a dusk sky over Huế, the
// citadel wall in the distance, terracotta roofs, the river, and the two
// runners in nón lá. Nothing is loaded — every sprite is a few fillRects.

export const VIEW_H = ROWS * T;
export const COLORS = ['#2fa36b', '#e2574c'] as const;

type C = CanvasRenderingContext2D;
const rect = (c: C, color: string, x: number, y: number, w: number, h: number) => { c.fillStyle = color; c.fillRect(x, y, w, h); };

let skyCache: { h: number; g: CanvasGradient } | null = null;

export function drawSky(c: C, W: number, camX: number, t: number) {
  if (!skyCache || skyCache.h !== VIEW_H) {
    const g = c.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#1b1840');
    g.addColorStop(0.45, '#5a3a72');
    g.addColorStop(0.8, '#d97a5e');
    g.addColorStop(1, '#f2b06a');
    skyCache = { h: VIEW_H, g };
  }
  c.fillStyle = skyCache.g;
  c.fillRect(0, 0, W, VIEW_H);
  // Stars, fading toward the horizon.
  for (let i = 0; i < 40; i++) {
    const sx = ((i * 97 + 13) % 523) - ((camX * 0.05) % 523);
    const x = ((sx % W) + W) % W;
    const y = (i * 53) % 90;
    if (Math.sin(t * 2 + i) > 0.3) rect(c, 'rgba(255,240,210,0.7)', Math.round(x), y, 1, 1);
  }
  // The moon.
  c.fillStyle = 'rgba(255,226,170,0.9)';
  c.beginPath(); c.arc(W * 0.78, 52, 14, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,226,170,0.15)';
  c.beginPath(); c.arc(W * 0.78, 52, 22, 0, Math.PI * 2); c.fill();
  // Far hills (Ngự Bình's ridge).
  const far = camX * 0.15;
  c.fillStyle = '#3a2952';
  for (let x = 0; x < W; x += 2) {
    const h = 46 + 14 * Math.sin((x + far) * 0.018) + 7 * Math.sin((x + far) * 0.051);
    c.fillRect(x, VIEW_H - 50 - h, 2, h + 50);
  }
  // The citadel wall and its pavilions.
  const mid = camX * 0.4;
  rect(c, '#4f2f4c', 0, 178, W, VIEW_H - 178);
  rect(c, '#5f3a58', 0, 176, W, 3);
  const span = 300;
  for (let k = Math.floor(mid / span) - 1; k <= Math.floor((mid + W) / span) + 1; k++) {
    const x = Math.round(k * span - mid + 80);
    pavilion(c, x, 176, '#4f2f4c', '#3e2440');
  }
}

/** A two-tiered pavilion with up-turned eaves, as a silhouette. */
function pavilion(c: C, x: number, base: number, body: string, roof: string) {
  rect(c, body, x + 8, base - 22, 44, 22);
  rect(c, roof, x, base - 28, 60, 6);
  rect(c, roof, x - 3, base - 30, 4, 3); rect(c, roof, x + 59, base - 30, 4, 3);
  rect(c, body, x + 16, base - 40, 28, 12);
  rect(c, roof, x + 10, base - 46, 40, 6);
  rect(c, roof, x + 7, base - 48, 4, 3); rect(c, roof, x + 49, base - 48, 4, 3);
  rect(c, roof, x + 27, base - 52, 6, 6);
}

/** The citadel gate at the end of the level, behind the tiles. */
export function drawGoalGate(c: C, lv: Level, camX: number) {
  const x = Math.round(lv.goalX + 3 * T - camX);
  const base = 12 * T;
  rect(c, '#8b5a3c', x, base - 64, 112, 64);
  rect(c, '#6f452c', x, base - 64, 112, 3);
  for (let i = 0; i < 3; i++) {
    const dx = x + 12 + i * 34;
    rect(c, '#2a1810', dx, base - 34, 20, 34);
    rect(c, '#2a1810', dx + 2, base - 37, 16, 3);
  }
  rect(c, '#b8862e', x - 8, base - 74, 128, 10);
  rect(c, '#d9a441', x - 8, base - 74, 128, 3);
  rect(c, '#d9a441', x - 12, base - 78, 6, 4); rect(c, '#d9a441', x + 118, base - 78, 6, 4);
  rect(c, '#a8323a', x + 24, base - 96, 64, 22);
  rect(c, '#b8862e', x + 16, base - 104, 80, 8);
  rect(c, '#d9a441', x + 16, base - 104, 80, 2);
  rect(c, '#d9a441', x + 12, base - 107, 5, 3); rect(c, '#d9a441', x + 95, base - 107, 5, 3);
}

export interface TileView {
  taken: Set<number>;
  open: Set<number>;
  pressed: Set<number>;
  /** Tile index → when it was knocked from below. */
  bumps: Map<number, number>;
  /** Tile index of a checkpoint → its order; lit up to `cp`. */
  cpAt: Map<number, number>;
  cp: number;
  t: number;
}

export function drawTiles(c: C, lv: Level, camX: number, W: number, v: TileView) {
  const c0 = Math.max(0, Math.floor(camX / T) - 1);
  const c1 = Math.min(lv.w - 1, Math.floor((camX + W) / T) + 1);
  for (let col = c0; col <= c1; col++) {
    for (let r = 0; r < ROWS; r++) {
      const i = r * lv.w + col;
      const ch = lv.tiles[i];
      if (ch === '.') continue;
      const x = Math.round(col * T - camX);
      let y = r * T;
      const bumped = v.bumps.get(i);
      if (bumped !== undefined && v.t - bumped < 0.15) y -= 3;
      switch (ch) {
        case '#': {
          const above = tileAt(lv, col, r - 1);
          if (above !== '#') {
            rect(c, '#8e3426', x, y, T, T);
            rect(c, '#d8643f', x, y, T, 3);
            rect(c, '#b54a32', x, y + 3, T, 2);
            for (let k = 0; k < 4; k++) { rect(c, '#6e271d', x + k * 4 + 1, y + 5, 1, 11); rect(c, '#a8412f', x + k * 4 + 2, y + 8, 2, 2); }
          } else {
            rect(c, '#d4b07a', x, y, T, T);
            rect(c, '#b9935f', x, y + 7, T, 1);
            rect(c, '#b9935f', x, y + 15, T, 1);
            rect(c, '#b9935f', x + (r % 2 ? 4 : 12), y, 1, 7);
            rect(c, '#b9935f', x + (r % 2 ? 12 : 4), y + 8, 1, 7);
          }
          if (tileAt(lv, col - 1, r) !== '#') rect(c, '#6e4a2c', x, y, 1, T);
          if (tileAt(lv, col + 1, r) !== '#') rect(c, '#6e4a2c', x + T - 1, y, 1, T);
          break;
        }
        case 'B':
          rect(c, '#9a4a35', x, y, T, T);
          rect(c, '#5e2a1e', x, y + 7, T, 1); rect(c, '#5e2a1e', x, y + 15, T, 1);
          rect(c, '#5e2a1e', x + (r % 2 ? 4 : 12), y, 1, 7); rect(c, '#5e2a1e', x + (r % 2 ? 12 : 4), y + 8, 1, 7);
          rect(c, '#b8604a', x, y, T, 1);
          break;
        case '?':
          if (v.taken.has(i)) {
            rect(c, '#3a2618', x, y, T, T);
            rect(c, '#5a3b26', x + 1, y + 1, T - 2, T - 2);
          } else {
            const glow = 0.75 + 0.25 * Math.sin(v.t * 5 + col);
            rect(c, '#f2c14e', x, y, T, T);
            rect(c, '#b8322a', x + 2, y + 2, 12, 12);
            c.globalAlpha = glow;
            rect(c, '#ffd36b', x + 6, y + 4, 4, 1);
            rect(c, '#ff9e3d', x + 5, y + 5, 6, 6);
            rect(c, '#ffd36b', x + 6, y + 6, 4, 3);
            c.globalAlpha = 1;
            rect(c, '#ffd36b', x + 7, y + 11, 2, 2);
          }
          break;
        case '=':
          rect(c, '#7b4a24', x, y, T, 4);
          rect(c, '#a86a35', x, y, T, 1);
          rect(c, '#5a3418', x + 2, y + 4, 2, 5);
          rect(c, '#5a3418', x + 12, y + 4, 2, 5);
          break;
        case '^':
          c.fillStyle = '#cfd6e0';
          for (let k = 0; k < 4; k++) {
            c.beginPath(); c.moveTo(x + k * 4, y + 16); c.lineTo(x + k * 4 + 2, y + 7); c.lineTo(x + k * 4 + 4, y + 16); c.fill();
          }
          rect(c, '#5b5f6b', x, y + 14, T, 2);
          break;
        case '~': {
          rect(c, '#24557e', x, y, T, T);
          if (tileAt(lv, col, r - 1) !== '~') {
            for (let k = 0; k < T; k++) {
              const wy = y + 1 + Math.round(Math.sin((col * T + k) * 0.35 + v.t * 3));
              rect(c, '#5fa8d3', x + k, wy, 1, 2);
            }
            rect(c, '#1b4466', x, y + 6, T, 1);
          }
          break;
        }
        case 'D': {
          const open = v.open.has(lv.gates.get(i) ?? 0);
          c.globalAlpha = open ? 0.22 : 1;
          rect(c, '#6b3f1d', x + 1, y, 14, T);
          for (let k = 0; k < 3; k++) rect(c, '#8d5a2b', x + 2 + k * 5, y, 3, T);
          rect(c, '#e0b84a', x + 3, y + 3, 1, 1); rect(c, '#e0b84a', x + 12, y + 11, 1, 1);
          c.globalAlpha = 1;
          break;
        }
        case 'P': {
          const on = v.pressed.has(i);
          rect(c, '#5b4a33', x, y + 15, T, 1);
          rect(c, on ? '#f2c14e' : '#a99a78', x + 1, y + (on ? 13 : 11), 14, on ? 2 : 4);
          if (!on && Math.sin(v.t * 4) > 0) rect(c, '#f2c14e', x + 7, y + 12, 2, 1);
          break;
        }
        case 'C': {
          const lit = (v.cpAt.get(i) ?? 99) <= v.cp;
          rect(c, '#5a3a22', x + 7, y - 14, 2, 30);
          rect(c, '#5a3a22', x + 7, y - 16, 6, 2);
          if (lit) {
            c.fillStyle = 'rgba(255,140,80,0.25)';
            c.beginPath(); c.arc(x + 12, y - 8, 10, 0, Math.PI * 2); c.fill();
          }
          rect(c, lit ? '#e2402e' : '#5b4b4b', x + 9, y - 13, 7, 9);
          rect(c, '#f2c14e', x + 9, y - 14, 7, 1); rect(c, '#f2c14e', x + 9, y - 4, 7, 1);
          break;
        }
        case 'G': {
          rect(c, '#d9d2c0', x + 7, y - 88, 2, 104);
          rect(c, '#f2c14e', x + 6, y - 92, 4, 4);
          for (let k = 0; k < 18; k++) {
            const wy = Math.round(y - 86 + Math.sin(v.t * 6 - k * 0.5) * 1.5);
            rect(c, '#f2c14e', x + 9 + k, wy, 1, 12);
            rect(c, '#c8352b', x + 9 + k, wy + 4, 1, 4);
          }
          break;
        }
        case 'J':
          rect(c, '#3f3f46', x + 2, y + 13, 12, 3);
          for (let k = 0; k < 3; k++) rect(c, '#c0c6cf', x + (k % 2 ? 4 : 3), y + 6 + k * 2, 9, 1);
          rect(c, '#d8402e', x + 1, y + 3, 14, 3);
          rect(c, '#ff7a5e', x + 1, y + 3, 14, 1);
          break;
        case 'o': {
          if (v.taken.has(i)) break;
          drawCoin(c, x + 8, y + 3, v.t + col * 0.15);
          break;
        }
      }
    }
  }
}

export function drawCoin(c: C, cx: number, y: number, t: number) {
  const w = Math.max(2, Math.round(Math.abs(Math.cos(t * 5)) * 10));
  const x = Math.round(cx - w / 2);
  rect(c, '#c8901f', x, y, w, 10);
  rect(c, '#f7c948', x, y, w, 9);
  if (w > 4) rect(c, '#fff1a8', x + 1, y + 1, w - 4, 2);
}

export function drawBoat(c: C, b: Boat, bx: number, camX: number) {
  const x = Math.round(bx - camX), y = b.y;
  rect(c, '#a0652e', x, y, b.w, 2);
  rect(c, '#5e3519', x + 1, y + 2, b.w - 2, 4);
  rect(c, '#4a2913', x + 4, y + 6, b.w - 8, 3);
  rect(c, '#3a2010', x + 10, y + 9, b.w - 20, 2);
  rect(c, '#5a3418', x + b.w - 5, y - 9, 1, 9);
  rect(c, '#ff6b4a', x + b.w - 7, y - 12, 5, 4);
}

/** A runner in a nón lá, 16 wide, feet at the bottom of their 12×20 box. */
export function drawRunner(c: C, x: number, y: number, o: { color: string; facing: number; run: number; ground: boolean; dead: boolean; name?: string }) {
  const ox = Math.round(x) - 2;
  const oy = Math.round(y);
  c.save();
  if (o.dead) { c.translate(0, oy * 2 + PLAYER_H); c.scale(1, -1); }
  // The hat.
  [2, 6, 10, 14, 16].forEach((w, row) => rect(c, row === 4 ? '#c9b47c' : '#e9d8a6', ox + (16 - w) / 2, oy + row, w, 1));
  // The face.
  rect(c, '#f2c58f', ox + 4, oy + 5, 8, 5);
  rect(c, '#2a1a12', ox + (o.facing > 0 ? 9 : 5), oy + 6, 2, 2);
  // The áo, and an arm swinging.
  rect(c, o.color, ox + 3, oy + 10, 10, 7);
  rect(c, 'rgba(255,255,255,0.25)', ox + 6, oy + 10, 4, 1);
  const phase = Math.floor(o.run * 10) % 2;
  const arm = o.ground ? (o.run > 0 ? (phase ? 1 : -1) : 0) : -2;
  rect(c, '#f2c58f', ox + (o.facing > 0 ? 12 : 2), oy + 12 + arm, 2, 3);
  // Legs.
  const pants = '#2d2a3a';
  if (!o.ground) { rect(c, pants, ox + 4, oy + 17, 3, 2); rect(c, pants, ox + 9, oy + 16, 3, 2); }
  else if (o.run > 0) { rect(c, pants, ox + 4 + (phase ? -1 : 1), oy + 17, 3, 3); rect(c, pants, ox + 9 + (phase ? 1 : -1), oy + 17, 3, 3); }
  else { rect(c, pants, ox + 4, oy + 17, 3, 3); rect(c, pants, ox + 9, oy + 17, 3, 3); }
  c.restore();
  if (o.name && !o.dead) {
    c.font = 'bold 8px ui-monospace, monospace';
    c.textAlign = 'center';
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillText(o.name, ox + 8 + 1, oy - 3 + 1);
    c.fillStyle = o.color;
    c.fillText(o.name, ox + 8, oy - 3);
  }
}

export function drawEnemy(c: C, kind: EnemyKind, x0: number, y0: number, dir: number, air: boolean, t: number) {
  const x = Math.round(x0), y = Math.round(y0);
  if (kind === 'walker') {
    const ph = Math.floor(t * 8) % 2;
    rect(c, '#1b1222', x + 2 + ph, y + 9, 2, 2); rect(c, '#1b1222', x + 6 - ph, y + 9, 2, 2); rect(c, '#1b1222', x + 10 + ph, y + 9, 2, 2);
    rect(c, '#3c2a5c', x + 1, y + 3, 12, 7); rect(c, '#3c2a5c', x + 3, y + 1, 8, 2);
    rect(c, '#7d62b3', x + 4, y + 2, 3, 1); rect(c, '#7d62b3', x + 3, y + 4, 2, 2);
    rect(c, '#22183a', x + 7, y + 2, 1, 8);
    rect(c, '#22183a', dir > 0 ? x + 12 : x - 1, y + 5, 3, 4);
    rect(c, '#ffe066', dir > 0 ? x + 13 : x, y + 6, 1, 1);
  } else {
    rect(c, '#4f9a35', x + 1, y + 5, 12, 6); rect(c, '#4f9a35', x + 3, y + 3, 8, 2);
    rect(c, '#a6d36b', x + 4, y + 8, 6, 3);
    rect(c, '#4f9a35', x + 2, y, 4, 4); rect(c, '#4f9a35', x + 8, y, 4, 4);
    rect(c, '#fff', x + 3, y + 1, 2, 2); rect(c, '#fff', x + 9, y + 1, 2, 2);
    rect(c, '#111', x + (dir > 0 ? 4 : 3), y + 1, 1, 1); rect(c, '#111', x + (dir > 0 ? 10 : 9), y + 1, 1, 1);
    if (air) { rect(c, '#3d7a28', x - 1, y + 10, 3, 2); rect(c, '#3d7a28', x + 12, y + 10, 3, 2); }
    else { rect(c, '#3d7a28', x + 1, y + 11, 4, 1); rect(c, '#3d7a28', x + 9, y + 11, 4, 1); }
  }
}

export function drawSquashed(c: C, kind: EnemyKind, x: number, y: number, h: number) {
  rect(c, kind === 'walker' ? '#3c2a5c' : '#4f9a35', Math.round(x) + 1, Math.round(y) + h - 3, 12, 3);
}

/** An arrow at the screen's edge toward a partner who's out of view. */
export function drawEdgeArrow(c: C, W: number, sx: number, sy: number, color: string) {
  const left = sx < 0;
  const x = left ? 4 : W - 4;
  const y = Math.max(12, Math.min(VIEW_H - 12, sy));
  c.fillStyle = color;
  c.beginPath();
  if (left) { c.moveTo(x, y); c.lineTo(x + 7, y - 5); c.lineTo(x + 7, y + 5); }
  else { c.moveTo(x, y); c.lineTo(x - 7, y - 5); c.lineTo(x - 7, y + 5); }
  c.fill();
}
