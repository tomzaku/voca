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
const SCALE = 2;        // 16px Sunnyside art drawn 2× → 32px on-screen tiles
const NIGHT_TINT = 0x8d92c4; // dims the day-lit tile art in dark mode

/**
 * The map's painted layers in draw order, bottom first, with the two prop
 * layers sitting exactly where the source room had them — `Assets_2` behind the
 * forest, `Assets_1` in front of the buildings. Anything missing from the
 * template is skipped, so older templates still load.
 */
const WORLD_LAYERS = [
  'sea', 'clouds_02', 'land', 'paths', 'shadows', 'decoration_01',
  'Assets_2', 'forest', 'building', 'fences', 'decoration_02', 'decoration_03',
  'Assets_1', 'cloud_shadow', 'clouds_01',
] as const;
const PROP_LAYERS = new Set<string>(['Assets_1', 'Assets_2']);
const PROPS_KEY = 'world-props';

// Depths. Everything the template paints lives below NIGHT, so one veil dims
// the whole world; the buddy and the station markers sit above it.
const DEPTH_STEP = 10;
const DEPTH_SCENERY = WORLD_LAYERS.length * DEPTH_STEP;   // legacy meta windmills/animals
const DEPTH_NIGHT = DEPTH_SCENERY + 5;
const DEPTH_STATIONS = DEPTH_NIGHT + 10;
const DEPTH_MARK = DEPTH_STATIONS + 5;
const DEPTH_BUDDY = DEPTH_STATIONS + 10;

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
  windmills: { x: number; y: number }[];
  animals: { x: number; y: number; kind: string }[];
  slots: Record<'public' | 'system' | 'feature', { x: number; y: number; slot: number }[]>;
}

/** One loose scenery sprite the map's `props` object layer places. */
interface PropDef {
  /** Atlas frame prefix — frames are `${name}_0`, `${name}_1`, … */
  name: string;
  x: number;
  y: number;
  frames: number;
  fps: number;
  /** Origin as a fraction of the frame, carried over from GameMaker. */
  originX: number;
  originY: number;
  scaleX: number;
  scaleY: number;
  layer: string;
}

/** Animated scenery sprites the map places by object point: filename in
 *  public/game/props, square frame size, frame count and play rate. */
const WINDMILL = { key: 'windmill', url: 'game/props/windmill.png', frame: 112, frames: 9, rate: 12 };

/** Grazing animals: strip frame size, frame count, idle rate, draw scale, and
 *  wander speed (px/s) + roam radius (px) around their spawn point. */
