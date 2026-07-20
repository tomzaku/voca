import Phaser from 'phaser';
import {
  CREATE_STATION_ID, WORLD_EVENTS,
  type ThemeId, type WorldArea, type WorldSnapshot, type WorldStation,
} from '../types';
import { FEATURE_ID_PREFIX, featureNodeId, type WorldFeature } from '../features';
import { defaultMap } from '../maps';
import { worldPalette, FONT, type WorldPalette } from '../palette';
import {
  buddySpec, type BuddyLook, type BuddySpec,
  CUTE_MONSTERS, SCARY_MONSTERS, monsterTextureKey, loadMonsterTextures,
  type BuddyDir, type MonsterId,
} from '../textures';

export interface WorldSceneData {
  stations: WorldStation[];
  /** App pages placed as buildings you walk up to. Static for the game's life. */
  features: WorldFeature[];
  /** The sprite that walks the map: companion animal or hero look. */
  look: BuddyLook;
  stage: number;
  buddyName: string;
  /** Device pixel ratio: the canvas renders at native res, the camera zooms by
   *  this factor, and text rasterizes at this resolution — all to stay sharp. */
  dpr: number;
}

const SPEED = 360;      // buddy speed, px/s
const REACH = 110;      // distance at which a building "opens"
const SCALE = 1;        // 32px tiles drawn 1:1 — pixel-perfect at any DPI
const NIGHT_TINT = 0x8d92c4; // dims the day-lit tile art in dark mode

const KIND_EMOJI = { mine: '👤', joined: '👥', level: '🎓' } as const;

interface PlacedStation extends WorldStation {
  x: number;
  y: number;
}

interface StationNode {
  station: PlacedStation;
  root: Phaser.GameObjects.Container;
  /** Highlight ring shown when the buddy is in reach. */
  ring: Phaser.GameObjects.Arc;
}

interface MapMeta {
  spawn: { x: number; y: number };
  doors: { x: number; y: number }[];
  labels: { x: number; y: number; text: string; theme: ThemeId }[];
  slots: Record<'public' | 'system' | 'feature', { x: number; y: number; slot: number }[]>;
}

/**
 * The explorable world, driven entirely by a Tiled map template (see
 * src/game/maps.ts and scripts/generate-world-map.mjs for the contract):
 * tile layers paint the world, `walls` tiles block movement, and the map's
 * object layer provides the spawn point, area labels, door waypoints, and
 * station slots that collections are bound to at runtime.
 *
 * The scene owns the simulation only: movement, collision, camera, proximity.
 * It reports the nearest station on `game.events` (WORLD_EVENTS) and the React
 * shell around the canvas renders all real UI (station card, HUD, modals).
 */
export class WorldScene extends Phaser.Scene {
  static readonly KEY = 'world';

  private args!: WorldSceneData;
  private spec!: BuddySpec;
  private pal!: WorldPalette;
  private ready = false;

  private map?: Phaser.Tilemaps.Tilemap;
  private worldLayer?: Phaser.GameObjects.Container;
  private nodes: StationNode[] = [];
  /** Collision grid from the map's `walls` layer, indexed [tileY][tileX]. */
  private blocked: boolean[][] = [];
  private meta!: MapMeta;
  private worldW = 0;
  private worldH = 0;
  /** On-screen size of one map tile — read from the template, not assumed. */
  private tilePx = 32;

  private buddy!: Phaser.GameObjects.Container;
  private sprite!: Phaser.GameObjects.Sprite;
  private facing: BuddyDir = 'down';
  /** Waypoints for tap-to-walk (routed through doors across areas). */
  private route: number[][] = [];
  private targetMark!: Phaser.GameObjects.Arc;
  private nearestId: string | null = null;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;

  /** The map's areas (split by the doors) and which one the buddy is in. */
  private areas: WorldArea[] = [];
  private areaIndex = 0;
  /** True while a gate fade is running, so we don't retrigger mid-transition. */
  private crossing = false;
  private lastMoveEmit = 0;

  constructor() {
    super(WorldScene.KEY);
  }

  init(data: WorldSceneData) {
    this.args = data;
    this.spec = buddySpec(data.look);
  }

  preload() {
    const src = defaultMap();
    this.load.image(`tiles-${src.key}`, src.tilesetUrl);
    this.load.tilemapTiledJSON(`map-${src.key}`, src.tmjUrl);
    this.spec.load(this);
    loadMonsterTextures(this);
  }

