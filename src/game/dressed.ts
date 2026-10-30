import Phaser from 'phaser';
import { WARDROBE_KEY, lookLayers, type Look } from './wardrobe';

// Your buddy, dressed: the wardrobe's layers (body, hair, hat) stacked in one
// container. Only the body runs an animation; every other layer copies its
// frame as it changes, so a hat can never drift a frame off its head.
// Origin is the feet, like the villager sprites it stands in for.

export type Clip = 'idle' | 'walk';
/** Which way the buddy faces: in profile (mirrored for left), towards the
 *  camera, or away from it. */
export type View = 'side' | 'front' | 'back';
const CLIP_FRAMES: Record<Clip, number> = { idle: 9, walk: 8 };
const CLIP_RATE: Record<Clip, number> = { idle: 7, walk: 10 };
const VIEW_SUFFIX: Record<View, string> = { side: '', front: 'Front', back: 'Back' };
/** The atlas's name for a clip seen from a view: `idle`, `walkFront`… */
const clipName = (clip: Clip, view: View) => `${clip}${VIEW_SUFFIX[view]}`;
const FRAME = 20;

/** Queue the wardrobe atlas (call from a scene's preload). */
export function loadWardrobe(scene: Phaser.Scene): void {
  if (scene.textures.exists(WARDROBE_KEY)) return;
  const base = import.meta.env.BASE_URL;
  scene.load.atlas(WARDROBE_KEY, `${base}game/characters/wardrobe.png`, `${base}game/characters/wardrobe.json`);
}

function bodyAnim(scene: Phaser.Scene, layer: string, clip: Clip, view: View): string {
  const name = clipName(clip, view);
  const key = `wd-${layer}-${name}`;
  if (!scene.anims.exists(key)) {
    scene.anims.create({
      key,
      frames: Array.from({ length: CLIP_FRAMES[clip] }, (_, i) => ({ key: WARDROBE_KEY, frame: `${layer}-${name}-${i}` })),
      frameRate: CLIP_RATE[clip],
      repeat: -1,
    });
  }
  return key;
}

export class Dressed extends Phaser.GameObjects.Container {
  private layers: Phaser.GameObjects.Sprite[] = [];
  private names: string[] = [];
  private clip: Clip = 'idle';
  private view: View = 'side';
  private flipped = false;

  /** `extra`: layers drawn over the look — a keeper's prop. */
  constructor(scene: Phaser.Scene, x: number, y: number, look: Look, private extra: string[] = []) {
    super(scene, x, y);
    scene.add.existing(this);
    this.setSize(FRAME, FRAME);
    this.setLook(look);
  }

  setLook(look: Look) {
    for (const s of this.layers) s.destroy();
    this.textureFilter();
    this.names = [...lookLayers(look), ...this.extra];
    this.layers = this.names.map((name) =>
      this.scene.add.sprite(0, 0, WARDROBE_KEY, `${name}-${clipName(this.clip, this.view)}-0`).setOrigin(0.5, 1).setFlipX(this.flipped));
    this.add(this.layers);
    const body = this.layers[0];
    body.on(Phaser.Animations.Events.ANIMATION_UPDATE, (_a: Phaser.Animations.Animation, f: Phaser.Animations.AnimationFrame) => {
      this.layers.forEach((s, i) => { if (i > 0) s.setFrame(`${this.names[i]}-${clipName(this.clip, this.view)}-${f.index - 1}`); });
    });
    this.playClip(this.clip, false);
    return this;
  }

  /** Walk or stand, seen from `view` (by default the way it already faces).
   *  `keep` leaves a clip already playing alone. */
  playClip(clip: Clip, keep = true, view: View = this.view) {
    const body = this.layers[0];
    if (keep && this.clip === clip && this.view === view && body.anims.isPlaying) return this;
    this.clip = clip;
    this.view = view;
    body.play(bodyAnim(this.scene, this.names[0], clip, view));
    this.layers.forEach((s, i) => { if (i > 0) s.setFrame(`${this.names[i]}-${clipName(clip, view)}-0`); });
    return this;
  }

  get flipX() { return this.flipped; }

  setFlipX(on: boolean) {
    this.flipped = on;
    for (const s of this.layers) s.setFlipX(on);
    return this;
  }

  private textureFilter() {
    if (this.scene.textures.exists(WARDROBE_KEY)) this.scene.textures.get(WARDROBE_KEY).setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
}
