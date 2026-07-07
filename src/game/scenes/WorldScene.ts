import Phaser from 'phaser';
import type { AnimalId } from '../../lib/companion';
import { WORLD_EVENTS, type WorldStation } from '../types';
import {
  computeLayout, clampToRects, rectContains,
  REACH, SPEED, WALL,
  type PlacedStation, type Room, type WorldLayout, type ZoneId,
} from '../layout';
import { worldPalette, FONT, type WorldPalette } from '../palette';
import {
  BUDDY_DIRS, buddyTextureKey, loadBuddyTexture, ensureDotsTexture,
  CUTE_MONSTERS, SCARY_MONSTERS, monsterTextureKey, loadMonsterTextures,
  type BuddyDir, type MonsterId,
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

const THEME_DECOR = {
  forest: ['🌲', '🌳', '🌼', '🍄', '🪨', '🦋', '🌷', '🌾'],
  desert: ['🌵', '🪨', '🦎', '🌾', '🏺', '🌵'],
} as const;

interface StationNode {
  station: PlacedStation;
  root: Phaser.GameObjects.Container;
  /** Highlight ring shown when the buddy is in reach. */
  ring: Phaser.GameObjects.Arc;
}

/**
 * The explorable world: two walled rooms (forest = Public, desert = System)
 * with free Gather-style movement inside them and a doorway between. The scene
 * owns the simulation only: movement, collision, camera, proximity. It reports
 * the nearest station on `game.events` (WORLD_EVENTS) and the React shell
 * around the canvas renders all real UI (station card, HUD, modals) from that.
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
  /** Waypoints for tap-to-walk (routed through the door across rooms). */
  private route: number[][] = [];
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
    loadMonsterTextures(this);
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
    for (const m of [...CUTE_MONSTERS, ...SCARY_MONSTERS]) {
      this.textures.get(monsterTextureKey(m)).setFilter(Phaser.Textures.FilterMode.NEAREST);
      // Facing-down walk cycle doubles as the monster's idle bounce.
      const anim = `${monsterTextureKey(m)}-bob`;
      if (!this.anims.exists(anim)) {
        this.anims.create({
          key: anim,
          frames: this.anims.generateFrameNumbers(monsterTextureKey(m), { frames: [0, 4, 8, 12] }),
          frameRate: 5,
          repeat: -1,
        });
      }
    }

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = kb.addKeys('W,A,S,D') as WorldScene['wasd'];
    // Stop arrows/space from scrolling the page while the world has the screen.
    kb.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE']);

    // Tap the ground → walk there (through the door if it's the other room).
    this.input.on(
      'pointerdown',
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (over.length > 0) return; // a station handled it
        this.routeTo(pointer.worldX, pointer.worldY);
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
    const { worldW, worldH, rooms, door, placed } = this.layout;

    this.worldLayer?.destroy();
    this.nodes = [];
    const layer = this.add.container(0, 0).setDepth(0);
    this.worldLayer = layer;

    // The void outside the rooms.
    layer.add(this.add.rectangle(0, 0, worldW, worldH, this.pal.void).setOrigin(0));

    for (const room of rooms) this.drawRoom(layer, room);

    // Doorway: ground drawn over the walls opens the passage; half per biome.
    const topHalf = rooms[0].rect.y + rooms[0].rect.h - door.y;
    layer.add(
      this.add
        .rectangle(door.x, door.y, door.w, topHalf, this.pal.zones.forest.base)
        .setOrigin(0),
    );
    layer.add(
      this.add
        .rectangle(door.x, door.y + topHalf, door.w, door.h - topHalf, this.pal.zones.desert.base)
        .setOrigin(0),
    );

    // Each collection is a resident monster: cute ones in the Public forest,
    // progressively scarier ones for the System levels.
    let cute = 0, scary = 0;
    for (const p of placed) {
      const monster: MonsterId = p.kind === 'level'
        ? SCARY_MONSTERS[Math.min(scary++, SCARY_MONSTERS.length - 1)]
        : CUTE_MONSTERS[cute++ % CUTE_MONSTERS.length];
      this.addStation(layer, p, monster);
    }

    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBackgroundColor(this.pal.void);

    // A rebuild can move the rooms out from under the buddy — reel it back in.
    if (this.buddy) {
      const pos = clampToRects(this.layout.walk, this.buddy.x, this.buddy.y);
      this.buddy.setPosition(pos.x, pos.y);
    }
    this.route = [];
  }

  private drawRoom(layer: Phaser.GameObjects.Container, room: Room) {
    const zone = this.pal.zones[room.theme];
    const { x, y, w, h } = room.rect;

    layer.add(this.add.rectangle(x, y, w, h, zone.base).setOrigin(0));

    // Lighter ground patches.
    const patches = this.add.graphics();
    patches.fillStyle(zone.patch, zone.patchAlpha);
    for (let i = 0; i < Math.ceil(w / 420); i++) {
      patches.fillEllipse(
        x + 210 + i * 420 + ((i * 97) % 90),
        y + (i % 2 === 0 ? 0.32 : 0.68) * h,
        380, 240,
      );
    }
    layer.add(patches);

    // Speckle texture, per biome and theme.
    const dotsKey = `dots-${room.theme}-${this.pal.light ? 'l' : 'd'}`;
    ensureDotsTexture(this, dotsKey, zone.dotRgba);
    layer.add(this.add.tileSprite(x, y, w, h, dotsKey).setOrigin(0));

    // Decor along the top and bottom of the room, clear of the door.
    const decor = THEME_DECOR[room.theme];
    const doorGap = (px: number) => Math.abs(px - (this.layout.door.x + this.layout.door.w / 2)) < 110;
    for (let dx = 46, i = 0; dx < w - 40; dx += 120, i++) {
      const px = x + dx + ((i * 37) % 36);
      layer.add(
        this.add
          .text(px, y + 34 + ((i * 23) % 16), decor[i % decor.length], {
            fontSize: `${18 + ((i * 13) % 8)}px`,
            resolution: this.args.dpr,
          })
          .setOrigin(0.5),
      );
      if (!doorGap(px)) {
        layer.add(
          this.add
            .text(px + 24, y + h - 22 - ((i * 31) % 14), decor[(i + 3) % decor.length], {
              fontSize: `${16 + ((i * 7) % 8)}px`,
              resolution: this.args.dpr,
            })
            .setOrigin(0.5),
        );
      }
    }

    // Walls.
    const wall = this.add.graphics();
    wall.lineStyle(WALL, zone.wall, 1);
    wall.strokeRoundedRect(x + WALL / 2, y + WALL / 2, w - WALL, h - WALL, 14);
    layer.add(wall);

    // Room label, Gather-style, pinned to the top-left corner.
    layer.add(
      this.add
        .text(x + 16, y + 14, room.label, {
          fontFamily: FONT,
          fontSize: '12px',
          fontStyle: 'bold',
          color: zone.labelCss,
          backgroundColor: this.pal.cardCss,
          padding: { x: 10, y: 4 },
          resolution: this.args.dpr,
        })
        .setOrigin(0),
    );
  }

  private addStation(layer: Phaser.GameObjects.Container, p: PlacedStation, monster: MonsterId) {
    const kind = this.pal.kind[p.kind];
    const root = this.add.container(p.x, p.y);

    // Highlight ring, lit while the buddy is in reach (always on when active).
    const ring = this.add
      .circle(0, -12, 30)
      .setStrokeStyle(2.5, kind.color, 0.9)
      .setFillStyle(kind.color, 0.10)
      .setVisible(p.active);
    root.add(ring);

    // The monster itself, idling with its walk-down bounce.
    root.add(this.add.ellipse(0, 2, 30, 8, 0x000000, 0.25));
    const sprite = this.add
      .sprite(0, 2, monsterTextureKey(monster), 0)
      .setOrigin(0.5, 1)
      .setScale(2.4);
    sprite.play({ key: `${monsterTextureKey(monster)}-bob`, delay: (p.x * 7 + p.y) % 400 });
    root.add(sprite);

    // Name pill under the monster, kind emoji inline.
    root.add(
      this.add
        .text(0, 12, `${KIND_EMOJI[p.kind]} ${p.name}`, {
          fontFamily: FONT,
          fontSize: '10px',
          fontStyle: 'bold',
          color: this.pal.textCss,
          backgroundColor: this.pal.cardCss,
          padding: { x: 7, y: 3 },
          align: 'center',
          wordWrap: { width: 110 },
          maxLines: 2,
          resolution: this.args.dpr,
        })
        .setOrigin(0.5, 0),
    );

    const meta = `${p.words.length} words${p.learners ? ` · ${p.learners} 👥` : ''}`;
    root.add(
      this.add
        .text(0, 36, meta, {
          fontFamily: FONT,
          fontSize: '8px',
          fontStyle: 'bold',
          color: this.pal.mutedCss,
          resolution: this.args.dpr,
        })
        .setOrigin(0.5, 0),
    );

    // Progress bar.
    const bar = this.add.graphics();
    bar.fillStyle(this.pal.track, 1);
    bar.fillRoundedRect(-28, 49, 56, 4, 2);
    if (p.pct > 0) {
      bar.fillStyle(kind.color, 1);
      bar.fillRoundedRect(-28, 49, Math.max(56 * (p.pct / 100), 5), 4, 2);
    }
    root.add(bar);

    if (p.active) {
      root.add(
        this.add
          .text(0, 58, 'STUDYING', {
            fontFamily: FONT,
            fontSize: '8px',
            fontStyle: 'bold',
            color: this.pal.light ? '#ffffff' : '#1b1246',
            backgroundColor: kind.css,
            padding: { x: 6, y: 2 },
            resolution: this.args.dpr,
          })
          .setOrigin(0.5, 0),
      );
    }

    root.setSize(84, 100);
    root.setInteractive({ useHandCursor: true });
    root.on(
      'pointerdown',
      (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.routeTo(p.x, p.y + 50); // stroll up to it — the card opens on arrival
      },
    );

    layer.add(root);
    this.nodes.push({ station: p, root, ring });
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
        frameRate: 11,
        repeat: -1,
      });
    });

    // Container origin = the buddy's feet.
    this.buddy = this.add.container(spawn.x, spawn.y).setDepth(10);
    this.buddy.add(this.add.ellipse(0, 2, 23, 6, 0x000000, 0.28));
    // 16px pixel-art frame, scaled up; the buddy grows a little per stage.
    this.sprite = this.add
      .sprite(0, 2, buddyTextureKey(this.args.animalId, 'idle'), 0)
      .setOrigin(0.5, 1)
      .setScale(2.55 + this.args.stage * 0.2);
    this.buddy.add(this.sprite);
    this.buddy.add(
      this.add
        .text(0, 10, this.args.buddyName, {
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

  // ── Movement ──

  private canStand(x: number, y: number): boolean {
    return this.layout.walk.some((r) => rectContains(r, x, y));
  }

  private zoneAt(x: number, y: number): ZoneId | null {
    for (const room of this.layout.rooms) {
      if (rectContains(room.rect, x, y)) return room.zone;
    }
    return null;
  }

  /** Walk to (x, y), detouring through the doorway when crossing rooms. */
  private routeTo(x: number, y: number) {
    const target = clampToRects(this.layout.walk, x, y);
    const from = this.zoneAt(this.buddy.x, this.buddy.y);
    const to = this.zoneAt(target.x, target.y);
    const route: number[][] = [];
    if (from && to && from !== to) {
      const d = this.layout.door;
      const cx = d.x + d.w / 2;
      const top = [cx, d.y + 10];
      const bottom = [cx, d.y + d.h - 10];
      route.push(...(from === 'public' ? [top, bottom] : [bottom, top]));
    }
    route.push([target.x, target.y]);
    this.route = route;
  }

  update(_time: number, dtMs: number) {
    if (!this.ready) return;
    const dt = Math.min(dtMs / 1000, 0.05);

    let vx = 0, vy = 0;
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    if (left || right || up || down) {
      this.route = []; // keyboard overrides tap-to-walk
      vx = (right ? 1 : 0) - (left ? 1 : 0);
      vy = (down ? 1 : 0) - (up ? 1 : 0);
      const len = Math.hypot(vx, vy) || 1;
      vx = (vx / len) * SPEED;
      vy = (vy / len) * SPEED;
    } else if (this.route.length > 0) {
      const [tx, ty] = this.route[0];
      const dx = tx - this.buddy.x, dy = ty - this.buddy.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) {
        this.route.shift();
      } else {
        vx = (dx / dist) * SPEED;
        vy = (dy / dist) * SPEED;
      }
    }

    // Walls: slide along them instead of stopping dead.
    const nx = this.buddy.x + vx * dt;
    const ny = this.buddy.y + vy * dt;
    if (this.canStand(nx, ny)) this.buddy.setPosition(nx, ny);
    else if (this.canStand(nx, this.buddy.y)) this.buddy.setX(nx);
    else if (this.canStand(this.buddy.x, ny)) this.buddy.setY(ny);

    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      this.facing = Math.abs(vx) >= Math.abs(vy)
        ? (vx > 0 ? 'right' : 'left')
        : (vy > 0 ? 'down' : 'up');
    }
    this.applyAnim(moving);

    const hasRoute = this.route.length > 0;
    this.targetMark.setVisible(hasRoute);
    if (hasRoute) {
      const [tx, ty] = this.route[this.route.length - 1];
      this.targetMark.setPosition(tx, ty);
    }

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
        prev.ring.setVisible(prev.station.active);
        this.tweens.add({ targets: prev.root, scale: 1, duration: 150 });
      }
      if (best) {
        best.ring.setVisible(true);
        this.tweens.add({ targets: best.root, scale: 1.12, duration: 150, ease: 'back.out' });
      }
      this.nearestId = id;
      this.game.events.emit(WORLD_EVENTS.near, id);
    }
  }
}