  create() {
    this.pal = worldPalette();
    this.spec.prepare?.(this); // e.g. compose the avatar sheet from its layers
    this.cameras.main.setZoom(this.args.dpr);
    this.cameras.main.setRoundPixels(true);
    // Belt and braces: the pixelArt config flag doesn't reliably reach
    // runtime-loaded sheets, and linear filtering blurs 16px art badly.
    const src = defaultMap();
    this.textures.get(`tiles-${src.key}`).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get(this.spec.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
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

    // Tap the ground → walk there (through a door if it's another area).
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

  /** Fast travel: fade out, drop the buddy at the station's door, fade in. */
  travelTo(stationId: string) {
    if (!this.ready) return;
    const node = this.nodes.find((n) => n.station.id === stationId);
    if (!node) return;
    const spot = this.clampToWalkable(node.station.x, node.station.y + 50)
      ?? { x: node.station.x, y: node.station.y + 50 };
    this.route = [];
    const cam = this.cameras.main;
    const [r, g, b] = this.pal.light ? [255, 255, 255] : [0, 0, 0];
    // A travel may interrupt a travel: clear the old fade and its handler.
    cam.off(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE);
    cam.resetFX();
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.buddy.setPosition(spot.x, spot.y);
      // Fast travel can land in another area — move the camera's room with it.
      this.enterArea(this.areaIndexFor(spot.y));
      // Re-follow to snap the camera instead of lerping across the map.
      cam.startFollow(this.buddy, true, 0.12, 0.12);
      cam.fadeIn(200, r, g, b);
    });
    cam.fadeOut(150, r, g, b);
  }

  // ── Areas & gates ──

  /** Split the map into the strips between doors, named by the label inside. */
  private computeAreas(): WorldArea[] {
    const cuts = this.meta.doors.map((d) => d.y).sort((a, b) => a - b);
    const edges = [0, ...cuts, this.worldH];
    const areas: WorldArea[] = [];
    for (let i = 0; i < edges.length - 1; i++) {
      const top = edges[i];
      const bottom = edges[i + 1];
      const label = this.meta.labels.find((l) => l.y >= top && l.y < bottom);
      areas.push({ name: label?.text ?? `Area ${i + 1}`, theme: label?.theme ?? 'forest', top, bottom });
    }
    return areas;
  }

  private areaIndexFor(y: number): number {
    const i = this.areas.findIndex((a) => y >= a.top && y < a.bottom);
    if (i !== -1) return i;
    return y < 0 ? 0 : Math.max(0, this.areas.length - 1);
  }

  private applyCameraBounds() {
    const a = this.areas[this.areaIndex];
    if (a) this.cameras.main.setBounds(0, a.top, this.worldW, a.bottom - a.top);
    else this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
  }

  private enterArea(index: number) {
    const changed = index !== this.areaIndex;
    this.areaIndex = index;
    this.applyCameraBounds();
    const area = this.areas[index];
    // Only announce a genuinely new area — fast travel inside one shouldn't.
    if (area && changed) this.game.events.emit(WORLD_EVENTS.area, { index, area });
  }

