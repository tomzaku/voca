// Pure world-layout geometry: no Phaser, no React, unit-testable.
// The road snakes like lines of text: across a row, down at the edge, back the
// other way across the next row. Stations per row adapt to the view width so
// the world always fills the whole viewport.

import type { WorldStation } from './types';

export const GAP_X = 230;          // horizontal spacing between stations
export const GAP_Y = 240;          // vertical spacing between rows
export const TURN_EXT = 120;       // road overshoot past a row's last station at a turn
export const EDGE = TURN_EXT + 80; // margin kept clear of the world edge for turns
export const ROAD_W = 64;          // road stroke width
export const ROAD_R = ROAD_W / 2;  // how far off the centerline the buddy may step
export const SPEED = 250;          // buddy speed, px/s
export const REACH = 105;          // distance at which a station "opens"
export const SPAWN_X = 90;

export interface PlacedStation extends WorldStation {
  x: number;
  y: number;
  /** First station of its kind — carries the zone label. */
  zoneStart: boolean;
}

export interface WorldLayout {
  worldW: number;
  worldH: number;
  spawn: { x: number; y: number };
  placed: PlacedStation[];
  /** Road centerline: spawn → across each row → down at the edge → back across. */
  pathPts: number[][];
}

/** Boustrophedon layout: even rows run left → right, odd rows right → left. */
export function computeLayout(stations: WorldStation[], viewW: number, viewH: number): WorldLayout {
  const perRow = Math.max(1, Math.floor((viewW - 2 * EDGE) / GAP_X) + 1);
  const rowCount = Math.max(1, Math.ceil(stations.length / perRow));
  const contentH = (rowCount - 1) * GAP_Y;
  const worldH = Math.max(viewH, contentH + 330);
  const baseY = Math.round((worldH - contentH) / 2);

  const cols = Math.min(perRow, Math.max(stations.length, 1));
  const rowSpan = (cols - 1) * GAP_X;
  const worldW = Math.max(viewW, rowSpan + 2 * EDGE);
  const baseX = Math.round((worldW - rowSpan) / 2);

  const placed: PlacedStation[] = stations.map((s, i) => {
    const row = Math.floor(i / perRow);
    const c = i % perRow;
    const col = row % 2 === 0 ? c : perRow - 1 - c;
    return {
      ...s,
      x: baseX + col * GAP_X,
      y: baseY + row * GAP_Y + Math.round(Math.sin(i * 2.3) * 14),
      zoneStart: i === 0 || stations[i - 1].kind !== s.kind,
    };
  });

  const pathPts: number[][] = [[SPAWN_X, baseY + 26]];
  placed.forEach((p, i) => {
    pathPts.push([p.x, p.y + 26]);
    const next = placed[i + 1];
    if (next && Math.floor(i / perRow) !== Math.floor((i + 1) / perRow)) {
      // Row change: overshoot past the row's last station, turn straight down.
      const dir = Math.floor(i / perRow) % 2 === 0 ? 1 : -1;
      pathPts.push([p.x + dir * TURN_EXT, p.y + 26]);
      pathPts.push([p.x + dir * TURN_EXT, next.y + 26]);
    }
  });

  return { worldW, worldH, spawn: { x: SPAWN_X, y: baseY + 26 }, placed, pathPts };
}

/** Closest point on the road centerline to (x, y), plus its distance. */
export function closestOnPath(pts: number[][], x: number, y: number): { x: number; y: number; d: number } {
  let bx = pts[0][0], by = pts[0][1], bd = Math.hypot(x - bx, y - by);
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.min(Math.max(((x - x1) * dx + (y - y1) * dy) / len2, 0), 1);
    const px = x1 + t * dx, py = y1 + t * dy;
    const d = Math.hypot(x - px, y - py);
    if (d < bd) { bd = d; bx = px; by = py; }
  }
  return { x: bx, y: by, d: bd };
}

/** Pull (x, y) back inside the road if it strayed further than ROAD_R. */
export function snapToRoad(pts: number[][], x: number, y: number): { x: number; y: number } {
  const c = closestOnPath(pts, x, y);
  if (c.d <= ROAD_R) return { x, y };
  const k = ROAD_R / c.d;
  return { x: c.x + (x - c.x) * k, y: c.y + (y - c.y) * k };
}
