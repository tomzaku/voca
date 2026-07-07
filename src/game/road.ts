// Pure world-layout geometry: no Phaser, no React, unit-testable.
//
// The map is a ladder:            [A]------[B]
//                                      |
//                                 [C]------[D]
//                                      |
//                                 [E]------[F]
// Two stations per rung, connected by a vertical road through the middle.
// Rungs are grouped into two regions — Public (mine + joined) and System
// (levels) — with a banner and extra breathing room at each region start.

import type { WorldStation } from './types';

export const GAP_Y = 240;          // vertical spacing between rungs
export const REGION_PAD = 110;     // headroom above a region's first rung (banner lives here)
export const ROAD_W = 64;          // road stroke width
export const ROAD_R = ROAD_W / 2;  // how far off the centerline the buddy may step
export const SPEED = 250;          // buddy speed, px/s
export const REACH = 105;          // distance at which a station "opens"

export interface PlacedStation extends WorldStation {
  x: number;
  y: number;
}

export interface WorldBanner {
  label: string;
  region: 'public' | 'system';
  x: number;
  y: number;
}

export interface WorldLayout {
  worldW: number;
  worldH: number;
  spawn: { x: number; y: number };
  placed: PlacedStation[];
  /** Road centerline as one polyline (revisited segments are harmless). */
  pathPts: number[][];
  /** De-duplicated segments for the dashed centerline: [x1, y1, x2, y2]. */
  dashSegs: number[][];
  banners: WorldBanner[];
}

interface Rung {
  region: WorldBanner['region'];
  list: WorldStation[];
}

export function computeLayout(stations: WorldStation[], viewW: number, viewH: number): WorldLayout {
  const pub = stations.filter((s) => s.kind !== 'level');
  const sys = stations.filter((s) => s.kind === 'level');

  // Station columns sit either side of the center connector, squeezing on
  // narrow screens; the world is never narrower than the viewport.
  const colOff = Math.max(150, Math.min(250, Math.round((viewW - 260) / 2)));
  const worldW = Math.max(viewW, colOff * 2 + 320);
  const midX = Math.round(worldW / 2);

  const rungs: Rung[] = [];
  ([['public', pub], ['system', sys]] as const).forEach(([region, list]) => {
    for (let i = 0; i < list.length; i += 2) rungs.push({ region, list: list.slice(i, i + 2) });
  });

  // Vertical rhythm: banner headroom at each region start, then rungs.
  const rungY: number[] = [];
  const banners: WorldBanner[] = [];
  let cursor = 0;
  let prev: WorldBanner['region'] | null = null;
  for (const rung of rungs) {
    if (rung.region !== prev) {
      banners.push({
        label: rung.region === 'public' ? 'PUBLIC' : 'SYSTEM',
        region: rung.region,
        x: midX,
        y: cursor,
      });
      cursor += REGION_PAD;
      prev = rung.region;
    }
    rungY.push(cursor);
    cursor += GAP_Y;
  }
  const contentH = Math.max(cursor - GAP_Y, 0);
  const worldH = Math.max(viewH, contentH + 300);
  const baseY = Math.round((worldH - contentH) / 2);
  for (const b of banners) b.y += baseY - 22;

  if (rungs.length === 0) {
    const spawn = { x: midX, y: Math.round(worldH / 2) };
    return { worldW, worldH, spawn, placed: [], pathPts: [[spawn.x, spawn.y]], dashSegs: [], banners: [] };
  }

  const placed: PlacedStation[] = [];
  rungs.forEach((rung, r) => {
    const y = baseY + rungY[r];
    rung.list.forEach((s, i) => {
      placed.push({
        ...s,
        x: i === 0 ? midX - colOff : midX + colOff,
        y: y + Math.round(Math.sin(placed.length * 2.3) * 12),
      });
    });
  });

  // Road: spawn → across each rung → back to the middle → drop to the next.
  const spawn = { x: Math.max(70, midX - colOff - 150), y: baseY + rungY[0] + 26 };
  const pathPts: number[][] = [[spawn.x, spawn.y]];
  const dashSegs: number[][] = [];
  rungs.forEach((rung, r) => {
    const y = baseY + rungY[r] + 26;
    const left = midX - colOff;
    const right = rung.list.length > 1 ? midX + colOff : midX;
    pathPts.push([left, y], [right, y], [midX, y]);
    dashSegs.push([r === 0 ? spawn.x : left, y, right, y]);
    if (r + 1 < rungs.length) {
      const nextY = baseY + rungY[r + 1] + 26;
      pathPts.push([midX, nextY]);
      dashSegs.push([midX, y, midX, nextY]);
    }
  });

  return { worldW, worldH, spawn, placed, pathPts, dashSegs, banners };
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
