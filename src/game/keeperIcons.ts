// Each skill's icon, as pixel art, floating over the top of its landmark —
// the building its keeper stands at — like a marker on a game's map. Drawn
// here as character grids (one letter per colour, '.' clear) so they share
// the map's square-pixel look instead of the system's emoji; the scene turns
// each into a texture once.
//
// `at` is the landmark's roofline in map tiles (scripts/generate-hue-map.mjs
// paints the buildings); the icon floats just above it.
//
// Kept dependency-free like the rest of src/game/'s data.

export interface PixelArt {
  palette: Record<string, string>;
  rows: string[];
}

export interface KeeperIcon extends PixelArt {
  /** The landmark's roofline, in map tiles. */
  at: { x: number; y: number };
}

const INK = '#1c120c';

export const KEEPER_ICONS: Record<string, KeeperIcon> = {
  // A red book with gold bands, over Đông Ba market.
  vocabulary: {
    at: { x: 91, y: 42 },
    palette: { k: INK, r: '#c0392b', d: '#8e2a20', g: '#f0c050', w: '#f6ecd6' },
    rows: [
      '.kkkkkkkkk..',
      'krrrrrrrrrk.',
      'krgggggggrk.',
      'krrrrrrrrrk.',
      'krrrrrrrrrk.',
      'krrgggggrrk.',
      'krrrrrrrrrk.',
      'krrrrrrrrrkk',
      'kwwwwwwwwwkd',
      'kddddddddddk',
      '.kkkkkkkkkk.',
    ],
  },
  // A speech bubble, two lines of talk in it, over the tea stall on Cồn Hến.
  speaking: {
    at: { x: 110.5, y: 38.5 },
    palette: { k: INK, w: '#f6ecd6', b: '#5aa0c8' },
    rows: [
      '.kkkkkkkkkk.',
      'kwwwwwwwwwwk',
      'kwbbbbwbbbwk',
      'kwwwwwwwwwwk',
      'kwbbbwbbbbwk',
      'kwwwwwwwwwwk',
      '.kkkwwkkkkk.',
      '...kwk......',
      '...kk.......',
    ],
  },
  // Headphones, over the dragon boat.
  listening: {
    at: { x: 55.5, y: 52 },
    palette: { k: INK, g: '#f0c050', r: '#c0392b' },
    rows: [
      '...kkkkkk...',
      '..kggggggk..',
      '.kgkk..kkgk.',
      '.kgk....kgk.',
      'kkkk....kkkk',
      'krrk....krrk',
      'krrk....krrk',
      'krrk....krrk',
      'kkkk....kkkk',
    ],
  },
  // A calligraphy brush, its tip inked, over Văn Miếu's hall.
  writing: {
    at: { x: 20, y: 39 },
    palette: { k: INK, b: '#a0703c', g: '#f0c050', w: '#f6ecd6' },
    rows: [
      '.........kk.',
      '........kbbk',
      '.......kbbk.',
      '......kbbk..',
      '.....kbbk...',
      '....kbbk....',
      '...kggk.....',
      '..kwwk......',
      '.kwwk.......',
      '.kkk........',
      'kk..........',
    ],
  },
  // A paw, over the garden house at An Hiên.
  you: {
    at: { x: 13, y: 7 },
    palette: { k: INK, p: '#ec8cac' },
    rows: [
      '.kk..kk..kk.',
      'kppkkppkkppk',
      'kppkkppkkppk',
      '.kk..kk..kk.',
      '...kkkkkk...',
      '..kppppppk..',
      '.kppppppppk.',
      '.kppppppppk.',
      '..kkkkkkkk..',
    ],
  },
  // A scroll, rolled at both ends, over Điện Thái Hòa.
  collections: {
    at: { x: 55, y: 25.5 },
    palette: { k: INK, w: '#f6ecd6', g: '#f0c050', l: '#a08060' },
    rows: [
      'kkkkkkkkkkkk',
      'kgwwwwwwwwgk',
      'kkkkkkkkkkkk',
      '.kwwwwwwwwk.',
      '.kwllllllwk.',
      '.kwwwwwwwwk.',
      '.kwllllwwwk.',
      '.kwwwwwwwwk.',
      'kkkkkkkkkkkk',
      'kgwwwwwwwwgk',
      'kkkkkkkkkkkk',
    ],
  },
};
