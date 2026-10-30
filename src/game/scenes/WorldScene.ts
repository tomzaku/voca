import Phaser from 'phaser';
import {
  WORLD_EVENTS,
  type ThemeId, type WorldArea, type WorldSnapshot,
} from '../types';
import { featureNodeId, type WorldFeature } from '../features';
import { Dressed, loadWardrobe } from '../dressed';
import { KEEPER_DRESS, propLayers } from '../keeperLooks';
import { RIDE_SCALE, RIDE_SPEED, RIDE_VIEWS, SEAT, SEAT_FACING, drawRide, drawRideFront, type Ride, type RideView } from '../vehicles';
import type { Look } from '../wardrobe';
import { t } from '../../i18n';
import { defaultMap, type DetailPatch } from '../maps';
import { worldPalette, FONT, type WorldPalette } from '../palette';
import {
  buddySpec, type BuddyLook, type BuddySpec,
  VILLAGERS_KEY, loadVillagers, villagerAnim, keeperLookFor,
  type BuddyDir, type VillagerLook,
} from '../textures';

export interface WorldSceneData {
  /** Walking, or riding a bicycle or a xích lô (game/vehicles.ts). */
  ride?: Ride;
  /** The keepers you walk up to — one per skill, and one for your
   *  collections. Static for the game's life. */
  features: WorldFeature[];
  /** The sprite that walks the map: companion animal or hero look. */
  look: BuddyLook;
  /** What your buddy wears — chosen at the tailor's (src/game/wardrobe.ts). */
  dress: Look;
  stage: number;
  buddyName: string;
  /** Device pixel ratio: the canvas renders at native res, the camera zooms by
   *  this factor, and text rasterizes at this resolution — all to stay sharp. */
  dpr: number;
  /** What the city shows of the learner's progress (see buildProgress). */
  progress: WorldProgress;
}

/** The learner's progress, as the city shows it: every mastered word floats
 *  a lantern on the river. */
export interface WorldProgress {
  mastered: number;
}

const SPEED = 360;      // buddy speed, px/s
const REACH = 110;      // distance at which a building "opens"
const PLACE_REACH = 170; // a named place lights up, and tells its story, from a little further
/** A place name at rest — there but quiet — and lit, once you're there. */
const LABEL_REST = 0.55;
const LABEL_LIT = '#f0c050';
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

interface KeeperNode {
  /** featureNodeId of the keeper — what WORLD_EVENTS.near reports. */
  id: string;
  x: number;
  y: number;
  root: Phaser.GameObjects.Container;
  /** A warm glow on the ground at their feet, lit while the buddy is in reach. */
  ring: Phaser.GameObjects.Ellipse;
}

interface MapMeta {
  spawn: { x: number; y: number };
  doors: { x: number; y: number }[];
  /** `place`: the id of the place's story, for the labels that have one. */
  labels: { x: number; y: number; text: string; theme: ThemeId; hidden?: boolean; place?: string }[];
  windmills: { x: number; y: number }[];
  animals: { x: number; y: number; kind: string }[];
  /** Where the keepers stand. */
  slots: MapSlot[];
  /** Where the flag flies, at the top of Kỳ Đài's pole. */
  flag: { x: number; y: number } | null;
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

