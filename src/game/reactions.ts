// Reactions, Gather-style: a quick gesture anyone in the world can make — a
// pixel icon over the buddy and a little move to go with it. Shared by the
// scene (which draws and animates them), the live channel (which only
// carries ones on this list) and the picker in GameWorld.

export type Reaction = 'wave' | 'dance' | 'clap' | 'agree' | 'disagree' | 'heart';
export const REACTIONS: Reaction[] = ['wave', 'dance', 'clap', 'agree', 'disagree', 'heart'];

export const isReaction = (v: unknown): v is Reaction => REACTIONS.includes(v as Reaction);

/** Gifts: given to one player (from their card), seen by everyone around. */
export type Gift = 'flower';
export const GIFTS: Gift[] = ['flower'];
export const isGift = (v: unknown): v is Gift => GIFTS.includes(v as Gift);

/** Anything the scene can show over a buddy: a reaction or a gift. */
export type Gesture = Reaction | Gift;

/** How long one reaction plays, and so the least time between two — the
 *  sender holds back and the receiver drops anything quicker. */
export const REACTION_MS = 900;

/** Each one's icon ('#' = a pixel, as PixelIcon draws them) and its colour. */
export const REACTION_ICONS: Record<Gesture, { rows: readonly string[]; color: string }> = {
  // An open palm, thumb out.
  wave: {
    color: '#e8a93a',
    rows: [
      '..#.#.#.',
      '..#.#.#.',
      '#.#.#.#.',
      '#.######',
      '########',
      '.#######',
      '..#####.',
      '..####..',
    ],
  },
  // Two beamed notes.
  dance: {
    color: '#9b6fd6',
    rows: [
      '..######',
      '..######',
      '..#....#',
      '..#....#',
      '..#..###',
      '.##.####',
      '###..##.',
      '.#......',
    ],
  },
  // Two palms meeting, a spark over them.
  clap: {
    color: '#e8a93a',
    rows: [
      '#..#..#',
      '.#...#.',
      '.......',
      '..#.#..',
      '.##.##.',
      '.##.##.',
      '.##.##.',
      '..#.#..',
    ],
  },
  agree: {
    color: '#4fa865',
    rows: [
      '....##..',
      '...###..',
      '...##...',
      '#.######',
      '#.######',
      '#.#####.',
      '#.######',
      '#..####.',
    ],
  },
  disagree: {
    color: '#d0563f',
    rows: [
      '#..####.',
      '#.######',
      '#.#####.',
      '#.######',
      '#.######',
      '...##...',
      '...###..',
      '....##..',
    ],
  },
  // A five-petalled flower on its stem, a leaf to one side.
  flower: {
    color: '#e46aa0',
    rows: [
      '..#.#..',
      '.#####.',
      '###.###',
      '.#####.',
      '..#.#..',
      '...#...',
      '.#.#...',
      '..##...',
      '...#...',
    ],
  },
  heart: {
    color: '#e0607e',
    rows: [
      '.##.##.',
      '#######',
      '#######',
      '#######',
      '.#####.',
      '..###..',
      '...#...',
    ],
  },
};
