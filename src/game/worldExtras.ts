// Places added to Huế at runtime, on top of the painted map, the way the Tết
// decorations are (festiveDecor.ts): drawn as small pixel textures here rather
// than baked by scripts/generate-hue-map.mjs.
//
//   cailuong  a cải lương stage on Phố đi bộ, next to the street piano —
//             red curtains, a painted backdrop, two performers in costume
//   fortune   a fortune-stick table before Thiên Mụ's hall, by its incense,
//             kept by a monk of the pagoda
//   pool      a street pool table (bi-a vỉa hè) on Phố đi bộ, past the street
//             piano — solo practice; matches start from a player
//   foosball  a bi lắc table on Phố đi bộ's east end, by the fountain — you
//             against the computer
//   train     a departures board at the east end of Ga Huế's platform —
//             trips out of town, none running yet
//   ladder    a quiz podium in Quốc Học's forecourt, inside the gate —
//             fifteen general questions, easy to hard, and a teacher by it
//   classroom a class noticeboard in Hai Bà Trưng's forecourt, west of the
//             gate — the tests you've been set and your teams' boards, kept
//             by a teacher in a white áo dài
//   fireworks two launch pads on the citadel wall either side of Kỳ Đài, before
//             Ngọ Môn, where Huế fires its Tết fireworks — only while the Tết
//             decorations are up (festiveDecor.ts draws them)
//
// Each is also a "play" spot (WorldScene reads EXTRA_PLAYS with the map's own),
// so walking up offers its activity, like the piano does.

import Phaser from 'phaser';
import { Dressed } from './dressed';
import { propLayers, type KeeperDress } from './keeperLooks';

/** The fireworks pads (drawn by festiveDecor.ts while Tết is up), in tiles: west and east of the flag tower. */
export const FIREWORKS_PADS = [{ x: 53.2, y: 41.4 }, { x: 57.3, y: 41.3 }];

/** The spots, in map tiles: where you stand to play. */
export const EXTRA_PLAYS: { game: string; x: number; y: number; festive?: boolean }[] = [
  { game: 'cailuong', x: 59.3, y: 64.75 },
  { game: 'fortune', x: 13.2, y: 48.4 },
  { game: 'pool', x: 64.8, y: 64.2 },
  { game: 'foosball', x: 70.0, y: 64.4 },
  { game: 'ladder', x: 37.0, y: 69.5 },
  { game: 'classroom', x: 25.0, y: 69.5 },
  { game: 'train', x: 18.4, y: 75.6 },
  ...FIREWORKS_PADS.map((p) => ({ game: 'fireworks', ...p, festive: true })),
];

/** Where the stage stands: its front edge's centre, in tiles. */
const STAGE = { x: 59.3, y: 64.2 };
/** What the stage covers, in tiles — the Tết lantern strings keep clear of it. */
export const STAGE_AREA = { x0: STAGE.x - 2, x1: STAGE.x + 2, y0: STAGE.y - 3, y1: STAGE.y };
/** The fortune table, beside Thiên Mụ's door. */
const ALTAR = { x: 13.2, y: 48.0 };
/** The people who keep the places: where each stands, in tiles, and how
 *  they're dressed. They face out to whoever walks up, and now and then bow. */
