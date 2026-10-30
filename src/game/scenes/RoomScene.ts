import Phaser from 'phaser';
import type { RoomDef } from '../rooms';
import { FONT } from '../palette';
import { onAnswerEvent, type AnswerEvent } from '../../lib/answerEvents';
import {
  buddySpec, type BuddyLook,
  VILLAGERS_KEY, loadVillagers, villagerAnim, type VillagerLook,
} from '../textures';

// Inside a skill: its room, with the keeper and your buddy standing in it,
// under the skill's HUD. The city's scene sleeps meanwhile and wakes where you
// left it. Nobody walks here; the two of them react to the round instead
// (lib/answerEvents): a right answer and your buddy hops while the keeper
// nods, a wrong one and it shakes with a "?", a run of right ones and a
// finished round set off sparkles and a warm glow over the hall.

export interface RoomSceneData {
  room: RoomDef;
  look: BuddyLook;
  stage: number;
  keeperLook: VillagerLook;
}

/** The map draws its 16px art at 2×; a room is drawn at 1× and zoomed. */
const MAP_SCALE = 2;

export class RoomScene extends Phaser.Scene {
  static KEY = 'room';
  private args!: RoomSceneData;
  private buddy!: Phaser.GameObjects.Sprite;
  private keeper!: Phaser.GameObjects.Sprite;
  private glow!: Phaser.GameObjects.Rectangle;

  constructor() {
    super(RoomScene.KEY);
  }

  init(data: RoomSceneData) {
    this.args = data;
  }

  private get textureKey() {
    return `room-${this.args.room.id}`;
  }

  preload() {
    if (!this.textures.exists(this.textureKey)) {
      this.load.image(this.textureKey, `${import.meta.env.BASE_URL}${this.args.room.url}`);
    }
    loadVillagers(this);
  }

  create() {
    const { room, look, stage, keeperLook } = this.args;
    this.textures.get(this.textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.add.image(0, 0, this.textureKey).setOrigin(0).setDepth(-1);

    const keeper = this.add
      .sprite(room.keeper.x, room.keeper.y, VILLAGERS_KEY, `${keeperLook}-idle-0`)
      .setOrigin(0.5, 1);
    keeper.play(villagerAnim(this, keeperLook, 'idle'));
    this.add.ellipse(room.keeper.x, room.keeper.y, 13, 3, 0x000000, 0.25);

    // Your buddy, at the size it walks the city, turned to face the keeper.
    const spec = buddySpec(look);
    const buddy = this.add
      .sprite(room.buddy.x, room.buddy.y, VILLAGERS_KEY, `${spec.look}-idle-0`)
      .setOrigin(0.5, 1)
      .setScale((spec.baseScale * (1.3 + stage * 0.1)) / MAP_SCALE)
      .setFlipX(room.buddy.x > room.keeper.x);
    buddy.play({ key: villagerAnim(this, spec.look, 'idle'), delay: 300 });
    this.add.ellipse(room.buddy.x, room.buddy.y, 12, 3, 0x000000, 0.25);
    keeper.setDepth(1);
    buddy.setDepth(1);
    this.buddy = buddy;
    this.keeper = keeper;
    this.glow = this.add.rectangle(0, 0, room.w, room.h, 0xffd27a, 0).setOrigin(0).setDepth(2).setBlendMode(Phaser.BlendModes.ADD);

    const off = onAnswerEvent((e) => this.react(e));
    this.events.once('shutdown', off);

    const cam = this.cameras.main;
    cam.setBackgroundColor(room.edge);
    cam.setRoundPixels(true);
    this.fit();
    this.scale.on('resize', this.fit, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.fit, this));
    cam.fadeIn(220, 0, 0, 0);
  }

  /** Cover the frame: the room fills it edge to edge, cropping its own edges
   *  on a frame of another shape rather than leaving bars. */
  private fit() {
    const { w, h } = this.args.room;
    const cam = this.cameras.main;
    cam.setZoom(Math.max(this.scale.width / w, this.scale.height / h));
    cam.centerOn(w / 2, h / 2);
  }

