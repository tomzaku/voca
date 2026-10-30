import Phaser from 'phaser';
import {
  CREATE_STATION_ID, WORLD_EVENTS,
  type ThemeId, type WorldArea, type WorldSnapshot, type WorldStation,
} from '../types';
import { FEATURE_ID_PREFIX, featureNodeId, type WorldFeature } from '../features';
import { t } from '../../i18n';
import { defaultMap } from '../maps';
import { worldPalette, FONT, type WorldPalette } from '../palette';
import {
  buddySpec, type BuddyLook, type BuddySpec,
  VILLAGERS_KEY, loadVillagers, villagerAnim, villagerLookFor,
  type BuddyDir, type VillagerLook,
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
  /** What the city shows of the learner's progress (see buildProgress). */
  progress: WorldProgress;
}

/** The learner's progress, as the city shows it: the streak hoists the flag
 *  on Kỳ Đài (full mast at FULL_MAST days), and every mastered word floats a
 *  lantern on the river. */
export interface WorldProgress {
  streak: number;
  mastered: number;
}

/** Streak days that bring the flag to the top of its pole. */
const FULL_MAST = 7;

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
/** Lights that shine through the night veil (still under stations/buddy). */
const DEPTH_LIGHTS = DEPTH_NIGHT + 1;
const DEPTH_STATIONS = DEPTH_NIGHT + 10;
const DEPTH_MARK = DEPTH_STATIONS + 5;
const DEPTH_BUDDY = DEPTH_STATIONS + 10;
/** A painted map's upper layer — roofs and crowns the buddy walks behind. */
const DEPTH_OVER = DEPTH_BUDDY + 5;

/**
 * User zoom steps. All are multiples of 0.5 on purpose: the art is 16px drawn
 * at SCALE 2, so half-steps keep every source pixel a whole number of screen
 * pixels and the pixel art stays crisp. 0.5 shows the island; 3 is nose-to-nose
 * with a villager.
 */
export const ZOOM_STEPS = [0.5, 1, 1.5, 2, 2.5, 3] as const;
const DEFAULT_ZOOM_INDEX = 1;   // 1×

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
  labels: { x: number; y: number; text: string; theme: ThemeId; hidden?: boolean }[];
  windmills: { x: number; y: number }[];
  animals: { x: number; y: number; kind: string }[];
  slots: Record<'public' | 'system' | 'feature', MapSlot[]>;
  /** Where the streak flag flies at full mast, and how far it can drop. */
  flag: { x: number; y: number; drop: number } | null;
  /** Lantern spots on the water, in the order they fill. */
  lanterns: { x: number; y: number }[];
}

interface MapSlot {
  x: number;
  y: number;
  slot: number;
  /** Feature slots only: the feature id this building is for. Without it,
   *  features fill the slots in list order. */
  feature?: string;
  /** Feature slots only: the landmark's name, shown under the page's name. */
  place?: string;
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
  /** The flag and the lanterns — rebuilt whenever progress changes. */
  private progressLayer?: Phaser.GameObjects.Container;
  /** Dims the day-lit tile art in dark mode, in place of a per-layer tint
   *  (GPU tilemap layers have none) — a multiply veil over the map bounds. */
  private nightVeil?: Phaser.GameObjects.Rectangle;
  /** A painted map's lights, shown only in dark mode. */
  private nightLights?: Phaser.GameObjects.Image;
  /** Scenery that takes the night tint individually (it sits above the veil). */
  private tinted: (Phaser.GameObjects.Sprite | Phaser.GameObjects.Image)[] = [];
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

