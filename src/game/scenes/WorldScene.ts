import Phaser from 'phaser';
import type { AnimalId } from '../../lib/companion';
import { WORLD_EVENTS, type WorldStation } from '../types';
import {
  computeLayout, snapToRoad,
  REACH, ROAD_W, SPEED, type PlacedStation, type WorldLayout,
} from '../road';
import { worldPalette, FONT, type WorldPalette } from '../palette';
import {
  BUDDY_DIRS, buddyTextureKey, loadBuddyTexture, ensureDotsTexture, type BuddyDir,
} from '../textures';

export interface WorldSceneData {
  stations: WorldStation[];
  animalId: AnimalId;
  stage: number;
  buddyName: string;
  /** Device pixel ratio: the canvas renders at native res, the camera zooms by
   *  this factor, and text rasterizes at this resolution — all to stay sharp. */
  dpr: number;
}

const KIND_EMOJI = { mine: '👤', joined: '👥', level: '🎓' } as const;

const TREES = ['🌲', '🌳'];
const DECOR = ['🌼', '🌷', '🍄', '🪨', '🌻', '🌿', '🪵', '🌸', '🦋', '🌾'];

interface StationNode {
  station: PlacedStation;
  root: Phaser.GameObjects.Container;
  frame: Phaser.GameObjects.Graphics;
}

/**
 * The explorable Word Meadow. Owns the simulation only: movement, camera,
 * proximity. It reports the nearest station on `game.events` (WORLD_EVENTS)
 * and the React shell around the canvas renders all real UI (station card,
 * HUD, modals) from that.
 */
export class WorldScene extends Phaser.Scene {
  static readonly KEY = 'world';

  private args!: WorldSceneData;
  private pal!: WorldPalette;
  private layout!: WorldLayout;
  private ready = false;

  private worldLayer?: Phaser.GameObjects.Container;
  private nodes: StationNode[] = [];

  private buddy!: Phaser.GameObjects.Container;
  private sprite!: Phaser.GameObjects.Sprite;
  private walking = false;
  private facing: BuddyDir = 'down';
  private target: { x: number; y: number } | null = null;
  private targetMark!: Phaser.GameObjects.Arc;
  private nearestId: string | null = null;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  constructor() {
    super(WorldScene.KEY);
  }

  init(data: WorldSceneData) {
    this.args = data;
  }

  preload() {
    loadBuddyTexture(this, this.args.animalId);
  }

  create() {
    this.pal = worldPalette();
    this.cameras.main.setZoom(this.args.dpr);
    this.cameras.main.setRoundPixels(true);
    // Belt and braces: the pixelArt config flag doesn't reliably reach
    // runtime-loaded sheets, and linear filtering blurs 16px art badly.
    for (const sheet of ['idle', 'walk'] as const) {
      this.textures
        .get(buddyTextureKey(this.args.animalId, sheet))
        .setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = kb.addKeys('W,A,S,D') as WorldScene['wasd'];
    // Stop arrows/space from scrolling the page while the world has the screen.
    kb.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);

    // Tap the ground → walk to the nearest spot on the road.
    this.input.on(
      'pointerdown',
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (over.length > 0) return; // a station handled it
        this.walkTo(pointer.worldX, pointer.worldY);
      },
    );

    this.buildWorld();
    this.createBuddy();
    this.targetMark = this.add
      .circle(0, 0, 8)
      .setStrokeStyle(2.5, 0xffd23f)
      .setDepth(5)
      .setVisible(false);
    this.tweens.add({
      targets: this.targetMark,
      scale: { from: 0.5, to: 1.6 },
      alpha: { from: 1, to: 0 },
      duration: 800,
      repeat: -1,
    });

