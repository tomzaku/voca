// The rooms you step into from a keeper's door — one per skill, drawn by
// scripts/generate-rooms.mjs. A room is a backdrop for the skill's menu and
// activities (RoomScene): the keeper and your buddy stand in it, the skill's
// HUD sits over it. Positions are in the room art's own pixels, the people
// kept to the sides so the menu in the middle never covers them.
//
// Kept dependency-free like the rest of src/game/'s data.

export interface RoomDef {
  /** The skill this room belongs to (WorldSkill.id). */
  id: string;
  url: string;
  w: number;
  h: number;
  keeper: { x: number; y: number };
  buddy: { x: number; y: number };
  /** Fills the frame where the art doesn't reach (a very wide or tall one). */
  edge: number;
  /** The real place the room is in — its story (the `places` catalog) is
   *  one tap away in the skill bar. */
  place?: string;
  /** Draw your buddy bigger than in the city — the tailor's, where you're
   *  looking at what you wear. */
  buddyScale?: number;
  /** The keeper's villager look, for a room with no skill keeper of its own. */
  keeperLook?: string;
}

export const ROOMS: Record<string, RoomDef> = {
  vocabulary: {
    id: 'vocabulary',
    url: 'game/rooms/vocabulary.png',
    w: 384, h: 192,
    keeper: { x: 72, y: 158 },
    buddy: { x: 312, y: 160 },
    edge: 0x2a1a12,
    place: 'dongBa',
  },
  // Chú Năm's tea stall on Cồn Hến, over the river.
  speaking: {
    id: 'speaking', url: 'game/rooms/speaking.png', w: 384, h: 192,
    keeper: { x: 64, y: 150 }, buddy: { x: 330, y: 162 },
    edge: 0x2a2014, place: 'conHen',
  },
  // The dragon boat's deck, Thiên Mụ's tower across the water.
  listening: {
    id: 'listening', url: 'game/rooms/listening.png', w: 384, h: 192,
    keeper: { x: 60, y: 156 }, buddy: { x: 322, y: 164 },
    edge: 0x24160e, place: 'dragonBoat',
  },
  // Văn Miếu's hall of stelae, the scholar at his desk.
  writing: {
    id: 'writing', url: 'game/rooms/writing.png', w: 384, h: 192,
    keeper: { x: 64, y: 156 }, buddy: { x: 296, y: 168 },
    edge: 0x221a14, place: 'vanMieu',
  },
  // The garden house at An Hiên — home.
  you: {
    id: 'you', url: 'game/rooms/you.png', w: 384, h: 192,
    keeper: { x: 104, y: 158 }, buddy: { x: 316, y: 166 },
    edge: 0x1e140c, place: 'anHien',
  },
  // The tailor's (tiệm may): where you're dressed, first and whenever you like.
  tailor: {
    id: 'tailor',
    url: 'game/rooms/tailor.png',
    w: 384, h: 192,
    keeper: { x: 56, y: 150 },
    buddy: { x: 130, y: 168 },
    edge: 0x24180f,
    buddyScale: 2.2,
    keeperLook: 'longhair',
  },
};
