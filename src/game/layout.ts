// Pure world-layout geometry: no Phaser, no React, unit-testable.
//
// Gather-style map: two walled rooms stacked vertically, each its own biome —
// PUBLIC (forest) with your and joined collections, SYSTEM (desert) with the
// level collections. Stations sit on a grid inside each room; the buddy walks
// freely inside the rooms and crosses between them through a doorway in the
// shared wall. No roads.

import type { WorldStation } from './types';

export const SPEED = 360;   // buddy speed, px/s
export const REACH = 95;    // distance at which a station "opens"
export const WALL = 8;      // wall stroke width

const CELL_W = 170;         // station grid cell
const CELL_H = 160;
const ROOM_PAD_X = 55;      // horizontal inset of the station grid
const ROOM_TOP = 96;        // room space above the first grid row (label + air)
const ROOM_BOTTOM = 46;
const GAP_V = 84;           // vertical gap between the two rooms
const DOOR_W = 120;

export type ZoneId = 'public' | 'system';
export type ThemeId = 'forest' | 'desert';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Room {
  zone: ZoneId;
  theme: ThemeId;
  label: string;
  rect: Rect;
  /** Walkable area (inside the walls). */
  inner: Rect;
}

export interface PlacedStation extends WorldStation {
  x: number;
  y: number;
}

export interface WorldLayout {
  worldW: number;
  worldH: number;
  spawn: { x: number; y: number };
  rooms: Room[];
  /** Walkable corridor overlapping both rooms through the shared walls. */
  door: Rect;
  placed: PlacedStation[];
  /** Union of walkable rects: room interiors + door. */
  walk: Rect[];
}

const inset = (r: Rect, by: number): Rect => ({
  x: r.x + by,
  y: r.y + by,
  w: r.w - by * 2,
  h: r.h - by * 2,
});

export const rectContains = (r: Rect, x: number, y: number): boolean =>
  x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/** Nearest point inside any of the rects to (x, y). */
export function clampToRects(rects: Rect[], x: number, y: number): { x: number; y: number } {
  let best = { x, y };
  let bestD = Infinity;
  for (const r of rects) {
    const px = Math.min(Math.max(x, r.x), r.x + r.w);
    const py = Math.min(Math.max(y, r.y), r.y + r.h);
    const d = Math.hypot(x - px, y - py);
    if (d < bestD) {
      bestD = d;
      best = { x: px, y: py };
    }
  }
  return best;
}

export function computeLayout(stations: WorldStation[], viewW: number, viewH: number): WorldLayout {
  const pub = stations.filter((s) => s.kind !== 'level');
  const sys = stations.filter((s) => s.kind === 'level');

  const roomW = Math.max(400, Math.min(viewW - 70, 1300));
  const usable = roomW - ROOM_PAD_X * 2;
  const cols = Math.max(1, Math.floor(usable / CELL_W));
  const roomHFor = (n: number) => ROOM_TOP + Math.max(Math.ceil(n / cols), 1) * CELL_H + ROOM_BOTTOM;

  const hA = roomHFor(pub.length);
  const hB = roomHFor(sys.length);
  const contentH = hA + GAP_V + hB;

  const worldW = Math.max(viewW, roomW + 60);
  const worldH = Math.max(viewH, contentH + 56);
  const x0 = Math.round((worldW - roomW) / 2);
  const y0 = Math.round((worldH - contentH) / 2);

  const mkRoom = (zone: ZoneId, theme: ThemeId, label: string, y: number, h: number): Room => {
    const rect = { x: x0, y, w: roomW, h };
    return { zone, theme, label, rect, inner: inset(rect, WALL + 10) };
  };
  const roomA = mkRoom('public', 'forest', 'PUBLIC', y0, hA);
  const roomB = mkRoom('system', 'desert', 'SYSTEM', y0 + hA + GAP_V, hB);

  const midX = x0 + Math.round(roomW / 2);
  const door: Rect = {
    x: midX - DOOR_W / 2,
    y: roomA.rect.y + roomA.rect.h - 30,
    w: DOOR_W,
    h: GAP_V + 60,
  };

  const placed: PlacedStation[] = [];
  const layoutRoom = (room: Room, list: WorldStation[]) => {
    list.forEach((s, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      placed.push({
        ...s,
        x: Math.round(room.rect.x + ROOM_PAD_X + (c + 0.5) * (usable / cols)),
        y: Math.round(room.rect.y + ROOM_TOP + (r + 0.5) * CELL_H + Math.sin(placed.length * 2.3) * 8),
      });
    });
  };
  layoutRoom(roomA, pub);
  layoutRoom(roomB, sys);

  return {
    worldW,
    worldH,
    spawn: { x: midX, y: roomA.rect.y + ROOM_TOP - 26 },
    rooms: [roomA, roomB],
    door,
    placed,
    walk: [roomA.inner, roomB.inner, door],
  };
}
