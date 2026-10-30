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
};
