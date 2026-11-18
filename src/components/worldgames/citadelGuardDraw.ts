import { COLS, ENEMIES, PATHS, ROWS, T, TILES, TOWERS, W, H, type EnemyKind, type TowerKind } from '../../lib/citadelGuard';

// Citadel Guard's pixel art, in rectangles at the game's own resolution (the
// canvas is scaled up, pixelated): the fields outside Huế, the dirt road the
// monsters march along, the citadel gate they're after, the four towers and
// the five monsters.

type C = CanvasRenderingContext2D;
const rect = (c: C, color: string, x: number, y: number, w: number, h: number) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), w, h); };

export const OWNER_COLORS = ['#2fd38a', '#ff6b5a'] as const;

let ground: HTMLCanvasElement | null = null;

/** The fields, the road, the trees and the gate — the same every frame, so drawn once. */
function paintGround(): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d')!;
  for (let r = 0; r < ROWS; r++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * T, y = r * T;
      const v = TILES[r * COLS + col];
      rect(c, (col + r) % 2 ? '#4f8a3c' : '#4b8439', x, y, T, T);
      // Specks of lighter grass, the same on every visit.
      for (let k = 0; k < 4; k++) {
        const h = (col * 73 + r * 31 + k * 17) % 97;
        rect(c, '#6aa84f', x + (h % 14) + 1, y + ((h * 7) % 14) + 1, 1, 2);
      }
      if (v === 1) {
        rect(c, '#c8a46a', x, y, T, T);
        for (let k = 0; k < 3; k++) {
          const h = (col * 41 + r * 13 + k * 29) % 89;
          rect(c, '#b38f57', x + (h % 13) + 1, y + ((h * 5) % 13) + 1, 2, 1);
        }
      }
    }
  }
  // Road edges: a darker line where dirt meets grass.
  for (let r = 0; r < ROWS; r++) {
    for (let col = 0; col < COLS; col++) {
      if (TILES[r * COLS + col] !== 1) continue;
      const x = col * T, y = r * T;
      const grass = (cc: number, rr: number) => cc >= 0 && cc < COLS && rr >= 0 && rr < ROWS && TILES[rr * COLS + cc] !== 1 && TILES[rr * COLS + cc] !== 3;
      if (grass(col, r - 1)) rect(c, '#8f6f3f', x, y, T, 1);
      if (grass(col, r + 1)) rect(c, '#8f6f3f', x, y + T - 1, T, 1);
      if (grass(col - 1, r)) rect(c, '#8f6f3f', x, y, 1, T);
      if (grass(col + 1, r)) rect(c, '#8f6f3f', x + T - 1, y, 1, T);
    }
  }
  // Trees.
  for (let r = 0; r < ROWS; r++) {
    for (let col = 0; col < COLS; col++) {
      if (TILES[r * COLS + col] !== 2) continue;
      const x = col * T, y = r * T;
      rect(c, '#2d4a22', x + 3, y + 12, 10, 3);
      rect(c, '#6b4423', x + 7, y + 9, 2, 5);
      rect(c, '#2f6b2a', x + 2, y + 2, 12, 9);
      rect(c, '#3f8a36', x + 4, y + 1, 8, 8);
      rect(c, '#5aa84a', x + 5, y + 2, 3, 3);
    }
  }
  // The gate: a wall with a gatehouse and a two-tiered golden roof.
  const gx = 19 * T, top = 3 * T;
  rect(c, '#7a4a2e', gx - 2, top, T + 2, 7 * T);
  for (let k = 0; k < 7; k++) rect(c, '#5f3822', gx - 2, top + k * T + 7, T + 2, 1);
  rect(c, '#2a1810', gx + 1, 6 * T - 2, T - 1, T + 4);
  rect(c, '#b8862e', gx - 5, top - 6, T + 8, 6);
  rect(c, '#d9a441', gx - 5, top - 6, T + 8, 2);
  rect(c, '#a8323a', gx, top - 14, T - 2, 8);
  rect(c, '#d9a441', gx - 3, top - 18, T + 4, 4);
  rect(c, '#f2c14e', gx + 6, top - 26, 1, 8);
  rect(c, '#e2402e', gx + 7, top - 26, 6, 4);
  // Spawn marks where the lanes come in.
  for (const p of PATHS) {
    const s = p.pts[1];
    rect(c, 'rgba(0,0,0,0.25)', 0, s.y - 6, 4, 12);
  }
  return cv;
}

export function drawGround(c: C) {
  ground ??= paintGround();
  c.drawImage(ground, 0, 0);
}

