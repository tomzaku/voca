// Lunar New Year over Huế: red lanterns strung over the walks and flanking
// every landmark's name, pots of yellow mai and pink đào blossom by the
// keepers, couplets and a "Chúc Mừng Năm Mới" banner at Ngọ Môn, and
// petals drifting down; after dark, fireworks from the citadel wall by Kỳ Đài;
// and there, two launch pads where a right answer sends one up spelling its word —
// all added on top of the painted map at runtime, so
// the season's switch (src/hooks/useFestive.ts) can take them down again.
//
// The map's art is baked into PNGs (scripts/generate-hue-map.mjs); nothing
// here touches those. The pieces are tiny pixel textures drawn onto canvases
// once, in the map's own 16px-at-2× style, like the ambient sampans.

import Phaser from 'phaser';

export interface FestiveContext {
  scene: Phaser.Scene;
  /** One map tile in world pixels. */
  tilePx: number;
  /** The art's pixel scale (16px drawn at SCALE). */
  scale: number;
  /** Walks people stroll along: x → to, at y. Lantern strings hang over them. */
  strolls: { x: number; y: number; to: number }[];
  /** Landmark names on the map, as drawn. */
  labels: { text: Phaser.GameObjects.Text; place?: string }[];
  /** The keepers — each app page's little building. The blossom pots stand at theirs. */
  keepers: { x: number; y: number }[];
  depth: { ground: number; over: number; glow: number };
  /** Sprites the night veil should tint, like the rest of the scenery. */
  tinted: (Phaser.GameObjects.Sprite | Phaser.GameObjects.Image)[];
  night: boolean;
  calm: boolean;

  /** Areas (in tiles) the lantern strings keep clear of — the cải lương stage. */
  avoid: { x0: number; x1: number; y0: number; y1: number }[];
  /** The launch pads (play spots), in tiles — the nightly show fires from them too. */
  pads: { x: number; y: number }[];
  /** The patch of sky, in tiles, a launched word is written across. */
  sky: { x: number; y: number };
}

export interface FestiveDecor {
  setNight(night: boolean): void;
  /** Sends one up from a pad (the one nearest `from`, world px), spelling `word` in sparks; `big` for a streak. */
  launch(word: string, big: boolean, from?: { x: number; y: number }): void;
  destroy(): void;
}

const SPARK_COLORS = [0xff4d4d, 0xffd23f, 0x4dd2ff, 0x9dff6a, 0xff7af0, 0xffffff, 0xff9f43];

const RED = '#d42a2a', RED_DARK = '#9c1414', GOLD = '#ffcf3f', GOLD_DARK = '#c98f12';

/** Draws a texture once per game, pixel by pixel. */
function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  if (scene.textures.exists(key)) return;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!);
  scene.textures.addCanvas(key, cv)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

