// Texture loading for the world scene.
//
// The buddy is the epic rpg pack's four-directional player, cropped and packed
// into one strip by scripts/compose-buddy.mjs: frames 0–15 are the idles (4 per
// direction) and 16–31 the walks, both in PLAYER_DIR_ROW order. Every facing is
// real art — nothing is mirrored or synthesized.

import Phaser from 'phaser';
import type { AnimalId } from '../lib/companion';

export type BuddyDir = 'down' | 'up' | 'left' | 'right';

const PLAYER_KEY = 'buddy-player';
const PLAYER_FRAME = { w: 42, h: 54 };
const PLAYER_PER_DIR = 4;
const PLAYER_WALK_OFFSET = 16;
const PLAYER_DIR_ROW: Record<BuddyDir, number> = { down: 0, left: 1, up: 2, right: 3 };

/** What walks the map. The pack ships one character, so the companion animal
 *  only picks the name — every buddy is drawn as the explorer. */
export type BuddyLook = { kind: 'animal'; id: AnimalId };

/** Everything the scene needs to load and animate a buddy look. */
export interface BuddySpec {
  key: string;
  /** Animation frame lists per direction. */
  anims: Record<BuddyDir, { idle: number[]; run: number[] }>;
  rates: { idle: number; run: number };
  /** Multiplier that puts this sheet at the animals' on-screen size. */
  baseScale: number;
  load: (scene: Phaser.Scene) => void;
  /** Post-load step (create()): builds textures that need the loaded images. */
  prepare?: (scene: Phaser.Scene) => void;
}

export function buddySpec(_look: BuddyLook): BuddySpec {
  // One character for everyone, with real per-direction art.
  const anims = {} as BuddySpec['anims'];
  for (const [dir, row] of Object.entries(PLAYER_DIR_ROW) as [BuddyDir, number][]) {
    const frames = Array.from({ length: PLAYER_PER_DIR }, (_, i) => row * PLAYER_PER_DIR + i);
    anims[dir] = { idle: frames, run: frames.map((f) => f + PLAYER_WALK_OFFSET) };
  }
  return {
    key: PLAYER_KEY,
    anims,
    rates: { idle: 5, run: 10 },
    // The scene multiplies this by (1.3 + stage/10), so 1/1.3 renders the art
    // pixel-perfect at stage 0 — 54px tall against 32px tiles, as drawn.
    baseScale: 1 / 1.3,
    load: (scene) => {
      if (scene.textures.exists(PLAYER_KEY)) return;
      scene.load.spritesheet(PLAYER_KEY, `${import.meta.env.BASE_URL}game/buddy/player.png`, {
        frameWidth: PLAYER_FRAME.w,
        frameHeight: PLAYER_FRAME.h,
      });
    },
  };
}

// ── Station monsters ── Each collection appears as a little monster from the
// same pack (64×64 sheets, identical direction/frame layout as the buddies).
// Public collections get the cuddly ones; levels get progressively scarier.

export const CUTE_MONSTERS = ['racoon', 'panda', 'owl', 'butterfly', 'mouse', 'axolot', 'mole', 'bear'] as const;
export const SCARY_MONSTERS = ['slime', 'mushroom', 'kappa', 'lizard', 'snake', 'cyclope', 'skull', 'flam', 'dragon', 'trex'] as const;

export type MonsterId = (typeof CUTE_MONSTERS | typeof SCARY_MONSTERS)[number];

export const MONSTER_FRAME = 16;

export function monsterTextureKey(monster: MonsterId): string {
  return `monster-${monster}`;
}

/** Queue every station-monster sheet (call from a scene's preload). */
export function loadMonsterTextures(scene: Phaser.Scene): void {
  for (const m of [...CUTE_MONSTERS, ...SCARY_MONSTERS]) {
    const key = monsterTextureKey(m);
    if (scene.textures.exists(key)) continue;
    scene.load.spritesheet(key, `${import.meta.env.BASE_URL}game/stations/${m}.png`, {
      frameWidth: MONSTER_FRAME,
      frameHeight: MONSTER_FRAME,
    });
  }
}

/** Tileable grass speckle, drawn once per theme. */
export function ensureDotsTexture(scene: Phaser.Scene, key: string, dotRgba: string): void {
  if (scene.textures.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, 34, 34);
  if (!canvas) return;
  const ctx = canvas.context;
  ctx.fillStyle = dotRgba;
  ctx.beginPath();
  ctx.arc(8, 8, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(25, 25, 1.5, 0, Math.PI * 2);
  ctx.fill();
  canvas.refresh();
}