const KEEPERS: { x: number; y: number; dress: KeeperDress }[] = [
  // Thiên Mụ's monk, at the hall's door west of the fortune table: shaven
  // head, the brown áo nâu, his beads in hand.
  { x: 11.8, y: 47.8, dress: { look: { hair: 'none', hairColor: 'dark', outfit: 'aoBaBa', outfitColor: 'brown', hat: 'none' }, prop: 'beads' } },
  // Quốc Học's teacher, who runs the quiz ladder from beside the podium: a
  // grey-haired thầy in a navy áo the, the question book in hand.
  { x: 37.2, y: 70.1, dress: { look: { hair: 'shorthair', hairColor: 'grey', outfit: 'aoThe', outfitColor: 'navy', hat: 'none' }, prop: 'book' } },
  // Hai Bà Trưng's teacher, by the class noticeboard: a cô in the white áo
  // dài the school's girls were known for, her register in hand.
  { x: 25.3, y: 70.1, dress: { look: { hair: 'longhair', hairColor: 'dark', outfit: 'aoDai', outfitColor: 'white', hat: 'none' }, prop: 'book' } },
];
/** The pool table, on Phố đi bộ past the street piano. */
const POOL = { x: 64.8, y: 63.7 };
/** The foosball table, by the fountain. */
const FOOS = { x: 70.0, y: 63.9 };
/** The departures board, on Ga Huế's platform by the buffer stop. */
const BOARD = { x: 18.4, y: 75.4 };
/** The quiz podium, in Quốc Học's forecourt west of the gate. */
const PODIUM = { x: 36.0, y: 70.0 };
/** The class noticeboard, in Hai Bà Trưng's forecourt west of the gate. */
const NOTICE = { x: 24.0, y: 70.0 };

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
  // A street pool table: green cloth, a wooden rail, dark pockets, a few balls
  // and a cue laid across it.
  canvasTexture(scene, 'extra-pool', 30, 18, (px) => {
    px(0, 0, 30, 14, '#5a3420');
    px(2, 2, 26, 10, '#1f7a4a');
    for (const [x, y] of [[1, 1], [14, 0], [27, 1], [1, 11], [14, 12], [27, 11]]) px(x, y, 2, 2, '#0c0c0e');
    px(6, 6, 2, 2, '#f6f1e4');
    for (const [x, y, c] of [[19, 5, '#d43a30'], [21, 6, '#f2c230'], [19, 7, '#2f5fd0'], [21, 4, '#1a1a1e'], [23, 6, '#2e9a4e']] as const) px(x, y, 2, 2, c);
    px(3, 9, 10, 1, '#d8b878');
    px(1, 14, 2, 4, '#3a2214'); px(27, 14, 2, 4, '#3a2214');
  });
  // A bi lắc table: a green pitch in a wooden box, rods across it with their
  // red and blue players, handles out the sides.
  canvasTexture(scene, 'extra-foos', 26, 18, (px) => {
    px(0, 0, 26, 13, '#6a4424');
    px(2, 2, 22, 9, '#2e8a4a');
    px(12, 2, 1, 9, '#7fc79a');
    px(0, 5, 2, 3, '#0c0c0e'); px(24, 5, 2, 3, '#0c0c0e');
    [4, 7, 10, 13, 16, 19, 22].forEach((x, i) => {
      px(x, 0, 1, 13, '#b8bcc4');
      px(x - 1, i % 2 ? 4 : 6, 3, 2, i % 2 ? '#2f5fd0' : '#d42a2a');
    });
    px(12, 6, 1, 1, '#f6f1e4');
    px(1, 13, 2, 5, '#3a2214'); px(23, 13, 2, 5, '#3a2214');
  });
  // A quiz podium, a tile high to fit the forecourt between the wall and
  // the school: a board lit with the ladder's rungs (the top one gold) over
  // a navy desk with a gold edge.
  canvasTexture(scene, 'extra-podium', 14, 14, (px) => {
    px(1, 0, 12, 7, '#b8860b');                         // the board's frame
    px(2, 1, 10, 5, '#1c2a5a');
    for (let i = 0; i < 3; i++) px(4, 2 + i * 1.5, 6, 1, i === 0 ? '#ffd23f' : '#6f8fe0');
    px(6, 7, 2, 2, '#7a7a80');                          // its stand
    px(1, 9, 12, 2, '#ffcf3f');                         // the desk
    px(2, 11, 10, 3, '#24357a');
    px(6, 11, 2, 2, '#ffd23f');
  });
  // A class noticeboard, a tile high like the podium: a rose frame in the
  // school's colour on two posts, cream sheets pinned up — the homework, one
  // with a red tick — and a gold star for the class's best.
  canvasTexture(scene, 'extra-notice', 16, 14, (px) => {
    px(3, 9, 2, 5, '#5a3a24'); px(11, 9, 2, 5, '#5a3a24');                  // the posts
    px(0, 0, 16, 10, '#c8707a'); px(0, 0, 16, 1, '#e8a0a8');                // the frame
    px(1, 1, 14, 8, '#6a4a32');                                             // cork
    px(2, 2, 4, 5, '#f6f1e4'); px(3, 3, 2, 1, '#9a9a9a'); px(3, 5, 2, 1, '#9a9a9a');
    px(7, 2, 4, 6, '#f6f1e4'); px(8, 3, 2, 1, '#9a9a9a'); px(8, 6, 1, 1, '#d42a2a'); px(9, 5, 1, 1, '#d42a2a');
    px(12, 3, 2, 2, '#ffd23f'); px(12, 2, 1, 1, '#ffd23f'); px(13, 5, 1, 1, '#ffd23f');
    for (const x of [3, 8]) px(x + 0.5, 2, 1, 1, '#d42a2a');                // pins
  });
  // A station's departures board: a dark panel in a green frame on two
  // posts, three lines of amber lettering and a little clock over it.
  canvasTexture(scene, 'extra-board', 18, 20, (px) => {
    px(3, 12, 2, 8, '#3a3a40'); px(13, 12, 2, 8, '#3a3a40');                // the posts
    px(0, 4, 18, 10, '#2f5a46'); px(0, 4, 18, 1, '#4f8a6a');
    px(1, 5, 16, 8, '#14181c');
    for (let i = 0; i < 3; i++) { px(2, 6 + i * 2.4, 7, 1, '#ffb43a'); px(11, 6 + i * 2.4, 4, 1, i === 0 ? '#ff6a4a' : '#ffb43a'); }
    px(7, 0, 4, 4, '#2f5a46'); px(8, 1, 2, 2, '#f6f1e4');                  // the clock
  });
  // A floating note, for the music.
  canvasTexture(scene, 'extra-note', 5, 7, (px) => {
    px(3, 0, 1, 5, '#ffffff'); px(3, 0, 2, 1, '#ffffff'); px(4, 1, 1, 1, '#ffffff');
    px(0, 4, 3, 3, '#ffffff'); px(1, 3, 2, 1, '#ffffff');
  });
}

