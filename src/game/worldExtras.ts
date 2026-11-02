// Places added to Huế at runtime, on top of the painted map, the way the Tết
// decorations are (festiveDecor.ts): drawn as small pixel textures here rather
// than baked by scripts/generate-hue-map.mjs.
//
//   cailuong  a cải lương stage on Phố đi bộ, next to the street piano —
//             red curtains, a painted backdrop, two performers in costume
//   fortune   a fortune-stick table before Thiên Mụ's hall, by its incense
//   fireworks two launch pads on the citadel wall either side of Kỳ Đài, before
//             Ngọ Môn, where Huế fires its Tết fireworks — only while the Tết
//             decorations are up (festiveDecor.ts draws them)
//
// Each is also a "play" spot (WorldScene reads EXTRA_PLAYS with the map's own),
// so walking up offers its activity, like the piano does.

import Phaser from 'phaser';

/** The fireworks pads (drawn by festiveDecor.ts while Tết is up), in tiles: west and east of the flag tower. */
export const FIREWORKS_PADS = [{ x: 53.2, y: 41.4 }, { x: 57.3, y: 41.3 }];

/** The spots, in map tiles: where you stand to play. */
export const EXTRA_PLAYS: { game: string; x: number; y: number; festive?: boolean }[] = [
  { game: 'cailuong', x: 59.3, y: 64.75 },
  { game: 'fortune', x: 13.2, y: 48.4 },
  ...FIREWORKS_PADS.map((p) => ({ game: 'fireworks', ...p, festive: true })),
];

/** Where the stage stands: its front edge's centre, in tiles. */
const STAGE = { x: 59.3, y: 64.2 };
/** What the stage covers, in tiles — the Tết lantern strings keep clear of it. */
export const STAGE_AREA = { x0: STAGE.x - 2, x1: STAGE.x + 2, y0: STAGE.y - 3, y1: STAGE.y };
/** The fortune table, beside Thiên Mụ's door. */
const ALTAR = { x: 13.2, y: 48.0 };

export interface ExtrasContext {
  scene: Phaser.Scene;
  tilePx: number;
  scale: number;
  depth: { ground: number; actors: number };
  tinted: (Phaser.GameObjects.Sprite | Phaser.GameObjects.Image)[];
  /** A villager sprite in a look, idle — the scene's own. */
  performer: (x: number, y: number, look: number) => Phaser.GameObjects.Sprite;
  calm: boolean;
}