    this.cameras.main.startFollow(this.buddy, true, 0.12, 0.12);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    });
    this.ready = true;
  }

  // ── React-facing API ──

  /** Swap the station data (progress ticked, collection created…) in place. */
  setStations(stations: WorldStation[]) {
    this.args.stations = stations;
    if (this.ready) this.buildWorld();
  }

  /** Re-resolve colors from CSS variables after a theme switch. */
  applyTheme() {
    if (!this.ready) return;
    this.pal = worldPalette();
    this.buildWorld();
  }

  // ── World construction ──

  private onResize() {
    if (this.ready) this.buildWorld();
  }

  private buildWorld() {
    // Layout runs in CSS pixels; the canvas itself is dpr× larger.
    const viewW = Math.max(this.scale.width / this.args.dpr, 320);
    const viewH = Math.max(this.scale.height / this.args.dpr, 320);
    this.layout = computeLayout(this.args.stations, viewW, viewH);
    const { worldW, worldH, spawn, placed, pathPts } = this.layout;

    this.worldLayer?.destroy();
    this.nodes = [];
    const layer = this.add.container(0, 0).setDepth(0);
    this.worldLayer = layer;

    // Ground: grass, light patches, speckle, forest edge, props.
    layer.add(this.add.rectangle(0, 0, worldW, worldH, this.pal.grass).setOrigin(0));
    const patches = this.add.graphics();
    patches.fillStyle(this.pal.patch, this.pal.patchAlpha);
    for (let i = 0; i < Math.ceil(worldW / 450); i++) {
      patches.fillEllipse(
        225 + i * 450 + ((i * 97) % 120),
        (i % 2 === 0 ? 0.3 : 0.7) * worldH,
        460, 300,
      );
    }
    layer.add(patches);
    const dotsKey = this.pal.light ? 'dots-light' : 'dots-dark';
    ensureDotsTexture(this, dotsKey, this.pal.dotRgba);
    layer.add(this.add.tileSprite(0, 0, worldW, worldH, dotsKey).setOrigin(0));

    this.drawRoad(layer, pathPts, this.layout.dashSegs);
    this.plantScenery(layer, worldW, worldH, placed);

    layer.add(this.makeBubble(spawn.x, spawn.y - 54, 'WORD MEADOW', this.pal.mutedCss));

    // Region banners: Public (mine + joined) up top, System (levels) below.
    for (const b of this.layout.banners) {
      const color = b.region === 'public' ? this.pal.kind.mine.css : this.pal.kind.level.css;
      layer.add(
        this.add
          .text(b.x, b.y, b.label, {
            fontFamily: FONT,
            fontSize: '14px',
            fontStyle: 'bold',
            color,
            backgroundColor: this.pal.cardCss,
            padding: { x: 14, y: 6 },
            resolution: this.args.dpr,
          })
          .setOrigin(0.5),
      );
    }

    for (const p of placed) this.addStation(layer, p);

    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBackgroundColor(this.pal.grassEdge);

    // A rebuild can move the road out from under the buddy — reel it back in.
    if (this.buddy) {
      const pos = snapToRoad(pathPts, this.buddy.x, this.buddy.y);
      this.buddy.setPosition(pos.x, pos.y);
    }
    this.target = null;
  }

  private drawRoad(layer: Phaser.GameObjects.Container, pts: number[][], dashSegs: number[][]) {
    const g = this.add.graphics();
    const pass = (width: number, color: number, alpha = 1) => {
      g.lineStyle(width, color, alpha);
      g.fillStyle(color, alpha);
      for (let i = 0; i < pts.length - 1; i++) {
        g.lineBetween(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      }
      // Round the joints — Graphics strokes have butt caps.
      for (const [x, y] of pts) g.fillCircle(x, y, width / 2);
    };
    pass(ROAD_W + 10, this.pal.roadEdge);
    pass(ROAD_W, this.pal.road);

    // Dashed centerline (deduplicated segments — the polyline retraces itself).
    g.lineStyle(3, this.pal.dash, this.pal.dashAlpha);
    const DASH = 12, GAP = 18;
    for (const [x1, y1, x2, y2] of dashSegs) {
      const len = Math.hypot(x2 - x1, y2 - y1);
      const ux = (x2 - x1) / (len || 1), uy = (y2 - y1) / (len || 1);
      for (let d = GAP / 2; d + DASH < len; d += DASH + GAP) {
        g.lineBetween(x1 + ux * d, y1 + uy * d, x1 + ux * (d + DASH), y1 + uy * (d + DASH));
      }
    }
    layer.add(g);
  }

  private plantScenery(
    layer: Phaser.GameObjects.Container,
    worldW: number,
    worldH: number,
    placed: PlacedStation[],
  ) {
    const put = (x: number, y: number, emoji: string, size: number) =>
      layer.add(
        this.add
          .text(x, y, emoji, { fontSize: `${size}px`, resolution: this.args.dpr })
          .setOrigin(0.5),
      );

    // Forest edge on all four sides (deterministic pseudo-random offsets).
    for (let x = 30, i = 0; x < worldW + 40; x += 82, i++) {
      put(x + ((i * 37) % 40) - 20, 28 + ((i * 23) % 30), TREES[i % 3 === 0 ? 1 : 0], 30 + ((i * 13) % 14));
      put(x + ((i * 53) % 44) - 22, worldH - 24 - ((i * 31) % 30), TREES[i % 3 === 1 ? 1 : 0], 30 + ((i * 7) % 14));
    }
    for (let y = 100, i = 0; y < worldH - 80; y += 86, i++) {
      put(26 + ((i * 19) % 22), y, TREES[i % 3 === 2 ? 1 : 0], 28 + ((i * 11) % 12));
      put(worldW - 24 - ((i * 29) % 22), y + 40, TREES[i % 2], 28 + ((i * 17) % 12));
    }

    // Ambient props sprinkled around each station, clear of the road.
    placed.forEach((p, i) => {
      for (let k = 0; k < 2; k++) {
        const j = i * 2 + k;
        const dx = (j % 2 === 0 ? -1 : 1) * (76 + ((j * 31) % 52));
        const dy = (j % 3 === 0 ? -1 : 1) * (82 + ((j * 17) % 44));
        put(
          Math.min(Math.max(p.x + dx, 64), worldW - 64),
          Math.min(Math.max(p.y + dy, 92), worldH - 84),
          DECOR[j % DECOR.length],
          17 + ((j * 11) % 10),
        );
      }
    });
  }

  /** Small pill label (zone names, spawn sign, studying badge). */
  private makeBubble(x: number, y: number, label: string, color: string, bg?: string) {
    return this.add
      .text(x, y, label, {
        fontFamily: FONT,
        fontSize: '10px',
        fontStyle: 'bold',
        color,
        backgroundColor: bg ?? this.pal.cardCss,
        padding: { x: 7, y: 3 },
        resolution: this.args.dpr,
      })
      .setOrigin(0.5);
  }

  private addStation(layer: Phaser.GameObjects.Container, p: PlacedStation) {
    const kind = this.pal.kind[p.kind];
    const root = this.add.container(p.x, p.y);

    const frame = this.add.graphics();
    this.drawFrame(frame, p, false);
    root.add(frame);

    // Icon bubble.
    const bubble = this.add.graphics();
    bubble.fillStyle(kind.color, 0.18);
    bubble.fillCircle(0, -26, 17);
    root.add(bubble);
    root.add(
      this.add
        .text(0, -26, KIND_EMOJI[p.kind], { fontSize: '16px', resolution: this.args.dpr })
        .setOrigin(0.5),
    );

    root.add(
      this.add
        .text(0, 0, p.name, {
          fontFamily: FONT,
          fontSize: '11px',
          fontStyle: 'bold',
          color: this.pal.textCss,
          align: 'center',
          wordWrap: { width: 94 },
          maxLines: 2,
          resolution: this.args.dpr,
        })
        .setOrigin(0.5, 0.5),
    );

    const meta = `${p.words.length} words${p.learners ? `  ·  ${p.learners} 👥` : ''}`;
    root.add(
      this.add
        .text(0, 20, meta, {
          fontFamily: FONT,
          fontSize: '9px',
          fontStyle: 'bold',
          color: this.pal.mutedCss,
          resolution: this.args.dpr,
        })
        .setOrigin(0.5),
    );

    // Progress bar.
    const bar = this.add.graphics();
    bar.fillStyle(this.pal.track, 1);
    bar.fillRoundedRect(-42, 30, 84, 5, 2.5);
    if (p.pct > 0) {
      bar.fillStyle(kind.color, 1);
      bar.fillRoundedRect(-42, 30, Math.max(84 * (p.pct / 100), 6), 5, 2.5);
    }
    root.add(bar);

    if (p.active) {
      root.add(this.makeBubble(0, 62, 'STUDYING', this.pal.light ? '#ffffff' : '#1b1246', kind.css));
    }

    root.setSize(110, 100);
    root.setInteractive({ useHandCursor: true });
    root.on(
      'pointerdown',
      (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.walkTo(p.x, p.y + 62); // stroll up to it — the card opens on arrival
      },
    );

    layer.add(root);
    this.nodes.push({ station: p, root, frame });
  }

  private drawFrame(g: Phaser.GameObjects.Graphics, p: PlacedStation, near: boolean) {
    const kind = this.pal.kind[p.kind];
    g.clear();
    g.fillStyle(0x000000, 0.14);
    g.fillRoundedRect(-52, -44, 104, 96, 16); // soft drop shadow
    g.fillStyle(this.pal.card, 1);
    g.fillRoundedRect(-52, -48, 104, 96, 16);
    g.lineStyle(2, near || p.active ? kind.color : this.pal.border, 1);
    g.strokeRoundedRect(-52, -48, 104, 96, 16);
  }

  // ── The buddy ──

  private createBuddy() {
    const { spawn } = this.layout;
    // One walk clip per direction: sheet columns are directions, rows are the
    // four animation frames, so a direction's frames are col, col+4, col+8, col+12.
    const walkKey = buddyTextureKey(this.args.animalId, 'walk');
    BUDDY_DIRS.forEach((dir, col) => {
      const key = `${walkKey}-${dir}`;
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(walkKey, {
          frames: [col, col + 4, col + 8, col + 12],
        }),
        frameRate: 8,
        repeat: -1,
      });
    });

    // Container origin = the buddy's feet on the road.
    this.buddy = this.add.container(spawn.x, spawn.y).setDepth(10);
    this.buddy.add(this.add.ellipse(0, 3, 40, 10, 0x000000, 0.28));
    // 16px pixel-art frame, scaled up; the buddy grows a little per stage.
    this.sprite = this.add
      .sprite(0, 3, buddyTextureKey(this.args.animalId, 'idle'), 0)
      .setOrigin(0.5, 1)
      .setScale(4.5 + this.args.stage * 0.35);
    this.buddy.add(this.sprite);
    this.buddy.add(
      this.add
        .text(0, 16, this.args.buddyName, {
          fontFamily: FONT,
          fontSize: '10px',
          fontStyle: 'bold',
          color: this.pal.textCss,
          backgroundColor: this.pal.cardCss,
          padding: { x: 6, y: 2 },
          resolution: this.args.dpr,
        })
        .setOrigin(0.5, 0),
    );
  }

  /** Play the right clip for the current motion: 4-direction walk or a still
   *  idle frame facing wherever the buddy last walked. */
  private applyAnim(moving: boolean) {
    if (moving) {
      this.walking = true;
      this.sprite.play(`${buddyTextureKey(this.args.animalId, 'walk')}-${this.facing}`, true);
    } else if (this.walking) {
      this.walking = false;
      this.sprite.stop();
      this.sprite.setTexture(buddyTextureKey(this.args.animalId, 'idle'), BUDDY_DIRS.indexOf(this.facing));
    }
  }

  private walkTo(x: number, y: number) {
    this.target = snapToRoad(this.layout.pathPts, x, y);
  }

  // ── Simulation ──

  update(_time: number, dtMs: number) {
    if (!this.ready) return;
    const dt = Math.min(dtMs / 1000, 0.05);
    const { pathPts, worldW, worldH } = this.layout;

    let vx = 0, vy = 0;
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    if (left || right || up || down) {
      this.target = null; // keyboard overrides tap-to-walk
      vx = (right ? 1 : 0) - (left ? 1 : 0);
      vy = (down ? 1 : 0) - (up ? 1 : 0);
      const len = Math.hypot(vx, vy) || 1;
      vx = (vx / len) * SPEED;
      vy = (vy / len) * SPEED;
    } else if (this.target) {
      const dx = this.target.x - this.buddy.x, dy = this.target.y - this.buddy.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) this.target = null;
      else {
        vx = (dx / dist) * SPEED;
        vy = (dy / dist) * SPEED;
      }
    }

    const nx = Math.min(Math.max(this.buddy.x + vx * dt, 44), worldW - 44);
    const ny = Math.min(Math.max(this.buddy.y + vy * dt, 50), worldH - 50);
    // No wandering into the grass — slide along the road's edge.
    const pos = snapToRoad(pathPts, nx, ny);
    this.buddy.setPosition(pos.x, pos.y);

    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      this.facing = Math.abs(vx) >= Math.abs(vy)
        ? (vx > 0 ? 'right' : 'left')
        : (vy > 0 ? 'down' : 'up');
    }
    this.applyAnim(moving);

    this.targetMark.setVisible(Boolean(this.target));
    if (this.target) this.targetMark.setPosition(this.target.x, this.target.y);

    // Nearest station within reach → tell React (rare change).
    let best: StationNode | null = null;
    let bestD = REACH;
    for (const n of this.nodes) {
      const d = Math.hypot(n.station.x - this.buddy.x, n.station.y - this.buddy.y);
      if (d < bestD) { best = n; bestD = d; }
    }
    const id = best?.station.id ?? null;
    if (id !== this.nearestId) {
      const prev = this.nodes.find((n) => n.station.id === this.nearestId);
      if (prev) {
        this.drawFrame(prev.frame, prev.station, false);
        this.tweens.add({ targets: prev.root, scale: 1, duration: 150 });
      }
      if (best) {
        this.drawFrame(best.frame, best.station, true);
        this.tweens.add({ targets: best.root, scale: 1.08, duration: 150, ease: 'back.out' });
      }
      this.nearestId = id;
      this.game.events.emit(WORLD_EVENTS.near, id);
    }
  }
}
