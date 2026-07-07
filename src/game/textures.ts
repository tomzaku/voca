// Texture loading for the world scene.
//
// Buddy sprites are 16×16 four-direction characters from the CC0 Ninja
// Adventure pack. Direction order in both sheets is down, up, left, right:
// the walk sheet is 4 direction columns × 4 frame rows, the idle sheet is one
// frame per direction. See public/game/animals/README.md for the mapping.

import Phaser from 'phaser';
import type { AnimalId } from '../lib/companion';

export const BUDDY_FRAME = 16;

/** Direction order of the sheet columns. */
export const BUDDY_DIRS = ['down', 'up', 'left', 'right'] as const;
export type BuddyDir = (typeof BUDDY_DIRS)[number];

export function buddyTextureKey(animalId: AnimalId, sheet: 'idle' | 'walk'): string {
  return `buddy-${animalId}-${sheet}`;
}

/** Queue the buddy's idle + walk spritesheets (call from a scene's preload). */
export function loadBuddyTexture(scene: Phaser.Scene, animalId: AnimalId): void {
  for (const sheet of ['idle', 'walk'] as const) {
    const key = buddyTextureKey(animalId, sheet);
    if (scene.textures.exists(key)) continue;
    scene.load.spritesheet(key, `${import.meta.env.BASE_URL}game/animals/${animalId}-${sheet}.png`, {
      frameWidth: BUDDY_FRAME,
      frameHeight: BUDDY_FRAME,
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