function makeTextures(scene: Phaser.Scene) {
  // A round red lantern: gold caps, darker ribs, a tassel. Hung from its top.
  canvasTexture(scene, 'festive-lantern', 7, 11, (c) => {
    const px = (x: number, y: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    px(3, 0, 1, 1, GOLD_DARK);
    px(2, 1, 3, 1, GOLD);
    px(1, 2, 5, 1, RED);
    px(0, 3, 7, 4, RED);
    px(1, 7, 5, 1, RED);
    px(2, 3, 1, 4, RED_DARK); px(4, 3, 1, 4, RED_DARK);
    px(1, 3, 1, 2, '#ff7a6a');
    px(2, 8, 3, 1, GOLD);
    px(3, 9, 1, 2, GOLD_DARK);
  });
  // Blossom in a glazed pot: a few dark branches clouded with flowers.
  const tree = (key: string, petal: string, petalDark: string) => canvasTexture(scene, key, 16, 20, (c) => {
    const px = (x: number, y: number, col: string) => { c.fillStyle = col; c.fillRect(x, y, 1, 1); };
    c.fillStyle = '#5a3a24';
    for (const [x, y, w, h] of [[7, 8, 2, 7], [5, 6, 1, 3], [4, 4, 1, 3], [10, 5, 1, 4], [11, 3, 1, 3], [8, 3, 1, 5], [6, 7, 2, 1], [9, 7, 2, 1]]) c.fillRect(x, y, w, h);
    // Flowers: a fixed scatter, so every pot looks alike and nothing shimmers.
    const spots = [[3, 3], [4, 2], [5, 4], [3, 5], [6, 5], [7, 2], [8, 1], [9, 2], [7, 4], [9, 4], [10, 3], [11, 2], [12, 3], [12, 5], [11, 6], [10, 7], [5, 7], [4, 6], [13, 4], [2, 4], [6, 2], [9, 6], [8, 6], [11, 4]];
    spots.forEach(([x, y], i) => px(x, y, i % 3 ? petal : petalDark));
    for (const [x, y] of [[4, 3], [8, 2], [11, 3], [10, 5], [6, 6]]) px(x, y, GOLD);
    // The pot: blue-and-white glaze, a rim, a foot.
    c.fillStyle = '#e8edf4'; c.fillRect(4, 14, 8, 5);
    c.fillStyle = '#3a5fa8'; c.fillRect(4, 14, 8, 1); c.fillRect(5, 16, 6, 1); c.fillRect(4, 18, 8, 1);
    c.fillStyle = '#2a4580'; c.fillRect(3, 13, 10, 1); c.fillRect(5, 19, 6, 1);
  });
  tree('festive-mai', '#ffd23f', '#f2a900');
  tree('festive-dao', '#ff9ec7', '#e8679e');
  // The launch pad: a stone slab, a rack of red-and-gold rockets, a little flag.
  canvasTexture(scene, 'festive-pad', 20, 16, (c) => {
    const px = (x: number, y: number, w: number, h: number, col: string) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    px(1, 12, 18, 4, '#8c8c94'); px(1, 12, 18, 1, '#b4b4bc');
    px(3, 9, 14, 3, '#5a3a24');
    for (const [x, h] of [[4, 7], [8, 9], [12, 6], [15, 8]]) {
      px(x, 9 - h, 2, h, RED); px(x, 9 - h, 2, 1, GOLD); px(x, 9 - h - 1, 1, 1, GOLD_DARK);
    }
    px(18, 2, 1, 10, '#5a3a24'); px(19, 2, 1, 3, GOLD);
  });
  // A couplet scroll: red paper, gold edge, a column of gold "characters".
  canvasTexture(scene, 'festive-couplet', 6, 26, (c) => {
    c.fillStyle = GOLD_DARK; c.fillRect(0, 0, 6, 26);
    c.fillStyle = RED; c.fillRect(1, 1, 4, 24);
    c.fillStyle = GOLD;
    for (let y = 3; y < 23; y += 4) { c.fillRect(2, y, 2, 1); c.fillRect(2, y + 1, 1, 1); c.fillRect(3, y + 2, 1, 1); }
  });
}

/** Puts the decorations up. The returned handle follows day/night and takes them down. */
export function buildFestive(ctx: FestiveContext): FestiveDecor {
  const { scene, tilePx: k, scale, depth } = ctx;
  makeTextures(scene);
  const objs: Phaser.GameObjects.GameObject[] = [];
  const glows: Phaser.GameObjects.Arc[] = [];
  const timers: Phaser.Time.TimerEvent[] = [];
  const mine = new Set<Phaser.GameObjects.Sprite | Phaser.GameObjects.Image>();

  const lantern = (x: number, y: number, i: number) => {
    const glow = scene.add.circle(x, y + 5 * scale, 11 * scale, 0xff5a2a, 0.32)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(depth.glow).setVisible(ctx.night);
    glows.push(glow);
    objs.push(glow);
    const l = scene.add.image(x, y, 'festive-lantern').setOrigin(0.5, 0).setScale(scale).setDepth(depth.over);
    objs.push(l);
    if (!ctx.calm) {
      // A breeze through the string — each a little out of step.
      scene.tweens.add({ targets: l, angle: { from: -6, to: 6 }, duration: 1600 + (i % 5) * 180, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: (i * 137) % 900 });
      scene.tweens.add({ targets: glow, alpha: { from: 0.24, to: 0.4 }, duration: 1300 + (i % 4) * 200, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    }
  };

  // Short strings of lanterns over the walks, above head height — five to a
  // string with a gap between, as a street hangs them, not one endless line.
  const PER_STRING = 5, SPACING = k * 1.6, GAP = k * 4;
  let n = 0;
  for (const s of ctx.strolls) {
    const x0 = Math.min(s.x, s.to), x1 = Math.max(s.x, s.to);
    const y = s.y - k * 2.2;
    const span = SPACING * (PER_STRING + 1);
    for (let start = x0; start + span <= x1; start += span + GAP) {
      const clash = ctx.avoid.some((a) => start < a.x1 * k && start + span > a.x0 * k && y > a.y0 * k - k && y < a.y1 * k + k);
      if (clash) continue;
      const cord = scene.add.graphics().setDepth(depth.over);
      cord.lineStyle(scale, 0x7a1010, 0.9);
      cord.beginPath();
      const steps = PER_STRING + 1;
      for (let i = 0; i <= steps; i++) {
        const x = start + SPACING * i;
        // The cord dips between its ends.
        const sag = Math.sin((i / steps) * Math.PI) * k * 0.4;
        if (i === 0) cord.moveTo(x, y); else cord.lineTo(x, y + sag);
        if (i > 0 && i < steps) lantern(x, y + sag, n++);
      }
      cord.strokePath();
      objs.push(cord);
    }
  }

  // A lantern either side of every landmark's name.
  for (const l of ctx.labels) {
    const t = l.text;
    if (!t.visible) continue;
    const y = t.y - k * 0.55;
    lantern(t.x - k * 0.75, y, n++);
    lantern(t.x + t.displayWidth + k * 0.75, y, n++);
  }

  // Mai and đào at each keeper's — one either side.
  ctx.keepers.forEach((d, i) => {
    for (const [dx, key] of [[-1.3, i % 2 ? 'festive-dao' : 'festive-mai'], [1.3, i % 2 ? 'festive-mai' : 'festive-dao']] as const) {
      const pot = scene.add.image(d.x + dx * k, d.y + k * 0.4, key).setOrigin(0.5, 1).setScale(scale).setDepth(depth.ground);
      objs.push(pot);
      mine.add(pot);
      ctx.tinted.push(pot);
      if (ctx.night) pot.setTint(0x8890b0);
    }
  });

  // Ngọ Môn, the main gate: a banner across its wall, over the doors, and a
  // couplet either side. Its name sits just north of the building.
  const gate = ctx.labels.find((l) => l.place === 'ngoMon')?.text;
  if (gate) {
    const cx = gate.x + gate.displayWidth / 2;
    const by = gate.y + k * 3.5;
    const text = scene.add.text(cx, by, 'CHÚC MỪNG NĂM MỚI', {
      fontFamily: gate.style.fontFamily, fontSize: '11px', fontStyle: 'bold',
      color: GOLD, stroke: RED_DARK, strokeThickness: 2, resolution: gate.style.resolution,
    }).setOrigin(0.5).setDepth(depth.over + 1);
    const w = text.displayWidth + k * 0.8, h = text.displayHeight + k * 0.35;
    const banner = scene.add.graphics().setDepth(depth.over);
    banner.fillStyle(0x9c1414, 1).fillRect(cx - w / 2 - scale, by - h / 2 - scale, w + scale * 2, h + scale * 2);
    banner.fillStyle(0xd42a2a, 1).fillRect(cx - w / 2, by - h / 2, w, h);
    banner.lineStyle(scale, 0xffcf3f, 1).strokeRect(cx - w / 2 + scale * 2, by - h / 2 + scale * 2, w - scale * 4, h - scale * 4);
    objs.push(banner, text);
    for (const side of [-1, 1]) {
      const scroll = scene.add.image(cx + side * (w / 2 + k * 0.7), by - h / 2, 'festive-couplet').setOrigin(0.5, 0).setScale(scale).setDepth(depth.over);
      objs.push(scroll);
      if (!ctx.calm) scene.tweens.add({ targets: scroll, angle: { from: -2, to: 2 }, duration: 2200 + side * 300, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    }
  }

  // Petals of mai and đào drifting down across the view.
  if (!ctx.calm) {
    const colors = [0xffd23f, 0xff9ec7, 0xffb3d4, 0xf2a900];
    timers.push(scene.time.addEvent({
      delay: 220, loop: true, callback: () => {
        const view = scene.cameras.main.worldView;
        const x = view.x + Math.random() * view.width;
        const y = view.y - 10;
        const p = scene.add.rectangle(x, y, scale * 1.5, scale, colors[Math.floor(Math.random() * colors.length)], 0.95).setDepth(depth.over + 2);
        const fall = view.height * (0.5 + Math.random() * 0.6);
        scene.tweens.add({ targets: p, y: y + fall, x: x + (Math.random() - 0.3) * k * 3, angle: Math.random() * 540, duration: 5200 + Math.random() * 3000, ease: 'sine.in' });
        scene.tweens.add({ targets: p, alpha: 0, delay: 3800, duration: 1800, onComplete: () => p.destroy() });
      },
    }));
  }

  // ── Fireworks ──
  // Glowing (additive) after dark; by day additive sparks wash out against the
  // bright water, so they're drawn solid, a size up, in the stronger colours.
  let night = ctx.night;
  const DAY_COLORS = [0xe8262c, 0xff8a00, 0x8a2be2, 0xd6006e, 0x0a8a3a, 0x0050c8];
  const pick = () => (night ? SPARK_COLORS : DAY_COLORS)[Math.floor(Math.random() * (night ? SPARK_COLORS : DAY_COLORS).length)];
  const spark = (x: number, y: number, color: number) => {
    const size = scale * (night ? 1.5 : 2);
    const p = scene.add.rectangle(x, y, size, size, color).setDepth(depth.over + 3);
    if (night) p.setBlendMode(Phaser.BlendModes.ADD);
    return p;
  };
  /** A shell: a rocket climbs from `from` (or straight below), then bursts into a ring that sags and fades. */
  const burst = (x: number, y: number, big: boolean, from?: { x: number; y: number }) => {
    const color = pick();
    const rocket = scene.add.rectangle(from?.x ?? x, from?.y ?? y + k * 5, scale, scale * 3, 0xffe9a8).setDepth(depth.over + 3);
    scene.tweens.add({
      targets: rocket, x, y, duration: from ? 900 : 650, ease: 'quad.out',
      onComplete: () => {
        rocket.destroy();
        const n = big ? 44 : 28;
        const r = k * (big ? 3.2 : 2.2);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + Math.random() * 0.1;
          const p = spark(x, y, i % 5 === 0 && night ? 0xffffff : color);
          const d = r * (0.75 + Math.random() * 0.3);
          scene.tweens.add({ targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, duration: 700, ease: 'quad.out' });
          scene.tweens.add({ targets: p, y: `+=${k * 0.9}`, alpha: 0, delay: 650, duration: 900, ease: 'quad.in', onComplete: () => p.destroy() });
        }
      },
    });
  };

  // Where each pad's rack stands: a step outward from where you stand on it,
  // so you don't hide it — west pad to the west, east pad to the east.
  const racks = ctx.pads.map((p, i) => ({ x: (p.x + (i === 0 ? -1.2 : 1.2)) * k, y: p.y * k - k * 0.2 }));

  // The nightly show from the pads: a shell every couple of seconds, at night only.
  let show: Phaser.Time.TimerEvent | null = null;
  const startShow = () => {
    if (show || ctx.calm || !racks.length) return;
    show = scene.time.addEvent({
      delay: 1800, loop: true, callback: () => {
        const r = racks[Math.floor(Math.random() * racks.length)];
        const x = r.x + (Math.random() - 0.5) * k * 7;
        burst(x, r.y - k * (5 + Math.random() * 3), Math.random() < 0.25, { x: r.x, y: r.y - k * 0.5 });
      },
    });
  };
  const stopShow = () => { show?.remove(); show = null; };
  if (ctx.night) startShow();

  // The pads' racks of rockets.
  for (const r of racks) {
    const pad = scene.add.image(r.x, r.y, 'festive-pad').setOrigin(0.5, 1).setScale(scale).setDepth(depth.ground);
    objs.push(pad);
    mine.add(pad);
    ctx.tinted.push(pad);
    if (ctx.night) pad.setTint(0x8890b0);
  }

  /** A word in sparks: drawn on a canvas, every few lit pixels becoming a spark that flies into place. */
  const spell = (word: string, big: boolean) => {
    const cv = document.createElement('canvas');
    const font = 'bold 16px monospace';
    const c = cv.getContext('2d')!;
    c.font = font;
    const w = Math.ceil(c.measureText(word).width) + 4;
    cv.width = w; cv.height = 20;
    c.font = font;
    c.fillStyle = '#fff';
    c.textBaseline = 'top';
    c.fillText(word, 2, 2);
    const img = c.getImageData(0, 0, w, 20).data;
    const pts: [number, number][] = [];
    const step = w * 20 > 3000 ? 3 : 2;
    for (let y = 0; y < 20; y += step) for (let x = 0; x < w; x += step) if (img[(y * w + x) * 4 + 3] > 128) pts.push([x, y]);
    const cx = ctx.sky.x * k, cy = ctx.sky.y * k;
    const size = scale * (big ? 2 : 1.7);
    const color = pick();
    for (const [px, py] of pts) {
      const p = spark(cx, cy, color);
      scene.tweens.add({ targets: p, x: cx + (px - w / 2) * size, y: cy + (py - 10) * size, duration: 650, ease: 'cubic.out' });
      scene.tweens.add({ targets: p, alpha: { from: 1, to: 0.55 }, delay: 650, duration: 220, yoyo: true, repeat: 5 });
      scene.tweens.add({ targets: p, y: `+=${k * 1.2}`, alpha: 0, delay: 3400, duration: 1000, ease: 'quad.in', onComplete: () => p.destroy() });
    }
  };

  return {
    launch(word: string, big: boolean, from?: { x: number; y: number }) {
      if (!racks.length) return;
      const x = ctx.sky.x * k, y = ctx.sky.y * k;
      const rack = from ? racks.reduce((a, b) => (Math.hypot(b.x - from.x, b.y - from.y) < Math.hypot(a.x - from.x, a.y - from.y) ? b : a)) : racks[0];
      // The rocket leaves the pad and climbs to where the word will be.
      const rocket = scene.add.rectangle(rack.x, rack.y - k * 0.5, scale * 1.5, scale * 4, 0xffe9a8).setDepth(depth.over + 3);
      scene.tweens.add({
        targets: rocket, x, y, duration: 800, ease: 'quad.out',
        onComplete: () => {
          rocket.destroy();
          spell(word, big);
          if (big) { burst(x - k * 5, y - k, true); burst(x + k * 5, y - k, true); }
        },
      });
    },
    setNight(isNight: boolean) {
      night = isNight;
      for (const g of glows) g.setVisible(isNight);
      if (isNight) startShow(); else stopShow();
    },
    destroy() {
      stopShow();
      for (const t of timers) t.remove();
      for (const o of objs) {
        scene.tweens.killTweensOf(o);
        o.destroy();
      }
      // Hand the pots back out of the night-tint list.
      for (let i = ctx.tinted.length - 1; i >= 0; i--) if (mine.has(ctx.tinted[i])) ctx.tinted.splice(i, 1);
    },
  };
}