  /** Index into ZOOM_STEPS. The camera's real zoom is this × the dpr. */
  private zoomIndex = DEFAULT_ZOOM_INDEX;
  /** Finger distance when a two-finger pinch began, or 0 when not pinching. */
  private pinchStart = 0;
  private pinchZoom = 1;

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
    if (src.propsAtlasUrl && src.propsAtlasJsonUrl) this.load.atlas(PROPS_KEY, src.propsAtlasUrl, src.propsAtlasJsonUrl);
    if (src.groundUrl) this.load.image(`ground-${src.key}`, src.groundUrl);
    if (src.overUrl) this.load.image(`over-${src.key}`, src.overUrl);
    if (src.nightUrl) this.load.image(`night-${src.key}`, src.nightUrl);
    this.load.spritesheet(WINDMILL.key, `${import.meta.env.BASE_URL}${WINDMILL.url}`, {
      frameWidth: WINDMILL.frame, frameHeight: WINDMILL.frame,
    });
    for (const [kind, cfg] of Object.entries(ANIMALS)) {
      this.load.spritesheet(`animal-${kind}`, `${import.meta.env.BASE_URL}game/props/${kind}.png`, {
        frameWidth: cfg.frame, frameHeight: cfg.frame,
      });
    }
    this.spec.load(this);
    loadVillagers(this);
  }

  create() {
    this.pal = worldPalette();
    this.cameras.main.setZoom(this.args.dpr * this.zoom);
    this.cameras.main.setRoundPixels(true);
    // Belt and braces: the pixelArt config flag doesn't reliably reach
    // runtime-loaded sheets, and linear filtering blurs 16px art badly.
    const src = defaultMap();
    for (const key of [`tiles-${src.key}`, `ground-${src.key}`, `over-${src.key}`, `night-${src.key}`, PROPS_KEY]) {
      if (this.textures.exists(key)) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.textures.get(VILLAGERS_KEY).setFilter(Phaser.Textures.FilterMode.NEAREST);
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
        // Two fingers down is a pinch starting, not a tap to walk. Checked on
        // the pointers themselves because pinchStart isn't set until the first
        // move, which is after this second pointerdown fires.
        if (this.input.pointer1.isDown && this.input.pointer2.isDown) return;
        this.routeTo(pointer.worldX, pointer.worldY);
      },
    );

    // Wheel / trackpad scroll zooms. Accumulated so a trackpad's many small
    // deltas still add up to one step rather than flying through the range.
    let wheelAccum = 0;
    this.input.on('wheel', (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) => {
      wheelAccum += dy;
      if (Math.abs(wheelAccum) < 40) return;
      this.zoomBy(wheelAccum < 0 ? 1 : -1);
      wheelAccum = 0;
    });

    // Two-finger pinch on touch.
    this.input.addPointer(1);
    this.input.on('pointermove', () => {
      const [a, b] = [this.input.pointer1, this.input.pointer2];
      if (!a.isDown || !b.isDown) { this.pinchStart = 0; return; }
      const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      if (this.pinchStart === 0) {
        this.pinchStart = dist;
        this.pinchZoom = this.zoom;
        return;
      }
      const target = this.pinchZoom * (dist / this.pinchStart);
      // Snap to the nearest step so the art stays on whole pixels.
      let best = 0;
      for (let i = 1; i < ZOOM_STEPS.length; i++) {
        if (Math.abs(ZOOM_STEPS[i] - target) < Math.abs(ZOOM_STEPS[best] - target)) best = i;
      }
      this.setZoomIndex(best);
    });
    this.input.on('pointerup', () => {
      if (!this.input.pointer1.isDown || !this.input.pointer2.isDown) this.pinchStart = 0;
    });

    this.buildTerrain();
    this.buildStations();
    this.buildProgress();
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

    // Map tags use the HUD's web font, which may still be loading when the
    // scene first draws; redraw every text once it has landed.
    void document.fonts?.load(`700 12px ${FONT}`).then(() => {
      if (!this.sys.isActive()) return;
      const redraw = (objs: Phaser.GameObjects.GameObject[]) => objs.forEach((o) => {
        if (o instanceof Phaser.GameObjects.Text) o.setFontFamily(FONT);
        else if (o instanceof Phaser.GameObjects.Container) redraw(o.list);
      });
      redraw(this.children.list);
    });
  }

  // ── React-facing API ──

  /** Swap the station data (progress ticked, collection created…) in place.
   *  Only the station markers are rebuilt — the terrain is untouched. */
  /** Walk to a point on screen (game pixels) — a tap that landed on the
   *  React layer over the canvas rather than on the canvas itself. */
  walkToScreen(x: number, y: number) {
    if (!this.ready) return;
    const p = this.cameras.main.getWorldPoint(x, y);
    this.routeTo(p.x, p.y);
  }

  /** Swap in fresh progress (an answer landed, a day was studied). */
  setProgress(progress: WorldProgress) {
    const prev = this.args.progress;
    this.args.progress = progress;
    if (this.ready && (prev.streak !== progress.streak || prev.mastered !== progress.mastered)) this.buildProgress();
  }

  setStations(stations: WorldStation[]) {
    this.args.stations = stations;
    if (this.ready) this.buildStations();
  }

  // ── Zoom ──

  /** The current user zoom factor (1 = the map's natural 2× tile scale). */
  get zoom(): number {
    return ZOOM_STEPS[this.zoomIndex];
  }

  /** Step the zoom in (+1) or out (−1). */
  zoomBy(step: number) {
    this.setZoomIndex(this.zoomIndex + step);
  }

  resetZoom() {
    this.setZoomIndex(DEFAULT_ZOOM_INDEX);
  }

  private setZoomIndex(i: number) {
    const next = Phaser.Math.Clamp(Math.round(i), 0, ZOOM_STEPS.length - 1);
    if (next === this.zoomIndex) return;
    this.zoomIndex = next;
    this.applyZoom();
    this.game.events.emit(WORLD_EVENTS.zoom, this.zoom);
  }

  /** The camera zoom is the device pixel ratio (which keeps the canvas sharp)
   *  multiplied by whatever the player has chosen. */
  private applyZoom() {
    this.cameras.main.setZoom(this.args.dpr * this.zoom);
    // A wider view can now exceed the area bounds — re-clamp so the camera
    // doesn't sit half off the map.
    this.applyCameraBounds();
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
    this.nightLights?.setVisible(night);
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
      areas.push({ name: label?.text ?? t('world.areaFallback', { n: i + 1 }), theme: label?.theme ?? 'forest', top, bottom });
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
      if (!map.getLayer(name)) return;   // template doesn't paint this one
      map.createLayer(name, tiles, undefined, undefined, gpu)?.setScale(SCALE).setDepth(depth);
    });
    // A painted map: the ground goes under everything, the over layer above
    // the buddy. It takes the night tint itself, since it sits over the veil.
    const ground = `ground-${src.key}`;
    const over = `over-${src.key}`;
    if (this.textures.exists(ground)) this.add.image(0, 0, ground).setOrigin(0, 0).setScale(SCALE).setDepth(-1);
    const overImage = this.textures.exists(over)
      ? this.add.image(0, 0, over).setOrigin(0, 0).setScale(SCALE).setDepth(DEPTH_OVER)
      : null;
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
    // Bridge lights glow through it, breathing slowly rather than blinking.
    const lights = `night-${src.key}`;
    this.nightLights = undefined;
    if (this.textures.exists(lights)) {
      this.nightLights = this.add.image(0, 0, lights)
        .setOrigin(0, 0).setScale(SCALE).setDepth(DEPTH_LIGHTS)
        .setVisible(false);
      this.tweens.add({
        targets: this.nightLights, alpha: { from: 1, to: 0.6 },
        duration: 2400, yoyo: true, repeat: -1, ease: 'sine.inOut',
      });
    }

    const layer = this.add.container(0, 0).setDepth(DEPTH_SCENERY);
    this.tinted = overImage ? [overImage] : [];

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
      if (l.hidden) continue;   // names the area without a sign on the map
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
    // Villager looks are handed out by running order, so the same collection
    // keeps the same face across rebuilds; levels start further along the list
    // so they don't all share a face with the collections next door.
    let villager = 0;
    const bind = (list: WorldStation[], slots: MapMeta['slots']['public']) => {
      list.forEach((s, i) => {
        const slot = slots[i];
        if (!slot) {
          console.warn(`[voca] world template has no free ${s.kind} slot for "${s.name}"`);
          return;
        }
        const placed: PlacedStation = { ...s, x: slot.x, y: slot.y };
        this.addStation(layer, placed, villagerLookFor(villager++));
      });
    };
    bind(pub, this.meta.slots.public);
    bind(sys, this.meta.slots.system);

    // App pages: fixed buildings bound to the template's feature slots — by
    // feature id where the map names one, else in list order.
    const slots = this.meta.slots.feature;
    const loose = slots.filter((s) => !s.feature);
    this.args.features.forEach((f) => {
      const slot = slots.find((s) => s.feature === f.id) ?? loose.shift();
      if (slot) this.addFeature(layer, f, slot, villagerLookFor(villager++));
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

  /**
   * The city's picture of the learner's progress: the flag on Kỳ Đài sits
   * as high up its pole as the streak reaches (full mast at FULL_MAST days,
   * at the foot with none), and a paper lantern floats on the river for
   * each mastered word, as many as the map has spots for. Both move gently —
   * the flag waves, the lanterns bob — and glow through the night veil.
   */
  private buildProgress() {
    this.progressLayer?.destroy();
    const layer = this.add.container(0, 0);
    this.progressLayer = layer;
    const { streak, mastered } = this.args.progress;

    const flag = this.meta.flag;
    if (flag) {
      const lift = Math.min(1, streak / FULL_MAST);
      const g = this.add.graphics();
      // Drawn at source pixels × SCALE, from the pole outwards (origin left).
      g.fillStyle(0xcc2a26, 1).fillRect(0, 0, 22 * SCALE, 14 * SCALE);
      g.fillStyle(0x9e1f1c, 1).fillRect(0, 12 * SCALE, 22 * SCALE, 2 * SCALE);
      g.fillStyle(0xfad646, 1);
      const star = [[11, 3], [10, 4], [11, 4], [12, 4], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5],
        [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [10, 7], [11, 7], [12, 7], [9, 8], [10, 8], [12, 8], [13, 8]];
      for (const [sx, sy] of star) g.fillRect(sx * SCALE, sy * SCALE, SCALE, SCALE);
      const banner = this.add.container(flag.x, flag.y + (1 - lift) * flag.drop, [g]).setDepth(DEPTH_OVER + 1);
      this.tweens.add({ targets: banner, scaleX: { from: 1, to: 0.9 }, duration: 900, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      layer.add(banner);
    }

    const count = Math.min(mastered, this.meta.lanterns.length);
    for (let i = 0; i < count; i++) {
      const { x, y } = this.meta.lanterns[i];
      const g = this.add.graphics();
      g.fillStyle(0xffc070, 0.28).fillCircle(0, 0, 14);
      g.fillStyle(0x3a2a20, 1).fillRect(-5, -9, 10, 2).fillRect(-5, 7, 10, 2);
      g.fillStyle(0xe8553f, 1).fillRect(-6, -7, 12, 14);
      g.fillStyle(0xffd27a, 1).fillRect(-2, -4, 4, 8);
      const lantern = this.add.container(x, y, [g]).setDepth(DEPTH_LIGHTS + 1);
      // Each bobs and drifts on its own clock, so the river never moves in step.
      this.tweens.add({ targets: lantern, y: y - 3, duration: 1800 + (i * 137) % 900, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      this.tweens.add({ targets: lantern, x: x + 8 - (i % 3) * 8, duration: 7000 + (i * 389) % 4000, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      layer.add(lantern);
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
      flag: null,
      lanterns: [],
    };
    const lanterns: { x: number; y: number; order: number }[] = [];
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
        case 'flag':
          meta.flag = { x, y, drop: Number(get('drop') ?? 0) * SCALE };
          break;
        case 'lantern':
          lanterns.push({ x, y, order: Number(get('order') ?? lanterns.length) });
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
            hidden: get('hidden') === true || get('hidden') === 'true',
          });
          break;
        }
        case 'station': {
          const raw = get('region');
          const region = raw === 'system' ? 'system' : raw === 'feature' ? 'feature' : 'public';
          const feature = get('feature');
          const place = get('place');
          meta.slots[region].push({
            x, y, slot: Number(get('slot') ?? 0),
            feature: typeof feature === 'string' ? feature : undefined,
            place: typeof place === 'string' ? place : undefined,
          });
          break;
        }
      }
    }
    meta.slots.public.sort((a, b) => a.slot - b.slot);
    meta.slots.system.sort((a, b) => a.slot - b.slot);
    meta.slots.feature.sort((a, b) => a.slot - b.slot);
    meta.lanterns = lanterns.sort((a, b) => a.order - b.order).map(({ x, y }) => ({ x, y }));
    return meta;
  }

  private addStation(layer: Phaser.GameObjects.Container, p: PlacedStation, look: VillagerLook) {
    const kind = this.pal.kind[p.kind];
    const root = this.add.container(p.x, p.y);

    // Highlight ring, lit while the buddy is in reach (always on when active).
    const ring = this.add
      .circle(0, -12, 30)
      .setStrokeStyle(2.5, kind.color, 0.9)
      .setFillStyle(kind.color, 0.10)
      .setVisible(p.active);
    root.add(ring);

    // The villager who minds this collection, idling on the spot.
    root.add(this.add.ellipse(0, 2, 26, 7, 0x000000, 0.25));
    const sprite = this.add
      .sprite(0, 2, VILLAGERS_KEY, `${look}-idle-0`)
      .setOrigin(0.5, 1)
      .setScale(SCALE);
    sprite.play({ key: villagerAnim(this, look, 'idle'), delay: (p.x * 7 + p.y) % 700 });
    root.add(sprite);

    // Name pill under the villager, kind emoji inline.
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

    const metaLine = `${t('world.wordCount', { count: p.words.length })}${p.learners ? ` · ${p.learners} 👥` : ''}`;
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

    // A level hall lights a lantern over its door for every quarter of the
    // level learned, and wears a gold star once it's all done.
    if (p.kind === 'level') {
      const lamps = this.add.graphics();
      for (let i = 0; i < 4; i++) {
        const lit = p.pct >= (i + 1) * 25;
        const lx = -21 + i * 14;
        // Hung on a cord under the eave; unlit ones are dim paper, not dark.
        lamps.fillStyle(0x2a1d16, 1).fillRect(lx - 0.5, -78, 1, 6);
        if (lit) lamps.fillStyle(0xffc070, 0.4).fillCircle(lx, -66, 8);
        lamps.fillStyle(0x2a1d16, 1).fillRect(lx - 4, -73, 8, 2).fillRect(lx - 4, -60, 8, 2);
        lamps.fillStyle(lit ? 0xe8553f : 0x8a5a48, lit ? 1 : 0.85).fillRect(lx - 5, -71, 10, 11);
        lamps.fillStyle(lit ? 0xffd27a : 0xa87a64, 1).fillRect(lx - 1, -69, 2, 7);
      }
      root.add(lamps);
      if (p.pct >= 100) {
        root.add(this.add.star(0, -86, 5, 5, 11, 0xf0c050).setStrokeStyle(2, 0x241703));
      }
    }

    if (p.active) {
      root.add(
        this.add
          .text(0, 58, t('world.studyingBadge'), {
            fontFamily: FONT,
            fontSize: '8px',
            fontStyle: 'bold',
            color: this.pal.light ? '#ffffff' : '#0d1120',
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
        .text(0, 12, `🏗️ ${t('world.newCollection')}`, {
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
      id: CREATE_STATION_ID, name: t('world.newCollection'), kind: 'mine',
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
  private addFeature(layer: Phaser.GameObjects.Container, f: WorldFeature, slot: MapSlot, look: VillagerLook) {
    const { x, y, place } = slot;
    const poi = this.pal.poi;
    const root = this.add.container(x, y);

    const ring = this.add
      .circle(0, -14, 32)
      .setStrokeStyle(2.5, poi.color, 0.9)
      .setFillStyle(poi.color, 0.10)
      .setVisible(false);
    root.add(ring);

    // The map paints the building itself — this is the villager at its door,
    // with the page's emoji on a badge above so you can tell the buildings
    // apart at a glance.
    root.add(this.add.ellipse(0, 2, 26, 7, 0x000000, 0.25));
    const sprite = this.add
      .sprite(0, 2, VILLAGERS_KEY, `${look}-idle-0`)
      .setOrigin(0.5, 1)
      .setScale(SCALE);
    sprite.play({ key: villagerAnim(this, look, 'idle'), delay: (x * 7 + y) % 700 });
    root.add(sprite);

    const badge = this.add
      .circle(0, -46, 11, poi.color, 0.18)
      .setStrokeStyle(2, poi.color, 0.95);
    root.add(badge);
    root.add(
      this.add
        .text(0, -46, f.emoji, { fontFamily: FONT, fontSize: '12px', resolution: this.args.dpr })
        .setOrigin(0.5, 0.55),
    );

    root.add(
      this.add
        .text(0, 10, place ? `${t(f.nameId)}\n${place}` : t(f.nameId), {
          fontFamily: FONT,
          fontSize: '10px',
          fontStyle: 'bold',
          color: this.pal.textCss,
          backgroundColor: this.pal.cardCss,
          padding: { x: 7, y: 3 },
          align: 'center',
          resolution: this.args.dpr,
        })
        .setOrigin(0.5, 0),
    );

    const station: PlacedStation = {
      id: featureNodeId(f), name: t(f.nameId), kind: 'mine',
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
    const { look } = this.spec;
    villagerAnim(this, look, 'idle');
    villagerAnim(this, look, 'walk');

    // Container origin = the buddy's feet.
    this.buddy = this.add.container(spawn.x, spawn.y).setDepth(DEPTH_BUDDY);
    this.buddy.add(this.add.ellipse(0, 2, 23, 6, 0x000000, 0.28));
    // Pixel-art frame, scaled up; the buddy grows a little per stage.
    this.sprite = this.add
      .sprite(0, 2, VILLAGERS_KEY, `${look}-idle-0`)
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

  /**
   * Walk clip while moving, idle when standing. The Sunnyside character is
   * drawn front-on only, so facing is approximated: mirror for left, and let up
   * and down reuse the front view. There is no back-facing art to use.
   */
  private applyAnim(moving: boolean) {
    this.sprite.play(villagerAnim(this, this.spec.look, moving ? 'walk' : 'idle'), true);
    this.sprite.setFlipX(this.facing === 'left');
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

  /**
   * Walk to (x, y) along a path around walls and water. The map decides what
   * a trip involves — a bridge, a gate in the citadel wall, the arch through
   * Ngọ Môn — so the route is searched, not assumed.
   */
  private routeTo(x: number, y: number) {
    const target = this.clampToWalkable(x, y);
    if (!target) return;
    const path = this.findPath(this.buddy.x, this.buddy.y, target.x, target.y);
    if (!path) return;
    path.push([target.x, target.y]);
    this.route = this.smoothPath(path);
  }

  /**
   * A* over the collision grid: 8-way, without cutting corners. Returns tile
   * centres in world pixels from just after the start to the goal's tile, or
   * null when the goal can't be reached.
   */
  private findPath(fromX: number, fromY: number, toX: number, toY: number): number[][] | null {
    const tile = this.tilePx;
    const rows = this.blocked.length;
    const cols = this.blocked[0]?.length ?? 0;
    const sx = Math.floor(fromX / tile), sy = Math.floor(fromY / tile);
    const gx = Math.floor(toX / tile), gy = Math.floor(toY / tile);
    if (sx === gx && sy === gy) return [];
    const free = (tx: number, ty: number) => tx >= 0 && ty >= 0 && tx < cols && ty < rows && !this.blocked[ty][tx];
    const key = (tx: number, ty: number) => ty * cols + tx;
    const h = (tx: number, ty: number) => {
      const dx = Math.abs(tx - gx), dy = Math.abs(ty - gy);
      return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
    };

    const cost = new Float64Array(rows * cols).fill(Infinity);
    const from = new Int32Array(rows * cols).fill(-1);
    const closed = new Uint8Array(rows * cols);
    // Binary heap of [f, key].
    const heap: [number, number][] = [];
    const push = (f: number, k: number) => {
      heap.push([f, k]);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p][0] <= heap[i][0]) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        i = p;
      }
    };
    const pop = (): number => {
      const top = heap[0][1];
      const last = heap.pop()!;
      if (heap.length > 0) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]];
          i = m;
        }
      }
      return top;
    };

    const start = key(sx, sy);
    cost[start] = 0;
    push(h(sx, sy), start);
    const goal = key(gx, gy);
    while (heap.length > 0) {
      const k = pop();
      if (k === goal) break;
      if (closed[k]) continue;
      closed[k] = 1;
      const tx = k % cols, ty = (k - tx) / cols;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = tx + dx, ny = ty + dy;
          if (!free(nx, ny)) continue;
          if (dx && dy && (!free(tx + dx, ty) || !free(tx, ty + dy))) continue; // no corner cutting
          const nk = key(nx, ny);
          const c = cost[k] + (dx && dy ? Math.SQRT2 : 1);
          if (c < cost[nk]) {
            cost[nk] = c;
            from[nk] = k;
            push(c + h(nx, ny), nk);
          }
        }
      }
    }
    if (from[goal] === -1) return null;

    const path: number[][] = [];
    for (let k = goal; k !== start; k = from[k]) {
      const tx = k % cols;
      path.push([(tx + 0.5) * tile, ((k - tx) / cols + 0.5) * tile]);
    }
    return path.reverse();
  }

  /** Drop waypoints the buddy can skip by walking straight, so a route reads
   *  as a few purposeful legs rather than a staircase of tile centres. */
  private smoothPath(path: number[][]): number[][] {
    const out: number[][] = [];
    let from: number[] = [this.buddy.x, this.buddy.y];
    let i = 0;
    while (i < path.length) {
      let j = path.length - 1;
      while (j > i && !this.clearLine(from, path[j])) j--;
      out.push(path[j]);
      from = path[j];
      i = j + 1;
    }
    return out;
  }

  /** Can the buddy walk straight from a to b? Samples a little wider than a
   *  point so legs don't graze wall corners. */
  private clearLine(a: number[], b: number[]): boolean {
    const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.ceil(dist / (this.tilePx / 4));
    const pad = this.tilePx * 0.3;
    for (let s = 1; s <= steps; s++) {
      const x = a[0] + ((b[0] - a[0]) * s) / steps;
      const y = a[1] + ((b[1] - a[1]) * s) / steps;
      if (!this.canStand(x - pad, y) || !this.canStand(x + pad, y) || !this.canStand(x, y - pad) || !this.canStand(x, y + pad)) return false;
    }
    return true;
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
