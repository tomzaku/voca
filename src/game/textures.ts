// Texture loading for the world scene.
//
// Buddy sprites are 32×32 four-direction animals from PixelFight's CC0
// woodland pack: one sheet per buddy with 4-frame animated idles and 8-frame
// runs, per direction. Frame ranges below come from the pack's Aseprite tags —
// see public/game/animals/README.md.

import Phaser from 'phaser';
import type { AnimalId } from '../lib/companion';

export const BUDDY_FRAME = 32;
export type BuddyDir = 'down' | 'up' | 'left' | 'right';

/** [first, last] frame index per animation, from the pack's Aseprite tags. */
export const BUDDY_ANIMS: Record<BuddyDir, { idle: [number, number]; run: [number, number] }> = {
  down:  { idle: [0, 3],   run: [20, 27] },
  right: { idle: [4, 7],   run: [36, 43] },
  left:  { idle: [8, 11],  run: [28, 35] },
  up:    { idle: [12, 15], run: [44, 51] },
};

export function buddyTextureKey(animalId: AnimalId): string {
  return `buddy-${animalId}`;
}

/** Queue the buddy's spritesheet (call from a scene's preload). */
export function loadBuddyTexture(scene: Phaser.Scene, animalId: AnimalId): void {
  const key = buddyTextureKey(animalId);
  if (scene.textures.exists(key)) return;
  scene.load.spritesheet(key, `${import.meta.env.BASE_URL}game/animals/${animalId}.png`, {
    frameWidth: BUDDY_FRAME,
    frameHeight: BUDDY_FRAME,
  });
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