/** Puts up the stage, the tables, the podium, the noticeboard and their keepers. They stay: they're places, not decorations. */
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
  const table = scene.add.image(POOL.x * k, POOL.y * k, 'extra-pool').setOrigin(0.5, 1).setScale(scale).setDepth(depth.ground);
  ctx.tinted.push(table);

  const foos = scene.add.image(FOOS.x * k, FOOS.y * k, 'extra-foos').setOrigin(0.5, 1).setScale(scale).setDepth(depth.ground);
  ctx.tinted.push(foos);

  const board = scene.add.image(BOARD.x * k, BOARD.y * k, 'extra-board').setOrigin(0.5, 1).setScale(scale).setDepth(depth.ground);
  ctx.tinted.push(board);

  const podium = scene.add.image(PODIUM.x * k, PODIUM.y * k, 'extra-podium').setOrigin(0.5, 1).setScale(scale).setDepth(depth.ground);
  ctx.tinted.push(podium);

  const notice = scene.add.image(NOTICE.x * k, NOTICE.y * k, 'extra-notice').setOrigin(0.5, 1).setScale(scale).setDepth(depth.ground);
  ctx.tinted.push(notice);

  KEEPERS.forEach(({ x, y, dress }, i) => {
    const keeper = new Dressed(scene, x * k, y * k, dress.look, propLayers(dress)).setScale(scale).setDepth(depth.actors);
    keeper.playClip('idle', false, 'front');
    if (!ctx.calm) scene.tweens.add({ targets: keeper, scaleY: scale * 0.92, duration: 700, yoyo: true, hold: 500, repeat: -1, repeatDelay: 4200, delay: i * 1900, ease: 'sine.inOut' });
  });
}