  // ── Reactions ──

  private react(e: AnswerEvent) {
    const { room } = this.args;
    switch (e.kind) {
      case 'correct':
        this.hop(this.buddy, room.buddy.y, 6);
        this.hop(this.keeper, room.keeper.y, 2);
        this.float(room.buddy.x, this.headY(), '✓', '#7ee08a');
        break;
      case 'wrong':
        this.shake(this.buddy, room.buddy.x);
        this.tilt(this.keeper);
        this.float(room.buddy.x, this.headY(), '?', '#ffd27a');
        break;
      case 'combo':
        this.hop(this.buddy, room.buddy.y, 10);
        this.hop(this.keeper, room.keeper.y, 4);
        this.float(room.buddy.x, this.headY() - 4, `×${e.count}`, '#ffd27a', 12);
        this.sparkle(room.buddy.x, this.headY(), 10);
        this.flash(0.12);
        break;
      case 'done':
        this.spin(this.buddy);
        this.hop(this.buddy, room.buddy.y, 12);
        this.hop(this.keeper, room.keeper.y, 4);
        this.sparkle(room.buddy.x, this.headY(), 18);
        this.sparkle(room.keeper.x, room.keeper.y - 22, 10);
        this.flash(0.2);
        break;
    }
  }

  private headY() {
    return this.args.room.buddy.y - this.buddy.displayHeight - 2;
  }

  /** Up and back down; a new hop replaces one still in the air. */
  private hop(s: Phaser.GameObjects.Sprite, groundY: number, height: number) {
    this.tweens.killTweensOf(s);
    s.y = groundY;
    s.angle = 0;
    this.tweens.add({ targets: s, y: groundY - height, duration: 130, yoyo: true, ease: 'quad.out' });
  }

  private shake(s: Phaser.GameObjects.Sprite, homeX: number) {
    this.tweens.killTweensOf(s);
    s.x = homeX;
    this.tweens.add({ targets: s, x: homeX + 2, duration: 45, yoyo: true, repeat: 3, onComplete: () => { s.x = homeX; } });
  }

  /** A puzzled head-tilt. */
  private tilt(s: Phaser.GameObjects.Sprite) {
    this.tweens.add({ targets: s, angle: -8, duration: 160, yoyo: true, hold: 220, ease: 'sine.inOut' });
  }

  /** A full turn, drawn as two flips — the art only faces front. */
  private spin(s: Phaser.GameObjects.Sprite) {
    const flip = s.flipX;
    this.time.addEvent({ delay: 90, repeat: 3, callback: () => s.setFlipX(!s.flipX) });
    this.time.delayedCall(450, () => s.setFlipX(flip));
  }

  /** A mark that rises off someone's head and fades. */
  private float(x: number, y: number, text: string, color: string, size = 9) {
    const t = this.add
      .text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: 'bold', color, stroke: '#2a1a12', strokeThickness: 2 })
      .setOrigin(0.5, 1)
      .setDepth(3)
      .setResolution(Math.ceil(this.cameras.main.zoom));
    this.tweens.add({ targets: t, y: y - 10, alpha: 0, duration: 750, ease: 'quad.out', onComplete: () => t.destroy() });
  }

  /** Gold pixels bursting outwards. */
  private sparkle(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const d = 10 + Math.random() * 10;
      const p = this.add.rectangle(x, y, 2, 2, i % 3 ? 0xffd27a : 0xffffff).setDepth(3);
      this.tweens.add({
        targets: p, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 4, alpha: 0,
        duration: 500 + Math.random() * 250, ease: 'quad.out', onComplete: () => p.destroy(),
      });
    }
  }

  /** The hall's lanterns burn brighter for a moment. */
  private flash(strength: number) {
    this.tweens.killTweensOf(this.glow);
    this.glow.setAlpha(strength);
    this.tweens.add({ targets: this.glow, alpha: 0, duration: 600, ease: 'quad.out' });
  }
}
