// Texture loading for the world scene.
//
// Buddy sprites are 32×32 four-direction animals from PixelFight's CC0
// woodland pack: one sheet per buddy with 4-frame animated idles and 8-frame
// runs, per direction. Frame ranges below come from the pack's Aseprite tags —
// see public/game/animals/README.md.

import Phaser from 'phaser';
import type { AnimalId } from '../lib/companion';
import {
  AVATAR_DIR_ROW, AVATAR_FRAME_H, AVATAR_FRAME_W, AVATAR_SHEET,
  avatarKey, avatarLayerNames, avatarLayerUrl, composeAvatar, type AvatarConfig,
} from '../lib/avatar';

export const BUDDY_FRAME = 32;
export type BuddyDir = 'down' | 'up' | 'left' | 'right';

/** What walks the map: the companion animal, or the customizable main
 *  character (base body + cloth/hair recolor + hat, see src/lib/avatar.ts). */
export type BuddyLook =
  | { kind: 'animal'; id: AnimalId }
  | { kind: 'avatar'; config: AvatarConfig };

/** [first, last] frame index per animation, from the pack's Aseprite tags. */
export const BUDDY_ANIMS: Record<BuddyDir, { idle: [number, number]; run: [number, number] }> = {
  down:  { idle: [0, 3],   run: [20, 27] },
  right: { idle: [4, 7],   run: [36, 43] },
  left:  { idle: [8, 11],  run: [28, 35] },
  up:    { idle: [12, 15], run: [44, 51] },
};

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

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

export function buddySpec(look: BuddyLook): BuddySpec {
  if (look.kind === 'avatar') {
    const cfg = look.config;
    const key = avatarKey(cfg);
    const layers = avatarLayerNames(cfg);
    const layerKey = (name: string) => `avatar-layer-${name}`;
    const cols = AVATAR_SHEET.columns;
    const anims = {} as BuddySpec['anims'];
    for (const [dir, row] of Object.entries(AVATAR_DIR_ROW) as [BuddyDir, number][]) {
      anims[dir] = {
        idle: [row * cols],
        run: Array.from({ length: cols - 1 }, (_, i) => row * cols + 1 + i),
      };
    }
    return {
      key,
      anims,
      rates: { idle: 1, run: 12 },
      baseScale: 0.8, // 64px LPC frames next to the 32px animals
      load: (scene) => {
        if (scene.textures.exists(key)) return;
        for (const name of layers) {
          if (!scene.textures.exists(layerKey(name))) {
            scene.load.image(layerKey(name), avatarLayerUrl(name));
          }
        }
      },
      prepare: (scene) => {
        if (scene.textures.exists(key)) return;
        const canvas = composeAvatar(layers.map(
          (name) => scene.textures.get(layerKey(name)).getSourceImage() as HTMLImageElement,
        ));
        // addSpriteSheet with a Texture source parses the frames in place.
        const texture = scene.textures.addCanvas(key, canvas);
        if (texture) {
          scene.textures.addSpriteSheet(key, texture, {
            frameWidth: AVATAR_FRAME_W,
            frameHeight: AVATAR_FRAME_H,
          });
        }
      },
    };
  }

  const key = `buddy-${look.id}`;
  const anims = {} as BuddySpec['anims'];
  for (const [dir, r] of Object.entries(BUDDY_ANIMS) as [BuddyDir, (typeof BUDDY_ANIMS)['down']][]) {
    anims[dir] = { idle: range(...r.idle), run: range(...r.run) };
  }
  return {
    key,
    anims,
    rates: { idle: 5, run: 14 },
    baseScale: 1,
    load: (scene) => {
      if (scene.textures.exists(key)) return;
      scene.load.spritesheet(key, `${import.meta.env.BASE_URL}game/animals/${look.id}.png`, {
        frameWidth: BUDDY_FRAME,
        frameHeight: BUDDY_FRAME,
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
