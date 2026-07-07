// Texture loading for the world scene.
//
// Buddy sprites are 2-frame 16×16 pixel-art flipbooks (facing right) from the
// CC0 Ninja Adventure pack — see public/game/animals/README.md for the
// mapping and license. Richer sheets (4-direction walks, skill effects) can
// drop in here later without touching the scene.

import Phaser from 'phaser';
import type { AnimalId } from '../lib/companion';

export const BUDDY_FRAME = 16;

const SHEETS: Record<AnimalId, string> = {
  fox: 'fox.png',
  owl: 'owl.png',
  cat: 'cat.png',
  turtle: 'turtle.png',
};

export function buddyTextureKey(animalId: AnimalId): string {
  return `buddy-${animalId}`;
}

/** Queue the buddy's spritesheet (call from a scene's preload). */
export function loadBuddyTexture(scene: Phaser.Scene, animalId: AnimalId): void {
  const key = buddyTextureKey(animalId);
  if (scene.textures.exists(key)) return;
  scene.load.spritesheet(key, `${import.meta.env.BASE_URL}game/animals/${SHEETS[animalId]}`, {
    frameWidth: BUDDY_FRAME,
    frameHeight: BUDDY_FRAME,
  });
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