export function drawTower(c: C, kind: TowerKind, level: number, col: number, row: number, owner: number, aim: number, t: number) {
  const x = col * T, y = row * T;
  // A stone base, the owner's pennant, the level as pips.
  rect(c, '#5f6670', x + 2, y + 9, 12, 6);
  rect(c, '#8a8f98', x + 2, y + 8, 12, 2);
  rect(c, '#3b4048', x + 2, y + 14, 12, 1);
  rect(c, OWNER_COLORS[owner] ?? OWNER_COLORS[0], x + 13, y + 1, 3, 2);
  rect(c, '#d9d2c0', x + 13, y + 1, 1, 7);
  for (let k = 0; k < level; k++) rect(c, '#f2c14e', x + 3 + k * 3, y + 11, 2, 2);
  const cx = x + 8, cy = y + 6;
  if (kind === 'archer') {
    rect(c, '#8a5a2b', x + 4, y + 4, 8, 5);
    rect(c, '#b5523b', x + 3, y + 2, 10, 2);
    rect(c, '#d8643f', x + 5, y + 1, 6, 1);
    rect(c, '#2a1a12', x + 7, y + 5, 2, 2);
  } else if (kind === 'cannon') {
    rect(c, '#3b3f46', x + 4, y + 4, 8, 5);
    const bx = cx + Math.cos(aim) * 5, by = cy + Math.sin(aim) * 5;
    c.strokeStyle = '#1f2227'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(bx, by); c.stroke();
    rect(c, '#6b7079', x + 6, y + 5, 4, 2);
  } else if (kind === 'frost') {
    const glow = 0.7 + 0.3 * Math.sin(t * 4 + col);
    rect(c, '#2b5f86', x + 5, y + 5, 6, 4);
    c.globalAlpha = glow;
    rect(c, '#9fe3ff', x + 6, y + 1, 4, 6);
    rect(c, '#dff7ff', x + 7, y, 2, 3);
    c.globalAlpha = 1;
  } else {
    rect(c, '#7a1f1f', x + 4, y + 5, 8, 4);
    c.save(); c.translate(cx, cy); c.rotate(aim + Math.PI / 2);
    rect(c, '#c8352b', -2, -6, 4, 7);
    rect(c, '#f2c14e', -2, -7, 4, 2);
    c.restore();
  }
}

export function drawEnemy(c: C, kind: EnemyKind, x0: number, y0: number, t: number, id: number, hpFrac: number, slowed: boolean) {
  const x = Math.round(x0), y = Math.round(y0);
  const ph = Math.floor(t * 8 + id) % 2;
  if (ENEMIES[kind].air) rect(c, 'rgba(0,0,0,0.25)', x - 4, y + 6, 8, 2);
  switch (kind) {
    case 'rat':
      rect(c, '#7d7d86', x - 4, y - 2, 8, 4); rect(c, '#9a9aa4', x - 3, y - 3, 5, 2);
      rect(c, '#f2a5b5', x + 4, y - 2, 1, 1); rect(c, '#111', x + 2, y - 2, 1, 1);
      rect(c, '#c9a0a8', x - 7, y - 1 + ph, 3, 1);
      rect(c, '#5d5d66', x - 3 + ph, y + 2, 1, 1); rect(c, '#5d5d66', x + 2 - ph, y + 2, 1, 1);
      break;
    case 'beetle':
      rect(c, '#1b1222', x - 4 + ph, y + 3, 1, 2); rect(c, '#1b1222', x + 3 - ph, y + 3, 1, 2);
      rect(c, '#6a3fb0', x - 4, y - 3, 8, 6); rect(c, '#a98bf0', x - 3, y - 3, 2, 2);
      rect(c, '#2b1650', x, y - 3, 1, 6); rect(c, '#2b1650', x - 2, y - 5, 4, 2);
      break;
    case 'crab':
      rect(c, '#a8323a', x - 6, y - 3, 12, 6); rect(c, '#d4504a', x - 5, y - 4, 10, 2);
      rect(c, '#7a1f24', x - 8, y - 4 + ph, 2, 3); rect(c, '#7a1f24', x + 6, y - 4 + ph, 2, 3);
      rect(c, '#e6e2d3', x - 3, y - 5, 1, 2); rect(c, '#e6e2d3', x + 2, y - 5, 1, 2);
      rect(c, '#5a1418', x - 5 + ph, y + 3, 1, 1); rect(c, '#5a1418', x + 4 - ph, y + 3, 1, 1);
      break;
    case 'moth': {
      const lift = ph ? -1 : 0;
      rect(c, '#e8dcc0', x - 7, y - 6 + lift, 5, 6 - lift); rect(c, '#e8dcc0', x + 2, y - 6 + lift, 5, 6 - lift);
      rect(c, '#b06ad8', x - 6, y - 4, 2, 2); rect(c, '#b06ad8', x + 4, y - 4, 2, 2);
      rect(c, '#8a6a4a', x - 1, y - 6, 2, 8);
      break;
    }
    case 'toad':
      rect(c, '#3d7a28', x - 11, y - 6, 22, 13); rect(c, '#4f9a35', x - 10, y - 8, 20, 12);
      rect(c, '#a6d36b', x - 6, y, 12, 4);
      rect(c, '#4f9a35', x - 9, y - 12, 6, 5); rect(c, '#4f9a35', x + 3, y - 12, 6, 5);
      rect(c, '#ffd23f', x - 8, y - 11, 3, 3); rect(c, '#ffd23f', x + 5, y - 11, 3, 3);
      rect(c, '#111', x - 7, y - 10, 1, 2); rect(c, '#111', x + 6, y - 10, 1, 2);
      rect(c, '#f2c14e', x - 5, y - 14, 10, 2);
      for (let k = 0; k < 3; k++) rect(c, '#f2c14e', x - 5 + k * 4, y - 16, 2, 2);
      break;
  }
  if (slowed) { c.globalAlpha = 0.35; rect(c, '#9fe3ff', x - 6, y - 6, 12, 12); c.globalAlpha = 1; }
  if (hpFrac < 1) {
    const w = kind === 'toad' ? 22 : 10;
    const top = kind === 'toad' ? y - 20 : y - 9;
    rect(c, 'rgba(0,0,0,0.6)', x - w / 2, top, w, 2);
    rect(c, hpFrac > 0.35 ? '#5fe07a' : '#ff5a3c', x - w / 2, top, Math.max(1, Math.round(w * hpFrac)), 2);
  }
}

