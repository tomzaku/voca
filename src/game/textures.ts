// Texture loading for the world scene.
//
// Everyone in the world — the buddy, the villager at each collection, the one
// at each feature building — is drawn from the Sunnyside pack's layered human,
// composed into one small atlas by scripts/compose-villagers.mjs: seven looks
// (a bald `base` plus six hairstyles) × a 9-frame idle and an 8-frame walk.
//
// The pack draws that character from a SINGLE front-facing view; there is no
// up/down/left/right art. Facing is therefore approximated: the scene mirrors
// for left and reuses the front view for up and down.

import Phaser from 'phaser';
import type { AnimalId } from '../lib/companion';

export type BuddyDir = 'down' | 'up' | 'left' | 'right';

export const VILLAGERS_KEY = 'villagers';
/** Both atlas dimensions — the frames are square, feet on the bottom edge. */
export const VILLAGER_FRAME = 20;

/** Keep in step with LOOKS in scripts/compose-villagers.mjs. */
export const VILLAGER_LOOKS = [
  'base', 'bowlhair', 'curlyhair', 'longhair', 'mophair', 'shorthair', 'spikeyhair',
] as const;
export type VillagerLook = (typeof VILLAGER_LOOKS)[number];

type VillagerClip = 'idle' | 'walk';
const CLIP_FRAMES: Record<VillagerClip, number> = { idle: 9, walk: 8 };
const CLIP_RATE: Record<VillagerClip, number> = { idle: 7, walk: 10 };

/** Queue the villager atlas (call from a scene's preload). */
export function loadVillagers(scene: Phaser.Scene): void {
  if (scene.textures.exists(VILLAGERS_KEY)) return;
  const base = import.meta.env.BASE_URL;
  scene.load.atlas(
    VILLAGERS_KEY,
    `${base}game/characters/villagers.png`,
    `${base}game/characters/villagers.json`,
  );
}

/** Ensure a look's clip exists and return its animation key. */
export function villagerAnim(scene: Phaser.Scene, look: VillagerLook, clip: VillagerClip): string {
  const key = `villager-${look}-${clip}`;
  if (!scene.anims.exists(key)) {
    scene.anims.create({
      key,
      frames: Array.from({ length: CLIP_FRAMES[clip] }, (_, i) => ({
        key: VILLAGERS_KEY, frame: `${look}-${clip}-${i}`,
      })),
      frameRate: CLIP_RATE[clip],
      repeat: -1,
    });
  }
  return key;
}

/** Pick a look deterministically, so a station keeps the same face on rebuild. */
export function villagerLookFor(index: number): VillagerLook {
  return VILLAGER_LOOKS[index % VILLAGER_LOOKS.length];
}

/** What walks the map. The pack ships one character, so the companion animal
 *  only picks the name — every buddy is drawn as a villager. */
export type BuddyLook = { kind: 'animal'; id: AnimalId };

/** Everything the scene needs to load and animate the buddy. */
export interface BuddySpec {
  key: string;
  look: VillagerLook;
  rates: { idle: number; run: number };
  /** Multiplier that puts the art at the map's on-screen tile scale. */
  baseScale: number;
  load: (scene: Phaser.Scene) => void;
}

export function buddySpec(_look: BuddyLook): BuddySpec {
  return {
    key: VILLAGERS_KEY,
    // The player is the bald `base` villager, so the hairstyles read as other
    // people rather than as copies of you.
    look: 'base',
    rates: { idle: CLIP_RATE.idle, run: CLIP_RATE.walk },
    // The scene multiplies this by (1.3 + stage/10); 2/1.3 lands the 20px art
    // at 40px on stage 0, matching the map's 2× tile scale.
    baseScale: 2 / 1.3,
    load: loadVillagers,
  };
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
