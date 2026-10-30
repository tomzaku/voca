// ── Palette ── bright and green, like an illustrated city map: lush grass,
// blue water, colourful roofs.

export const P = {
  grass: [112, 172, 78], grassLight: [122, 182, 84], grassDark: [102, 162, 72],
  fleckLight: [148, 200, 102], fleckDark: [86, 144, 62],
  dirt: [214, 194, 156], dirtEdge: [186, 164, 128], dirtSpeck: [199, 178, 140],
  stone: [204, 198, 186], stoneJoint: [184, 178, 166], stoneEdge: [158, 152, 142],
  water: [62, 146, 206], waterDeep: [50, 128, 194], waterShallow: [98, 178, 222], glint: [196, 230, 248],
  embank: [178, 172, 160], embankDark: [126, 120, 110],
  lotusPad: [94, 146, 88], lotusPad2: [112, 160, 98], lotus: [236, 150, 178],
  wallTop: [156, 146, 124], wallFace: [118, 108, 94], wallLine: [96, 88, 76], moss: [112, 132, 92],
  shadow: [24, 40, 36],
};

// Roof palettes: base, tile line, eave highlight, eave shadow, ridge.
export const ROOF = {
  imperial: { base: [226, 178, 64], line: [204, 154, 50], light: [244, 206, 116], eave: [146, 98, 40], ridge: [178, 116, 38] },
  glazed:   { base: [96, 142, 122], line: [84, 126, 108], light: [128, 170, 148], eave: [54, 88, 76], ridge: [68, 106, 90] },
  dark:     { base: [114, 100, 90], line: [98, 86, 78], light: [142, 126, 112], eave: [70, 60, 54], ridge: [84, 72, 64] },
  terra:    { base: [170, 104, 76], line: [150, 90, 66], light: [194, 130, 98], eave: [108, 62, 46], ridge: [126, 72, 52] },
  moss:     { base: [118, 122, 98], line: [104, 108, 86], light: [144, 148, 120], eave: [72, 76, 60], ridge: [86, 90, 70] },
  slate:    { base: [94, 94, 104], line: [82, 82, 92], light: [120, 120, 130], eave: [56, 56, 64], ridge: [68, 68, 76] },
  plum:     { base: [120, 92, 104], line: [104, 80, 92], light: [146, 116, 128], eave: [72, 54, 62], ridge: [88, 66, 76] },
  // The bright roofs of the neighbourhoods.
  red:      { base: [196, 74, 56], line: [172, 60, 46], light: [222, 110, 84], eave: [120, 40, 32], ridge: [140, 48, 36] },
  orange:   { base: [222, 128, 62], line: [198, 108, 50], light: [240, 160, 96], eave: [138, 72, 34], ridge: [160, 84, 40] },
  blue:     { base: [76, 112, 168], line: [64, 96, 148], light: [108, 144, 196], eave: [42, 64, 100], ridge: [52, 76, 118] },
  teal:     { base: [58, 140, 128], line: [48, 120, 110], light: [92, 170, 156], eave: [32, 84, 76], ridge: [40, 96, 88] },
};
