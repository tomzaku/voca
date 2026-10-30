import Phaser from 'phaser';
import type { RoomDef } from '../rooms';
import {
  buddySpec, type BuddyLook,
  VILLAGERS_KEY, loadVillagers, villagerAnim, type VillagerLook,
} from '../textures';

// Inside a skill: its room, with the keeper and your buddy standing in it,
// under the skill's HUD. The city's scene sleeps meanwhile and wakes where you
// left it. Step one of rooms is a backdrop — nobody walks — so this scene
// only draws, and fills the frame however it's sized.

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
}