const ANIMALS: Record<string, { frame: number; frames: number; rate: number; scale: number; speed: number; range: number }> = {
  chicken: { frame: 32, frames: 4, rate: 6, scale: 1.1, speed: 24, range: 100 },
  sheep:   { frame: 32, frames: 4, rate: 4, scale: 1.35, speed: 15, range: 80 },
  cow:     { frame: 32, frames: 4, rate: 4, scale: 1.6, speed: 13, range: 70 },
  pig:     { frame: 32, frames: 4, rate: 5, scale: 1.35, speed: 18, range: 80 },
  duck:    { frame: 16, frames: 4, rate: 6, scale: 1.3, speed: 22, range: 70 },
};

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

  /** Rebuilt whenever collections change: stations, features, the build plot.
   *  Everything else the world draws is built once and left alone. */
  private stationLayer?: Phaser.GameObjects.Container;
  /** Dims the day-lit tile art in dark mode, in place of a per-layer tint
   *  (GPU tilemap layers have none) — a multiply veil over the map bounds. */
  private nightVeil?: Phaser.GameObjects.Rectangle;
  /** Scenery that takes the night tint individually (it sits above the veil). */
  private tinted: Phaser.GameObjects.Sprite[] = [];
  /** Area labels, kept so a theme switch can recolor them in place. */
  private labels: { text: Phaser.GameObjects.Text; theme: ThemeId }[] = [];
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

  /** Grazing animals ambling around their spawn points. */
  private animals: {
    sprite: Phaser.GameObjects.Sprite; cfg: (typeof ANIMALS)[string];
    hx: number; hy: number; tx: number; ty: number; pause: number;
  }[] = [];

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
    // 112 scenery sprites (547 frames) in one atlas — one texture, one bind.
    this.load.atlas(PROPS_KEY, src.propsAtlasUrl, src.propsAtlasJsonUrl);
    this.load.spritesheet(WINDMILL.key, `${import.meta.env.BASE_URL}${WINDMILL.url}`, {
      frameWidth: WINDMILL.frame, frameHeight: WINDMILL.frame,
    });
    for (const [kind, cfg] of Object.entries(ANIMALS)) {
      this.load.spritesheet(`animal-${kind}`, `${import.meta.env.BASE_URL}game/props/${kind}.png`, {
        frameWidth: cfg.frame, frameHeight: cfg.frame,
      });
    }
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
    this.textures.get(PROPS_KEY).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get(this.spec.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get(WINDMILL.key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    for (const [kind, cfg] of Object.entries(ANIMALS)) {
      this.textures.get(`animal-${kind}`).setFilter(Phaser.Textures.FilterMode.NEAREST);
      if (!this.anims.exists(`animal-${kind}-idle`)) {
        this.anims.create({
          key: `animal-${kind}-idle`,
          frames: this.anims.generateFrameNumbers(`animal-${kind}`, { start: 0, end: cfg.frames - 1 }),
          frameRate: cfg.rate,
          repeat: -1,
        });
      }
    }
    if (!this.anims.exists('windmill-spin')) {
      this.anims.create({
        key: 'windmill-spin',
        frames: this.anims.generateFrameNumbers(WINDMILL.key, { start: 0, end: WINDMILL.frames - 1 }),
        frameRate: WINDMILL.rate,
        repeat: -1,
      });
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

    // Tap the ground → walk there (through a door if it's another area).
    this.input.on(
      'pointerdown',
      (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
        if (over.length > 0) return; // a station handled it
        this.routeTo(pointer.worldX, pointer.worldY);
      },
    );

    this.buildTerrain();
    this.buildStations();
    this.createBuddy();
    this.targetMark = this.add
      .circle(0, 0, 8)
      .setStrokeStyle(2.5, 0xffd23f)
      .setDepth(DEPTH_MARK)
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

  /** Swap the station data (progress ticked, collection created…) in place.
   *  Only the station markers are rebuilt — the terrain is untouched. */
  setStations(stations: WorldStation[]) {
    this.args.stations = stations;
    if (this.ready) this.buildStations();
  }

  /** Re-resolve colors from CSS variables after a theme switch. Terrain stays;
   *  only the night veil, scenery tints and the colored text are refreshed. */
  applyTheme() {
    if (!this.ready) return;
    this.pal = worldPalette();
    this.applyNight();
    for (const l of this.labels) {
      l.text.setColor(this.pal.zones[l.theme].labelCss).setBackgroundColor(this.pal.cardCss);
    }
    this.cameras.main.setBackgroundColor(this.pal.void);
    this.buildStations();
  }

  /** Point the day/night dressing at the current palette. */
  private applyNight() {
    const night = !this.pal.light;
    this.nightVeil?.setVisible(night);
    for (const s of this.tinted) {
      if (night) s.setTint(NIGHT_TINT); else s.clearTint();
    }
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

  /**
   * The parts of the world that never change: the tilemap itself, the collision
   * grid, the object-layer metadata and the animated scenery. Parsing the
   * template allocates a Tile object per cell per layer (~67k for the village),
   * so this runs exactly once per scene — station data changes go through
   * {@link buildStations} instead.
   */
  private buildTerrain() {
    const src = defaultMap();

    const map = this.make.tilemap({ key: `map-${src.key}` });
    const tiles = map.addTilesetImage(src.tilesetName, `tiles-${src.key}`)!;
    // Painted layers, sea → land → props (the `walls` layer is collision-only,
    // hidden in the template, and read below without being drawn).
    //
    // These go on the GPU path: one quad and one draw call per layer, with the
    // tile grid uploaded as a data texture, instead of the CPU walking visible
    // tiles every frame. The template fits its restrictions — a single
    // orthographic tileset, well under 4096² tiles — and it still animates the
    // sea. The one thing it gives up is tinting, so night falls via `nightVeil`.
    const gpu = this.game.renderer.type === Phaser.WEBGL;
    const props = this.readProps(map);
    WORLD_LAYERS.forEach((name, i) => {
      const depth = i * DEPTH_STEP;
      if (PROP_LAYERS.has(name)) {
        this.addProps(props.filter((p) => p.layer === name), depth);
        return;
      }
      const layer = map.createLayer(name, tiles, undefined, undefined, gpu);
      if (!layer) return;   // template doesn't paint this one
      layer.setScale(SCALE).setDepth(depth);
    });
    this.worldW = map.widthInPixels * SCALE;
    this.worldH = map.heightInPixels * SCALE;
    this.tilePx = map.tileWidth * SCALE;

    // Collision straight from the walls layer.
    const walls = map.getLayer('walls')!;
    this.blocked = walls.data.map((row) => row.map((t) => t.index > 0));

    this.meta = this.readMeta(map);

    // Night falls on the same (day-lit) art: a multiply veil across the map,
    // under everything the scene draws on top of the tiles.
    this.nightVeil = this.add
      .rectangle(0, 0, this.worldW, this.worldH, NIGHT_TINT)
      .setOrigin(0, 0)
      .setDepth(DEPTH_NIGHT)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setVisible(false);

    const layer = this.add.container(0, 0).setDepth(DEPTH_SCENERY);
    this.tinted = [];

    // Animated scenery: windmills turn where the map placed them (feet at the
    // point, drawn 2× to match the tiles' on-screen size, tinted at night).
    for (const w of this.meta.windmills) {
      const mill = this.add
        .sprite(w.x, w.y, WINDMILL.key, 0)
        .setOrigin(0.5, 1)
        .setScale(SCALE);
      mill.play('windmill-spin');
      layer.add(mill);
      this.tinted.push(mill);
    }

    // Grazing animals wandering their patch of grass.
    this.animals = [];
    for (const a of this.meta.animals) {
      const cfg = ANIMALS[a.kind] ?? ANIMALS.chicken;
      const sprite = this.add
        .sprite(a.x, a.y, `animal-${a.kind}`, 0)
        .setOrigin(0.5, 1)
        .setScale(cfg.scale)
        .setDepth(DEPTH_SCENERY);
      sprite.play(`animal-${a.kind}-idle`, true);
      layer.add(sprite);
      this.tinted.push(sprite);
      this.animals.push({ sprite, cfg, hx: a.x, hy: a.y, tx: a.x, ty: a.y, pause: Math.random() * 2000 });
    }

    this.labels = [];
    for (const l of this.meta.labels) {
      const text = this.add
        .text(l.x, l.y, l.text, {
          fontFamily: FONT,
          fontSize: '12px',
          fontStyle: 'bold',
          color: this.pal.zones[l.theme].labelCss,
          backgroundColor: this.pal.cardCss,
          padding: { x: 10, y: 4 },
          resolution: this.args.dpr,
        })
        .setOrigin(0, 0.5);
      layer.add(text);
      this.labels.push({ text, theme: l.theme });
    }

    // Each area is its own "room": the camera is locked to the strip the buddy
    // is standing in, so crossing a gate reads as arriving somewhere new.
    this.areas = this.computeAreas();
    this.areaIndex = this.areaIndexFor(this.meta.spawn.y);
    this.applyCameraBounds();
    this.cameras.main.setBackgroundColor(this.pal.void);
    this.applyNight();
  }

  /** The data-driven markers: collections, feature buildings and the build
   *  plot. Cheap enough to throw away and redo whenever collections change. */
  private buildStations() {
    this.stationLayer?.destroy();
    this.nodes = [];
    const layer = this.add.container(0, 0).setDepth(DEPTH_STATIONS);
    this.stationLayer = layer;

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

    // Carry the open station card across the rebuild: re-light the node the
    // buddy is standing at, or tell React it's gone if the collection was.
    const still = this.nodes.find((n) => n.station.id === this.nearestId);
    if (still) {
      still.ring.setVisible(true);
      still.root.setScale(1.12);
    } else if (this.nearestId !== null) {
      this.nearestId = null;
      this.game.events.emit(WORLD_EVENTS.near, null);
    }
  }

  /** Pull the loose scenery sprites out of the map's `props` object layer. */
  private readProps(map: Phaser.Tilemaps.Tilemap): PropDef[] {
    type TiledProp = { name: string; value: unknown };
    const out: PropDef[] = [];
    for (const obj of map.getObjectLayer('props')?.objects ?? []) {
      const props = (obj.properties ?? []) as TiledProp[];
      const num = (name: string, fallback: number) => {
        const v = props.find((p) => p.name === name)?.value;
        return typeof v === 'number' ? v : fallback;
      };
      out.push({
        name: obj.name,
        x: (obj.x ?? 0) * SCALE,
        y: (obj.y ?? 0) * SCALE,
        frames: num('frames', 1),
        fps: num('fps', 0),
        originX: num('originX', 0),
        originY: num('originY', 0),
        scaleX: num('scaleX', 1),
        scaleY: num('scaleY', 1),
        layer: String(props.find((p) => p.name === 'layer')?.value ?? ''),
      });
    }
    return out;
  }

  /**
   * Place one prop layer. Sprites share a single atlas texture, and each
   * distinct animated sprite gets one looping clip that every instance of it
   * plays — staggered, so a row of identical trees doesn't sway in lockstep.
   */
  private addProps(defs: PropDef[], depth: number) {
    for (const p of defs) {
      const frame = `${p.name}_0`;
      if (!this.textures.getFrame(PROPS_KEY, frame)) continue;   // atlas is stale
      const sprite = this.add
        .sprite(p.x, p.y, PROPS_KEY, frame)
        .setOrigin(p.originX, p.originY)
        .setScale(SCALE * p.scaleX, SCALE * p.scaleY)
        .setDepth(depth);

      if (p.frames > 1 && p.fps > 0) {
        const key = `prop-${p.name}`;
        if (!this.anims.exists(key)) {
          this.anims.create({
            key,
            frames: Array.from({ length: p.frames }, (_, i) => ({ key: PROPS_KEY, frame: `${p.name}_${i}` })),
            frameRate: p.fps,
            repeat: -1,
          });
        }
        sprite.play({ key, delay: (p.x * 13 + p.y * 7) % 900 });
      }
    }
  }

  /** Pull spawn/doors/labels/station slots out of the map's object layer. */
  private readMeta(map: Phaser.Tilemaps.Tilemap): MapMeta {
    const meta: MapMeta = {
      spawn: { x: this.worldW / 2, y: this.worldH / 2 },
      doors: [],
      labels: [],
      windmills: [],
      animals: [],
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
        case 'windmill':
          meta.windmills.push({ x, y });
          break;
        case 'animal':
          meta.animals.push({ x, y, kind: String(get('kind') ?? 'chicken') });
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
    this.buddy = this.add.container(spawn.x, spawn.y).setDepth(DEPTH_BUDDY);
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

    // Animals amble toward a target, pause, then pick a new one near home.
    for (const a of this.animals) {
      if (a.pause > 0) { a.pause -= dtMs; continue; }
      const dx = a.tx - a.sprite.x, dy = a.ty - a.sprite.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 4) {
        a.pause = 1000 + Math.random() * 3000;         // graze a while
        for (let t = 0; t < 12; t++) {
          const nx = a.hx + (Math.random() - 0.5) * a.cfg.range;
          const ny = a.hy + (Math.random() - 0.5) * a.cfg.range;
          if (this.canStand(nx, ny)) { a.tx = nx; a.ty = ny; break; }
        }
      } else {
        const nx = a.sprite.x + (dx / dist) * a.cfg.speed * dt;
        const ny = a.sprite.y + (dy / dist) * a.cfg.speed * dt;
        if (this.canStand(nx, ny)) {
          a.sprite.setPosition(nx, ny);
          a.sprite.setFlipX(dx < 0);
        } else {
          a.pause = 400; a.tx = a.sprite.x; a.ty = a.sprite.y;   // blocked — repick next tick
        }
      }
    }

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