  /** Step through the gate between two areas: fade, place the buddy just inside
   *  the new one, fade back in. */
  private crossGate(next: number) {
    const south = next > this.areaIndex;
    const boundary = south ? this.areas[this.areaIndex].bottom : this.areas[this.areaIndex].top;
    const door = this.meta.doors.reduce<{ x: number; y: number } | null>(
      (best, d) => (!best || Math.abs(d.y - boundary) < Math.abs(best.y - boundary) ? d : best),
      null,
    );
    if (!door) { this.enterArea(next); return; }

    this.crossing = true;
    this.route = [];
    const cam = this.cameras.main;
    const [r, g, b] = this.pal.light ? [255, 255, 255] : [0, 0, 0];
    cam.off(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE);
    cam.resetFX();
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const lead = this.tilePx * 3; // land clear of the crossing, not on it
      const spot = this.clampToWalkable(door.x, south ? door.y + lead : door.y - lead)
        ?? { x: door.x, y: south ? door.y + lead : door.y - lead };
      this.buddy.setPosition(spot.x, spot.y);
      this.enterArea(next);
      cam.startFollow(this.buddy, true, 0.12, 0.12);
      cam.fadeIn(220, r, g, b);
      this.crossing = false;
    });
    cam.fadeOut(180, r, g, b);
  }

  /** Everything the React minimap needs. Positions are world pixels. */
  snapshot(): WorldSnapshot {
    return {
      worldW: this.worldW,
      worldH: this.worldH,
      areas: this.areas,
      nodes: this.nodes.map((n) => ({
        id: n.station.id,
        x: n.station.x,
        y: n.station.y,
        kind: n.station.id === CREATE_STATION_ID
          ? 'create'
          : n.station.id.startsWith(FEATURE_ID_PREFIX)
            ? 'feature'
            : n.station.kind,
      })),
    };
  }

  // ── World construction ──

  private buildWorld() {
    const src = defaultMap();
    this.map?.destroy();
    this.worldLayer?.destroy();
    this.nodes = [];

    const map = this.make.tilemap({ key: `map-${src.key}` });
    this.map = map;
    const tiles = map.addTilesetImage(src.tilesetName, `tiles-${src.key}`)!;
    for (const name of ['ground', 'decor', 'walls'] as const) {
      const layer = map.createLayer(name, tiles)!;
      layer.setScale(SCALE).setDepth(0);
      // Night falls on the same (day-lit) art. GPU tilemap layers have no tint.
      if (!this.pal.light && layer instanceof Phaser.Tilemaps.TilemapLayer) {
        layer.setTint(NIGHT_TINT);
      }
    }
    this.worldW = map.widthInPixels * SCALE;
    this.worldH = map.heightInPixels * SCALE;
    this.tilePx = map.tileWidth * SCALE;

    // Collision straight from the walls layer.
    const walls = map.getLayer('walls')!;
    this.blocked = walls.data.map((row) => row.map((t) => t.index > 0));

    this.meta = this.readMeta(map);

    const layer = this.add.container(0, 0).setDepth(1);
    this.worldLayer = layer;

    for (const l of this.meta.labels) {
      layer.add(
        this.add
          .text(l.x, l.y, l.text, {
            fontFamily: FONT,
            fontSize: '12px',
            fontStyle: 'bold',
            color: this.pal.zones[l.theme].labelCss,
            backgroundColor: this.pal.cardCss,
            padding: { x: 10, y: 4 },
            resolution: this.args.dpr,
          })
          .setOrigin(0, 0.5),
      );
    }

    // Bind collections to the template's station slots: public collections
    // fill the public slots in order, levels fill the system slots.
    const pub = this.args.stations.filter((s) => s.kind !== 'level');
    const sys = this.args.stations.filter((s) => s.kind === 'level');
    let cute = 0, scary = 0;
    const bind = (list: WorldStation[], slots: MapMeta['slots']['public']) => {
      list.forEach((s, i) => {
        const slot = slots[i];
        if (!slot) {
          console.warn(`[voca] world template has no free ${s.kind} slot for "${s.name}"`);
          return;
        }
        const placed: PlacedStation = { ...s, x: slot.x, y: slot.y };
        const monster: MonsterId = s.kind === 'level'
          ? SCARY_MONSTERS[Math.min(scary++, SCARY_MONSTERS.length - 1)]
          : CUTE_MONSTERS[cute++ % CUTE_MONSTERS.length];
        this.addStation(layer, placed, monster);
      });
    };
    bind(pub, this.meta.slots.public);
    bind(sys, this.meta.slots.system);

    // App pages: fixed buildings bound to the template's feature slots.
    this.args.features.forEach((f, i) => {
      const slot = this.meta.slots.feature[i];
      if (slot) this.addFeature(layer, f, slot.x, slot.y);
    });

    // The next empty house up north is a build plot: walk up (or fast travel)
    // to start a new collection there.
    const free = this.meta.slots.public[pub.length];
    if (free) this.addCreateSpot(layer, free.x, free.y);

    // Each area is its own "room": the camera is locked to the strip the buddy
    // is standing in, so crossing a gate reads as arriving somewhere new.
    this.areas = this.computeAreas();
    this.areaIndex = this.areaIndexFor(this.buddy ? this.buddy.y : this.meta.spawn.y);
    this.applyCameraBounds();
    this.cameras.main.setBackgroundColor(this.pal.void);

    // A rebuild can move walls under the buddy — reel it back in if so.
    if (this.buddy && !this.canStand(this.buddy.x, this.buddy.y)) {
      this.buddy.setPosition(this.meta.spawn.x, this.meta.spawn.y);
    }
    this.route = [];
  }

  /** Pull spawn/doors/labels/station slots out of the map's object layer. */
  private readMeta(map: Phaser.Tilemaps.Tilemap): MapMeta {
    const meta: MapMeta = {
      spawn: { x: this.worldW / 2, y: this.worldH / 2 },
      doors: [],
      labels: [],
      slots: { public: [], system: [], feature: [] },
    };
    type TiledProp = { name: string; value: unknown };
    const objects = map.getObjectLayer('meta')?.objects ?? [];
    for (const obj of objects) {
      const props = (obj.properties ?? []) as TiledProp[];
      const get = (name: string) => props.find((p) => p.name === name)?.value;
      const x = (obj.x ?? 0) * SCALE;
      const y = (obj.y ?? 0) * SCALE;
      switch (obj.type) {
        case 'spawn':
          meta.spawn = { x, y };
          break;
        case 'door':
          meta.doors.push({ x, y });
          break;
        case 'label': {
          const t = get('theme');
          meta.labels.push({
            x, y,
            text: String(get('text') ?? ''),
            theme: t === 'desert' ? 'desert' : t === 'snow' ? 'snow' : 'forest',
          });
          break;
        }
        case 'station': {
          const raw = get('region');
          const region = raw === 'system' ? 'system' : raw === 'feature' ? 'feature' : 'public';
          meta.slots[region].push({ x, y, slot: Number(get('slot') ?? 0) });
          break;
        }
      }
    }
    meta.slots.public.sort((a, b) => a.slot - b.slot);
    meta.slots.system.sort((a, b) => a.slot - b.slot);
    meta.slots.feature.sort((a, b) => a.slot - b.slot);
    return meta;
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

    const metaLine = `${p.words.length} words${p.learners ? ` · ${p.learners} 👥` : ''}`;
    root.add(
      this.add
        .text(0, 36, metaLine, {
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

  /** The "build a new collection" plot: a plus marker that behaves like a
   *  station (ring, proximity event) but is handled by React as a create CTA. */
  private addCreateSpot(layer: Phaser.GameObjects.Container, x: number, y: number) {
    const kind = this.pal.kind.mine;
    const root = this.add.container(x, y);

    const ring = this.add
      .circle(0, -12, 30)
      .setStrokeStyle(2.5, kind.color, 0.9)
      .setFillStyle(kind.color, 0.10)
      .setVisible(false);
    root.add(ring);

    root.add(this.add.ellipse(0, 2, 30, 8, 0x000000, 0.25));
    const disc = this.add
      .circle(0, -16, 15, kind.color, 0.16)
      .setStrokeStyle(2.5, kind.color, 0.95);
    root.add(disc);
    root.add(
      this.add
        .text(0, -16, '+', {
          fontFamily: FONT,
          fontSize: '20px',
          fontStyle: 'bold',
          color: kind.css,
          resolution: this.args.dpr,
        })
        .setOrigin(0.5, 0.52),
    );
    this.tweens.add({
      targets: disc,
      scale: { from: 1, to: 1.12 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });

    root.add(
      this.add
        .text(0, 12, '🏗️ New collection', {
          fontFamily: FONT,
          fontSize: '10px',
          fontStyle: 'bold',
          color: this.pal.textCss,
          backgroundColor: this.pal.cardCss,
          padding: { x: 7, y: 3 },
          resolution: this.args.dpr,
        })
        .setOrigin(0.5, 0),
    );

    const station: PlacedStation = {
      id: CREATE_STATION_ID, name: 'New collection', kind: 'mine',
      words: [], pct: 0, active: false, x, y,
    };
    root.setSize(84, 80);
    root.setInteractive({ useHandCursor: true });
    root.on(
      'pointerdown',
      (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.routeTo(x, y + 50);
      },
    );

    layer.add(root);
    this.nodes.push({ station, root, ring });
  }

  /** An app page as a little building: walk up and React opens its card, whose
   *  "Enter" navigates to the page's route. Behaves like a station for
   *  proximity, but carries no words/progress. */
  private addFeature(layer: Phaser.GameObjects.Container, f: WorldFeature, x: number, y: number) {
    const poi = this.pal.poi;
    const root = this.add.container(x, y);

    const ring = this.add
      .circle(0, -14, 32)
      .setStrokeStyle(2.5, poi.color, 0.9)
      .setFillStyle(poi.color, 0.10)
      .setVisible(false);
    root.add(ring);

    // The map paints the study tower itself — this is just the sign at its door.
    root.add(this.add.ellipse(0, 2, 30, 8, 0x000000, 0.25));
    const disc = this.add
      .circle(0, -16, 15, poi.color, 0.18)
      .setStrokeStyle(2.5, poi.color, 0.95);
    root.add(disc);
    root.add(
      this.add
        .text(0, -16, f.emoji, { fontFamily: FONT, fontSize: '15px', resolution: this.args.dpr })
        .setOrigin(0.5, 0.55),
    );

    root.add(
      this.add
        .text(0, 10, f.name, {
          fontFamily: FONT,
          fontSize: '10px',
          fontStyle: 'bold',
          color: this.pal.textCss,
          backgroundColor: this.pal.cardCss,
          padding: { x: 7, y: 3 },
          resolution: this.args.dpr,
        })
        .setOrigin(0.5, 0),
    );

    const station: PlacedStation = {
      id: featureNodeId(f), name: f.name, kind: 'mine',
      words: [], pct: 0, active: false, x, y,
    };
    root.setSize(84, 84);
    root.setInteractive({ useHandCursor: true });
    root.on(
      'pointerdown',
      (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.routeTo(x, y + 50);
      },
    );

    layer.add(root);
    this.nodes.push({ station, root, ring });
  }

  // ── The buddy ──

  private createBuddy() {
    const { spawn } = this.meta;
    // Directional idle and run clips, from the look's spec (animals: animated
    // 4-frame idles and 8-frame runs; the avatar: static idle, 4-frame walk).
    const { key: texKey, anims, rates } = this.spec;
    for (const [dir, clips] of Object.entries(anims)) {
      for (const [anim, frames] of Object.entries(clips)) {
        const key = `${texKey}-${anim}-${dir}`;
        if (this.anims.exists(key)) continue;
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(texKey, { frames }),
          frameRate: rates[anim as 'idle' | 'run'],
          repeat: -1,
        });
      }
    }

    // Container origin = the buddy's feet.
    this.buddy = this.add.container(spawn.x, spawn.y).setDepth(10);
    this.buddy.add(this.add.ellipse(0, 2, 23, 6, 0x000000, 0.28));
    // Pixel-art frame, scaled up; the buddy grows a little per stage.
    this.sprite = this.add
      .sprite(0, 2, texKey, 0)
      .setOrigin(0.5, 1)
      .setScale(this.spec.baseScale * (1.3 + this.args.stage * 0.1));
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

  /** Play the right clip for the current motion: directional run while moving,
   *  animated directional idle when standing. */
  private applyAnim(moving: boolean) {
    const key = `${this.spec.key}-${moving ? 'run' : 'idle'}-${this.facing}`;
    this.sprite.play(key, true);
  }

  // ── Movement ──

  private canStand(x: number, y: number): boolean {
    const tile = this.tilePx;
    const tx = Math.floor(x / tile);
    const ty = Math.floor(y / tile);
    const row = this.blocked[ty];
    if (row === undefined || row[tx] === undefined) return false;
    return !row[tx];
  }

  /** Nearest standable point to (x, y), searching outward tile by tile. */
  private clampToWalkable(x: number, y: number): { x: number; y: number } | null {
    if (this.canStand(x, y)) return { x, y };
    const tile = this.tilePx;
    const tx = Math.floor(x / tile);
    const ty = Math.floor(y / tile);
    for (let r = 1; r <= 6; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const cx = (tx + dx + 0.5) * tile;
          const cy = (ty + dy + 0.5) * tile;
          if (this.canStand(cx, cy)) return { x: cx, y: cy };
        }
      }
    }
    return null;
  }

  /** Walk to (x, y), detouring through a door when crossing areas. */
  private routeTo(x: number, y: number) {
    const target = this.clampToWalkable(x, y);
    if (!target) return;
    const route: number[][] = [];
    // Every door whose horizontal wall line separates buddy and target has to
    // be crossed. Walk them in travel order — with three areas a trip can span
    // two rivers, and heading for the far door first would run into the near
    // one's wall.
    const southbound = target.y > this.buddy.y;
    const crossed = this.meta.doors
      .filter((d) => (this.buddy.y < d.y) !== (target.y < d.y))
      .sort((a, b) => (southbound ? a.y - b.y : b.y - a.y));
    for (const d of crossed) {
      const lead = this.tilePx * 2.5; // far enough to land on the banks, not mid-crossing
      route.push(...(southbound
        ? [[d.x, d.y - lead], [d.x, d.y + lead]]
        : [[d.x, d.y + lead], [d.x, d.y - lead]]));
    }
    route.push([target.x, target.y]);
    this.route = route;
  }

  update(time: number, dtMs: number) {
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

    // ── Gates ── stepping over a door's line carries you into the next area.
    if (!this.crossing && this.areas.length > 1) {
      const idx = this.areaIndexFor(this.buddy.y);
      if (idx !== this.areaIndex) this.crossGate(idx);
    }

    // Feed the minimap (throttled — it only needs a rough position).
    if (time - this.lastMoveEmit > 100) {
      this.lastMoveEmit = time;
      this.game.events.emit(WORLD_EVENTS.moved, {
        x: this.buddy.x, y: this.buddy.y, areaIndex: this.areaIndex,
      });
    }

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