  /** The keepers — rebuilt on a theme switch, since their labels take its
   *  colours. Everything else the world draws is built once and left alone. */
  private stationLayer?: Phaser.GameObjects.Container;
  /** The flag and the lanterns — rebuilt whenever progress changes. Kept
   *  as a list rather than a container: a container's children are drawn at
   *  its depth, and these each need their own (the flag over the map's over
   *  layer, the lanterns over the night veil). */
  private progressItems: Phaser.GameObjects.Container[] = [];
  /** Dims the day-lit tile art in dark mode, in place of a per-layer tint
   *  (GPU tilemap layers have none) — a multiply veil over the map bounds. */
  private nightVeil?: Phaser.GameObjects.Rectangle;
  /** A painted map's lights, shown only in dark mode. */
  private nightLights?: Phaser.GameObjects.Image;
  /** Scenery that takes the night tint individually (it sits above the veil). */
  private tinted: (Phaser.GameObjects.Sprite | Phaser.GameObjects.Image)[] = [];
  /** Area labels, kept so a theme switch can recolor them in place. */
  private labels: { text: Phaser.GameObjects.Text; theme: ThemeId; place?: string }[] = [];
  /** The named place the buddy is at, if any (a label's `place`). */
  private litPlace: string | null = null;
  private nodes: KeeperNode[] = [];
  /** Collision grid from the map's `walls` layer, indexed [tileY][tileX]. */
  private blocked: boolean[][] = [];
  private meta!: MapMeta;
  private worldW = 0;
  private worldH = 0;
  /** On-screen size of one map tile — read from the template, not assumed. */
  private tilePx = 32;