/** A shot in flight, `k` of the way from tower to target. */
export function drawShot(c: C, kind: TowerKind, x0: number, y0: number, x1: number, y1: number, k: number) {
  const x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k;
  if (kind === 'archer') {
    const a = Math.atan2(y1 - y0, x1 - x0);
    c.strokeStyle = '#f2e6c8'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x - Math.cos(a) * 4, y - Math.sin(a) * 4); c.lineTo(x, y); c.stroke();
  } else if (kind === 'cannon') {
    const arc = Math.sin(k * Math.PI) * 6;
    rect(c, '#1f2227', x - 1.5, y - arc - 1.5, 3, 3);
    if (k > 0.85) { c.fillStyle = 'rgba(255,170,60,0.55)'; c.beginPath(); c.arc(x1, y1, TOWERS.cannon.splash! * T * (k - 0.6), 0, Math.PI * 2); c.fill(); }
  } else if (kind === 'frost') {
    rect(c, '#bdf0ff', x - 1, y - 1, 2, 2);
    rect(c, 'rgba(160,230,255,0.5)', x - 2, y - 2, 4, 4);
  } else {
    rect(c, '#ffd23f', x - 1, y - 1, 2, 2);
    rect(c, 'rgba(255,90,60,0.6)', x0 + (x1 - x0) * (k - 0.1) - 1, y0 + (y1 - y0) * (k - 0.1) - 1, 2, 2);
    if (k > 0.85) for (let i = 0; i < 6; i++) rect(c, ['#ffd23f', '#ff5a3c', '#fff'][i % 3], x1 + Math.cos(i) * 4 * (k - 0.5) * 3, y1 + Math.sin(i) * 4 * (k - 0.5) * 3, 1, 1);
  }
}

export function drawCursor(c: C, col: number, row: number, color: string, dashed = false) {
  c.strokeStyle = color; c.lineWidth = 1;
  c.setLineDash(dashed ? [2, 2] : []);
  c.strokeRect(col * T + 0.5, row * T + 0.5, T - 1, T - 1);
  c.setLineDash([]);
}

export function drawRange(c: C, col: number, row: number, tiles: number, ok: boolean) {
  c.fillStyle = ok ? 'rgba(255,255,255,0.10)' : 'rgba(255,80,80,0.12)';
  c.strokeStyle = ok ? 'rgba(255,255,255,0.45)' : 'rgba(255,80,80,0.5)';
  c.lineWidth = 1;
  c.beginPath(); c.arc((col + 0.5) * T, (row + 0.5) * T, tiles * T, 0, Math.PI * 2); c.fill(); c.stroke();
}