function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (px: (x: number, y: number, w: number, h: number, col: string) => void) => void) {
  if (scene.textures.exists(key)) return;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d')!;
  draw((x, y, w2, h2, col) => { c.fillStyle = col; c.fillRect(x, y, w2, h2); });
  scene.textures.addCanvas(key, cv)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

function makeTextures(scene: Phaser.Scene) {
  // The stage, 56×44 art pixels: a raised wooden floor with steps, red
  // curtains drawn back either side, a gold valance, and a painted backdrop
  // of hills and a moon — the classic cải lương set.
  canvasTexture(scene, 'extra-stage', 56, 44, (px) => {
    px(2, 4, 52, 28, '#2a4a7a');                        // backdrop: night sky
    px(2, 22, 52, 10, '#3f6b4a');                       // hills
    for (let x = 2; x < 54; x += 6) px(x, 20 + ((x / 6) % 2 ? 1 : 3), 6, 3, '#4f8058');
    px(38, 9, 7, 7, '#fff1b8'); px(39, 8, 5, 9, '#fff1b8'); px(37, 10, 9, 5, '#fff1b8');   // the moon
    px(0, 0, 56, 5, '#b8860b');                         // valance
    for (let x = 0; x < 56; x += 4) px(x + 1, 5, 2, 2, '#b8860b');
    px(0, 1, 56, 1, '#ffd23f');
    for (const [x0, dir] of [[0, 1], [48, -1]] as const) {             // curtains
      for (let i = 0; i < 8; i++) {
        const w = 8 - Math.floor(i / 3);
        const x = dir === 1 ? x0 : x0 + 8 - w;
        px(x, 5 + i * 3, w, 3, i % 2 ? '#b01e1e' : '#d42a2a');
      }
      px(dir === 1 ? 1 : 52, 5, 2, 24, '#7a1010');
    }
    px(0, 32, 56, 4, '#a8743c');                        // the floor's edge
    px(0, 32, 56, 1, '#d9a35a');
    px(0, 36, 56, 6, '#6a4424');
    for (let x = 3; x < 56; x += 7) px(x, 36, 1, 6, '#4a2c16');
    px(22, 40, 12, 2, '#8a5a30'); px(24, 42, 8, 2, '#8a5a30');         // the steps
  });
  // The fortune table: a red-clothed altar, the bamboo cup of sticks, a
  // little incense bowl and a pair of candles.
  canvasTexture(scene, 'extra-altar', 22, 16, (px) => {
    px(1, 6, 20, 3, '#d42a2a'); px(1, 6, 20, 1, '#ffcf3f');
    px(2, 9, 18, 4, '#9c1414');
    px(3, 13, 2, 3, '#5a3a24'); px(17, 13, 2, 3, '#5a3a24');
    px(8, 1, 5, 5, '#c9a066'); px(8, 1, 5, 1, '#a07840');               // the cup
    for (const [x, h] of [[8, 3], [9, 4], [10, 2], [11, 4], [12, 3]]) px(x, 1 - h + 1, 1, h, '#e8d8a8');
    px(15, 4, 4, 2, '#7a7a80'); px(16, 1, 1, 3, '#c04a2a'); px(17, 2, 1, 2, '#c04a2a');   // incense
    px(3, 2, 1, 4, '#fff1b8'); px(3, 1, 1, 1, '#ffd23f');               // candles
    px(5, 2, 1, 4, '#fff1b8'); px(5, 1, 1, 1, '#ffd23f');
  });
  // A floating note, for the music.
  canvasTexture(scene, 'extra-note', 5, 7, (px) => {
    px(3, 0, 1, 5, '#ffffff'); px(3, 0, 2, 1, '#ffffff'); px(4, 1, 1, 1, '#ffffff');
    px(0, 4, 3, 3, '#ffffff'); px(1, 3, 2, 1, '#ffffff');
  });
}

/** Puts up the stage and the fortune table. They stay: they're places, not decorations. */
export function buildExtras(ctx: ExtrasContext) {
  const { scene, tilePx: k, scale, depth } = ctx;
  makeTextures(scene);

  const stage = scene.add.image(STAGE.x * k, STAGE.y * k, 'extra-stage').setOrigin(0.5, 1).setScale(scale).setDepth(depth.ground);
  ctx.tinted.push(stage);
  // Two performers in the middle of a scene, swaying as they sing.
  const floor = STAGE.y * k - 12 * scale;
  [[-9, 3], [9, 7]].forEach(([dx, look], i) => {
    const p = ctx.performer(STAGE.x * k + dx * scale, floor, look).setDepth(depth.actors).setFlipX(i === 1);
    ctx.tinted.push(p);
    if (!ctx.calm) scene.tweens.add({ targets: p, angle: { from: -4, to: 4 }, duration: 1300 + i * 260, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  });
  // Notes drifting up off the stage.
  if (!ctx.calm) {
    scene.time.addEvent({
      delay: 1400, loop: true, callback: () => {
        const n = scene.add.image(STAGE.x * k + (Math.random() - 0.5) * 24 * scale, floor - 18 * scale, 'extra-note')
          .setScale(scale).setDepth(depth.actors + 1).setAlpha(0.9);
        scene.tweens.add({ targets: n, y: n.y - k * 1.6, x: n.x + (Math.random() - 0.5) * k, alpha: 0, duration: 2600, ease: 'sine.out', onComplete: () => n.destroy() });
      },
    });
  }

  const altar = scene.add.image(ALTAR.x * k, ALTAR.y * k, 'extra-altar').setOrigin(0.5, 1).setScale(scale).setDepth(depth.ground);
  ctx.tinted.push(altar);
}
