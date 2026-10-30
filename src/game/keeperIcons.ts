// The icons floating over the keepers' heads, as pixel art — drawn here as
// character grids (one letter per colour, '.' clear) so they share the map's
// square-pixel look instead of the system's emoji. The scene turns each into
// a texture once and draws it at the map's 2× scale.
//
// Kept dependency-free like the rest of src/game/'s data.

export interface PixelArt {
  palette: Record<string, string>;
  rows: string[];
}

const INK = '#1c120c';

export const KEEPER_ICONS: Record<string, PixelArt> = {
  // A red book with gold bands.
  vocabulary: {
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
  // A speech bubble, two lines of talk in it.
  speaking: {
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
  // Headphones.
  listening: {
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
  // A calligraphy brush, its tip inked.
  writing: {
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
  // A paw.
  you: {
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
  // A scroll, rolled at both ends.
  collections: {
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