  private buddy!: Phaser.GameObjects.Container;
  private sprite!: Dressed;
  /** What the buddy rides, and the xích lô's driver when there is one. */
  private ride: Ride = 'walk';
  private rideImage?: Phaser.GameObjects.Image;
  /** A xích lô's carriage front, over the passenger. */
  private rideFront?: Phaser.GameObjects.Image;
  private driver?: Phaser.GameObjects.Sprite;
  private wheelFrame = 0;
  private wheelClock = 0;
  /** Huế's traffic: cyclists and xích lô riding the riverside roads. */
  private traffic: { rig: Phaser.GameObjects.Container; img: Phaser.GameObjects.Image; ride: Exclude<Ride, 'walk'>; parts: Phaser.GameObjects.Components.Flip[]; x0: number; x1: number; dir: number; speed: number }[] = [];
  private facing: BuddyDir = 'down';
  /** Which way the buddy last faced side-on — riding up or down keeps it. */
  private sideLeft = false;
  /** How the ride is seen now (vehicles.ts RIDE_VIEWS). */
  private rideView: RideView = 'side';
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
    // The high-detail patches: their list first, then their images.
    if (src.detailUrl) {
      const dir = src.detailUrl.slice(0, src.detailUrl.lastIndexOf('/') + 1);
      this.load.json(`detail-${src.key}`, src.detailUrl);
      this.load.once(`filecomplete-json-detail-${src.key}`, (_key: string, _type: string, patches: DetailPatch[]) => {
        for (const p of patches) {
          this.load.image(`detail-${p.key}-ground`, `${dir}${p.ground}`);
          this.load.image(`detail-${p.key}-over`, `${dir}${p.over}`);
        }
      });
    }
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
    loadWardrobe(this);
  }

  create() {
    this.pal = worldPalette();
    this.cameras.main.setZoom(this.args.dpr * this.zoom);
    this.cameras.main.setRoundPixels(true);
    // Belt and braces: the pixelArt config flag doesn't reliably reach
    // runtime-loaded sheets, and linear filtering blurs 16px art badly.
    const src = defaultMap();
    const patches = ((this.cache.json.get(`detail-${src.key}`) ?? []) as DetailPatch[])
      .flatMap((p) => [`detail-${p.key}-ground`, `detail-${p.key}-over`]);
    for (const key of [`tiles-${src.key}`, `ground-${src.key}`, `over-${src.key}`, `night-${src.key}`, PROPS_KEY, ...patches]) {
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
    this.setRide(this.args.ride ?? 'walk');
    this.spawnTraffic();
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

  /** Swap in fresh progress (an answer landed, a day was studied). */
  setProgress(progress: WorldProgress) {
    const prev = this.args.progress;
    this.args.progress = progress;
    if (this.ready && prev.mastered !== progress.mastered) this.buildProgress();
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
      if (l.place !== this.litPlace) l.text.setColor(this.pal.zones[l.theme].labelCss);
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

  /** Fast travel: fade out, drop the buddy in front of a keeper, fade in. */
  travelTo(nodeId: string) {
    if (!this.ready) return;
    const node = this.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const spot = this.clampToWalkable(node.x, node.y + 50)
      ?? { x: node.x, y: node.y + 50 };
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
        id: n.id,
        x: n.x,
        y: n.y,
        kind: 'feature',
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
    // Drawn in high detail (scripts/hue/hd), the map comes as patches covering
    // all of it — twice the pixels, so half the scale — in place of its
    // ordinary images.
    const patches = (this.cache.json.get(`detail-${src.key}`) ?? []) as DetailPatch[];
    const ground = `ground-${src.key}`;
    const over = `over-${src.key}`;
    if (!patches.length && this.textures.exists(ground)) this.add.image(0, 0, ground).setOrigin(0, 0).setScale(SCALE).setDepth(-1);
    const overImage = !patches.length && this.textures.exists(over)
      ? this.add.image(0, 0, over).setOrigin(0, 0).setScale(SCALE).setDepth(DEPTH_OVER)
      : null;
    const detailOver: Phaser.GameObjects.Image[] = [];
    for (const p of patches) {
      const g = `detail-${p.key}-ground`, o = `detail-${p.key}-over`;
      if (this.textures.exists(g)) this.add.image(p.x * SCALE, p.y * SCALE, g).setOrigin(0, 0).setScale(SCALE / 2).setDepth(-0.5);
      if (this.textures.exists(o)) detailOver.push(this.add.image(p.x * SCALE, p.y * SCALE, o).setOrigin(0, 0).setScale(SCALE / 2).setDepth(DEPTH_OVER + 0.01));
    }
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
    this.tinted = [...(overImage ? [overImage] : []), ...detailOver];

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
      // Place names as a game's map writes them: outlined, no box, and quiet
      // until you're there.
      const text = this.add
        .text(l.x, l.y, l.text, {
          fontFamily: FONT,
          fontSize: '12px',
          fontStyle: 'bold',
          color: this.pal.zones[l.theme].labelCss,
          stroke: '#1c120c',
          strokeThickness: 3,
          resolution: this.args.dpr,
        })
        .setOrigin(0, 0.5)
        .setAlpha(LABEL_REST);
      layer.add(text);
      this.labels.push({ text, theme: l.theme, place: l.place });
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

    // Keepers stand at the map's feature slots — by id where the map names
    // one, else in list order. Collections have one keeper too, whose menu
    // lists them all, rather than a villager per collection crowding the map.
    const slots = this.meta.slots;
    const loose = slots.filter((s) => !s.feature);
    this.args.features.forEach((f, i) => {
      const slot = slots.find((s) => s.feature === f.id) ?? loose.shift();
      if (slot) this.addFeature(layer, f, slot, keeperLookFor(i));
    });

    // Carry the open card across the rebuild: re-light the keeper the buddy
    // is standing at.
    const still = this.nodes.find((n) => n.id === this.nearestId);
    if (still) {
      still.ring.setVisible(true);
      still.root.setScale(1.12);
    } else if (this.nearestId !== null) {
      this.nearestId = null;
      this.game.events.emit(WORLD_EVENTS.near, null);
    }
  }

  /**
   * The flag on Kỳ Đài, flying at the top of its pole as the real one does,
   * and the city's picture of the learner's progress: a paper lantern on the
   * river for each mastered word, as many as the map has spots for. Both
   * move gently — the flag waves, the lanterns bob — and glow through the
   * night veil.
   */
  private buildProgress() {
    for (const item of this.progressItems) item.destroy();
    this.progressItems = [];
    const { mastered } = this.args.progress;

    const flag = this.meta.flag;
    if (flag) {
      const g = this.add.graphics();
      // Drawn at source pixels × SCALE, from the pole outwards (origin left).
      g.fillStyle(0xcc2a26, 1).fillRect(0, 0, 22 * SCALE, 14 * SCALE);
      g.fillStyle(0x9e1f1c, 1).fillRect(0, 12 * SCALE, 22 * SCALE, 2 * SCALE);
      g.fillStyle(0xfad646, 1);
      const star = [[11, 3], [10, 4], [11, 4], [12, 4], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [13, 5], [14, 5],
        [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [10, 7], [11, 7], [12, 7], [9, 8], [10, 8], [12, 8], [13, 8]];
      for (const [sx, sy] of star) g.fillRect(sx * SCALE, sy * SCALE, SCALE, SCALE);
      const banner = this.add.container(flag.x, flag.y, [g]).setDepth(DEPTH_OVER + 1);
      this.tweens.add({ targets: banner, scaleX: { from: 1, to: 0.9 }, duration: 900, yoyo: true, repeat: -1, ease: 'sine.inOut' });
      this.progressItems.push(banner);
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
      this.progressItems.push(lantern);
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
      slots: [],
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
          meta.flag = { x, y };
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
            place: get('place') ? String(get('place')) : undefined,
          });
          break;
        }
        case 'station': {
          // Older templates also carry per-collection slots (public, system);
          // only the keepers' are used now.
          if (get('region') !== 'feature') break;
          const feature = get('feature');
          const place = get('place');
          meta.slots.push({
            x, y, slot: Number(get('slot') ?? 0),
            feature: typeof feature === 'string' ? feature : undefined,
            place: typeof place === 'string' ? place : undefined,
          });
          break;
        }
      }
    }
    meta.slots.sort((a, b) => a.slot - b.slot);
    meta.lanterns = lanterns.sort((a, b) => a.order - b.order).map(({ x, y }) => ({ x, y }));
    return meta;
  }

  /** An app page as a little building: walk up and React opens its card, whose
   *  "Enter" navigates to the page's route. Behaves like a station for
   *  proximity, but carries no words/progress. */
  private addFeature(layer: Phaser.GameObjects.Container, f: WorldFeature, slot: MapSlot, look: VillagerLook) {
    const { x, y, place } = slot;
    const poi = this.pal.poi;
    const root = this.add.container(x, y);

    // In reach: no frame around them, just a soft warm glow on the ground at
    // their feet, breathing.
    const ring = this.add.ellipse(0, 2, 56, 18, poi.color, 0.32).setVisible(false);
    this.tweens.add({ targets: ring, scaleX: 1.15, scaleY: 1.15, alpha: 0.18, duration: 900, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    root.add(ring);

    // The map paints the building itself — this is its keeper at the door,
    // dressed for their trade and carrying its tool (game/keeperLooks.ts), so
    // you can tell who's who by looking; a keeper with no dress is a villager.
    root.add(this.add.ellipse(0, 2, 26, 7, 0x000000, 0.25));
    const dress = KEEPER_DRESS[f.id];
    if (dress) {
      root.add(new Dressed(this, 0, 2, dress.look, propLayers(dress)).setScale(SCALE));
    } else {
      const sprite = this.add
        .sprite(0, 2, VILLAGERS_KEY, `${look}-idle-0`)
        .setOrigin(0.5, 1)
        .setScale(SCALE);
      sprite.play({ key: villagerAnim(this, look, 'idle'), delay: (x * 7 + y) % 700 });
      root.add(sprite);
    }

    // Their name as a game would write it: outlined pixel text, no box — the
    // skill in gold, the place under it.
    root.add(this.nameText(t(f.nameId), 6, 11, '#f0c050'));
    if (place) root.add(this.nameText(place, 20, 9, this.pal.textCss));

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
    this.nodes.push({ id: featureNodeId(f), x, y, root, ring });
  }

  /** Outlined text for names on the map — readable on any ground, no box. */
  private nameText(text: string, y: number, size: number, color: string) {
    return this.add
      .text(0, y, text, {
        fontFamily: FONT,
        fontSize: `${size}px`,
        fontStyle: 'bold',
        color,
        stroke: '#1c120c',
        strokeThickness: 3,
        resolution: this.args.dpr,
      })
      .setOrigin(0.5, 0);
  }

  // ── The buddy ──

  private createBuddy() {
    const { spawn } = this.meta;

    // Container origin = the buddy's feet.
    this.buddy = this.add.container(spawn.x, spawn.y).setDepth(DEPTH_BUDDY);
    this.buddy.add(this.add.ellipse(0, 2, 23, 6, 0x000000, 0.28));
    // Pixel-art layers, scaled up; the buddy grows a little per stage.
    this.sprite = new Dressed(this, 0, 2, this.args.dress)
      .setScale(this.spec.baseScale * (1.3 + this.args.stage * 0.1));
    this.buddy.add(this.sprite);
    this.buddy.add(this.nameText(this.args.buddyName, 6, 10, this.pal.textCss));
  }

  /**
   * Walk clip while moving, idle when standing, facing the way the buddy
   * last went: in profile for left and right (the side view, mirrored for
   * left), towards the camera going down, away from it going up.
   */
  private applyAnim(moving: boolean) {
    const walking = this.ride === 'walk';
    const way: RideView = this.facing === 'down' ? 'front' : this.facing === 'up' ? 'back' : 'side';
    if (way === 'side') this.sideLeft = this.facing === 'left';
    // Riding, the buddy sits still (idle) and the wheels do the moving — seen
    // the way the ride is, which for one drawn only side-on (RIDE_VIEWS) is in
    // profile whichever way it goes.
    const ride = walking ? null : (this.ride as Exclude<Ride, 'walk'>);
    const view = ride && !RIDE_VIEWS[ride].includes(way) ? 'side' : way;
    this.sprite.playClip(moving && walking ? 'walk' : 'idle', true, view);
    const left = this.sideLeft && view === 'side';
    this.sprite.setFlipX(left);
    if (ride && this.rideImage) {
      // Vehicles are drawn facing right; mirror the whole rig to face left.
      const seat = SEAT[ride], k = SCALE * RIDE_SCALE[ride];
      this.rideView = view;
      this.dressRide();
      this.rideImage.setFlipX(left);
      this.rideFront?.setFlipX(left);
      if (view === 'side') this.sprite.setPosition((left ? -seat.x : seat.x) * k, 4 + seat.y * k);
      else this.sprite.setPosition(SEAT_FACING.x * k, 4 + SEAT_FACING.y * k);
      if (this.driver && seat.driver) {
        this.driver.setX((left ? -seat.driver.x : seat.driver.x) * k).setFlipX(left);
        this.driver.play(villagerAnim(this, 'shorthair', moving ? 'walk' : 'idle'), true);
      }
    }
  }

  /** The ride's pictures for the way it's seen and the turn of its wheels:
   *  the vehicle under the rider, and what's drawn over them (a xích lô's
   *  carriage side; head-on, a bicycle's wheel and handlebar). */
  private dressRide() {
    if (!this.rideImage || this.ride === 'walk') return;
    const ride = this.ride, view = this.rideView, frame = this.wheelFrame;
    this.rideImage.setTexture(this.rideTexture(ride, frame, view));
    const key = `ride-${ride}-over-${view}-${frame}`;
    if (!this.textures.exists(key)) {
      const over = drawRideFront(ride, view, frame);
      if (over) this.textures.addCanvas(key, over)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    if (!this.textures.exists(key)) { this.rideFront?.setVisible(false); return; }
    if (!this.rideFront) {
      this.rideFront = this.add.image(0, 4, key).setOrigin(0.5, 1).setScale(SCALE * RIDE_SCALE[ride]);
      // Over the rider, under their name.
      this.buddy.addAt(this.rideFront, this.buddy.getIndex(this.sprite) + 1);
    }
    this.rideFront.setTexture(key).setVisible(true);
  }

  /** Walk, or ride a bicycle or a xích lô: the buddy gets on (or off) where
   *  they stand, and goes as fast as the ride does. */
  setRide(ride: Ride) {
    this.ride = ride;
    this.args.ride = ride;
    if (!this.buddy) return;
    this.rideImage?.destroy();
    this.rideFront?.destroy();
    this.driver?.destroy();
    this.rideImage = undefined;
    this.rideFront = undefined;
    this.driver = undefined;
    const scale = this.spec.baseScale * (1.3 + this.args.stage * 0.1);
    if (ride === 'walk') {
      this.sprite.setPosition(0, 2);
      return;
    }
    // The vehicle under the buddy, wheels on the ground at the buddy's feet.
    const k = SCALE * RIDE_SCALE[ride];
    this.rideImage = this.add.image(0, 4, this.rideTexture(ride, 0)).setOrigin(0.5, 1).setScale(k);
    this.buddy.addAt(this.rideImage, 1);
    const seat = SEAT[ride];
    this.sprite.setPosition(seat.x * k, 4 + seat.y * k);
    if (seat.driver) {
      // A villager pedals behind — the xích lô's driver.
      this.driver = this.add.sprite(seat.driver.x * k, 4 + seat.driver.y * k, VILLAGERS_KEY, 'shorthair-walk-0')
        .setOrigin(0.5, 1).setScale(scale * 0.9);
      this.buddy.addAt(this.driver, 2);   // over the frame, in the saddle
    }
    this.applyAnim(false);
  }

  /** A few riders on the riverside roads — the north bank's and Lê Lợi on the
   *  south (rows from scripts/generate-hue-map.mjs) — going back and forth at
   *  their own pace, so the streets aren't empty. They don't block anyone. */
  private spawnTraffic() {
    const lanes: [number, Exclude<Ride, 'walk'>, boolean, number][] = [
      // [road row, ride, carries a passenger, speed px/s]
      [49.6, 'bike', false, 70],
      [49.6, 'cyclo', false, 45],
      [59.6, 'cyclo', true, 40],
      [59.6, 'bike', false, 85],
    ];
    lanes.forEach(([row, ride, passenger, speed], i) => {
      const k = SCALE * RIDE_SCALE[ride];
      const x0 = 3 * this.tilePx, x1 = 95 * this.tilePx;
      const start = x0 + ((i * 0.31 + 0.15) % 1) * (x1 - x0);
      const rig = this.add.container(start, row * this.tilePx).setDepth(DEPTH_BUDDY - 1);
      rig.add(this.add.ellipse(0, 3, 30 * RIDE_SCALE[ride], 6, 0x000000, 0.22));
      const img = this.add.image(0, 4, this.rideTexture(ride, 0)).setOrigin(0.5, 1).setScale(k);
      rig.add(img);
      const parts: Phaser.GameObjects.Components.Flip[] = [img];
      const seat = SEAT[ride];
      const person = (x: number, y: number, look: VillagerLook, pedalling: boolean) => {
        const p = this.add.sprite(x * k, 4 + y * k, VILLAGERS_KEY, `${look}-idle-0`).setOrigin(0.5, 1).setScale(SCALE * 0.9);
        p.play({ key: villagerAnim(this, look, pedalling ? 'walk' : 'idle'), delay: i * 130 });
        rig.add(p);
        parts.push(p);
        this.tinted.push(p);
      };
      if (ride === 'bike') person(seat.x, seat.y, keeperLookFor(i + 2), true);
      else {
        if (seat.driver) person(seat.driver.x, seat.driver.y, keeperLookFor(i + 3), true);
        if (passenger) person(seat.x, seat.y, keeperLookFor(i + 1), false);
        const front = drawRideFront(ride);
        if (front) {
          const key = `ride-${ride}-front`;
          if (!this.textures.exists(key)) this.textures.addCanvas(key, front)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
          const f = this.add.image(0, 4, key).setOrigin(0.5, 1).setScale(k);
          rig.add(f);
          parts.push(f);
        }
      }
      this.tinted.push(img);
      this.traffic.push({ rig, img, ride, parts, x0, x1, dir: i % 2 ? -1 : 1, speed });
    });
  }

  /** Ride the traffic along its road, turning at the ends. */
  private moveTraffic(dt: number, turnWheels: boolean) {
    for (const t of this.traffic) {
      let x = t.rig.x + t.dir * t.speed * dt;
      if (x > t.x1 || x < t.x0) { t.dir = -t.dir; x = Phaser.Math.Clamp(x, t.x0, t.x1); }
      t.rig.x = x;
      const left = t.dir < 0;
      // Mirrored, a part on the right of the rig moves to the left of it.
      for (const p of t.parts) {
        const go = p as unknown as Phaser.GameObjects.Image;
        if (go.flipX !== left) { go.setFlipX(left); go.x = -go.x; }
      }
      if (turnWheels) t.img.setTexture(this.rideTexture(t.ride, this.wheelFrame));
    }
  }

  /** A ride's frame as a texture, made once. */
  private rideTexture(ride: Exclude<Ride, 'walk'>, frame: number, view: RideView = 'side'): string {
    const key = `ride-${ride}-${view}-${frame}`;
    if (!this.textures.exists(key)) {
      this.textures.addCanvas(key, drawRide(ride, frame, view))?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    return key;
  }

  /** Change clothes (back from the tailor's) without rebuilding the world. */
  setDress(look: Look) {
    this.args.dress = look;
    this.sprite?.setLook(look);
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
      vx = (vx / len) * SPEED * RIDE_SPEED[this.ride];
      vy = (vy / len) * SPEED * RIDE_SPEED[this.ride];
    } else if (this.route.length > 0) {
      const [tx, ty] = this.route[0];
      const dx = tx - this.buddy.x, dy = ty - this.buddy.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) {
        this.route.shift();
      } else {
        vx = (dx / dist) * SPEED * RIDE_SPEED[this.ride];
        vy = (dy / dist) * SPEED * RIDE_SPEED[this.ride];
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
    // Turn the wheels — the buddy's while moving, the traffic's always.
    const turn = time - this.wheelClock > 110;
    if (turn) {
      this.wheelClock = time;
      this.wheelFrame = 1 - this.wheelFrame;
      if (this.rideImage && moving) this.dressRide();
    }
    this.moveTraffic(dt, turn);

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
    let best: KeeperNode | null = null;
    let bestD = REACH;
    for (const n of this.nodes) {
      const d = Math.hypot(n.x - this.buddy.x, n.y - this.buddy.y);
      if (d < bestD) { best = n; bestD = d; }
    }
    const id = best?.id ?? null;
    if (id !== this.nearestId) {
      const prev = this.nodes.find((n) => n.id === this.nearestId);
      if (prev) {
        prev.ring.setVisible(false);
        this.tweens.add({ targets: prev.root, scale: 1, duration: 150 });
      }
      if (best) {
        best.ring.setVisible(true);
        this.tweens.add({ targets: best.root, scale: 1.12, duration: 150, ease: 'back.out' });
      }
      this.nearestId = id;
      this.game.events.emit(WORLD_EVENTS.near, id);
    }

    // The named place being walked through → its label lights, React tells
    // its story.
    let place: (typeof this.labels)[number] | null = null;
    let placeD = PLACE_REACH;
    for (const l of this.labels) {
      if (!l.place) continue;
      const d = Math.hypot(l.text.x + l.text.width / 2 - this.buddy.x, l.text.y - this.buddy.y);
      if (d < placeD) { place = l; placeD = d; }
    }
    const placeId = place?.place ?? null;
    if (placeId !== this.litPlace) {
      for (const l of this.labels) {
        if (!l.place) continue;
        const on = l.place === placeId;
        l.text.setColor(on ? LABEL_LIT : this.pal.zones[l.theme].labelCss);
        this.tweens.add({ targets: l.text, alpha: on ? 1 : LABEL_REST, scale: on ? 1.12 : 1, duration: 220, ease: 'quad.out' });
      }
      this.litPlace = placeId;
      this.game.events.emit(WORLD_EVENTS.landmark, placeId);
    }
  }
}
