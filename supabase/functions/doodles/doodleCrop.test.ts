// Cutting a generated doodle sheet into thumbnails, tested against synthetic
// sheets. Every case here is one the real pipeline got wrong at some point:
// doodles clipped by a fixed-inset crop, and grid rules surviving into the
// thumbnail as a border. The two failures look opposite but have one cause —
// where the model actually puts its lines and how big it draws, neither of
// which is knowable in advance. So the crop has to measure the sheet, and
// these tests are how we know it does.

import { describe, expect, it } from 'vitest';
import {
  cellRegions,
  clearRegion,
  cropFault,
  fitCrop,
  inkBounds,
  LABEL_BAND,
  withoutLabelBand,
  type Region,
} from './doodleCrop.ts';

const W = 1024, H = 1024, COLS = 4, ROWS = 4, CW = W / COLS, CH = H / ROWS;

type Rect = { x: number; y: number; w: number; h: number };
type RGB = [number, number, number];

// The model is asked for "thin light gray" rules and obliges with anything
// from near-black to barely-there. Both extremes get tested, because they fail
// differently: a dark rule gets measured as part of the drawing and blows the
// crop out to full size, while a pale one slips under an ink threshold and
// rides along into the thumbnail as a border.
const RULE_DARK: RGB = [170, 170, 170];
const RULE_PALE: RGB = [232, 232, 232];
const INK: RGB = [20, 20, 20];
const ORANGE: RGB = [230, 140, 40]; // a flat accent colour: bright red channel, darker elsewhere

function blankSheet(): Uint8ClampedArray {
  const b = new Uint8ClampedArray(W * H * 4);
  b.fill(255);
  return b;
}

function fill(b: Uint8ClampedArray, r: Rect, c: RGB): void {
  for (let y = Math.round(r.y); y < Math.round(r.y + r.h); y++) {
    for (let x = Math.round(r.x); x < Math.round(r.x + r.w); x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = (y * W + x) * 4;
      b[i] = c[0]; b[i + 1] = c[1]; b[i + 2] = c[2]; b[i + 3] = 255;
    }
  }
}

/** The sheet's grid. `offset` shifts every line off the exact quarter boundary,
 *  which is what a fixed-inset crop cannot survive. */
function drawRules(b: Uint8ClampedArray, { thickness = 2, offset = 0, colour = RULE_DARK } = {}): Rect[] {
  const rects: Rect[] = [];
  for (let r = 0; r <= ROWS; r++) {
    const y = Math.min(H - thickness, Math.max(0, r * CH + offset));
    rects.push({ x: 0, y, w: W, h: thickness });
  }
  for (let c = 0; c <= COLS; c++) {
    const x = Math.min(W - thickness, Math.max(0, c * CW + offset));
    rects.push({ x, y: 0, w: thickness, h: H });
  }
  for (const r of rects) fill(b, r, colour);
  return rects;
}

/** A rule as the model really draws it: a dark core that fades out through a
 *  few near-white pixels. The fringe is the dangerous part — pale enough to
 *  read as paper, dark enough to show as a line against the thumbnail. */
function drawSoftRules(b: Uint8ClampedArray, { core = 2 } = {}): Rect[] {
  const fringe = [210, 232, 246, 251];
  const bands: Rect[] = [];
  const stripe = (x: number, y: number, w: number, h: number, c: RGB) => fill(b, { x, y, w, h }, c);
  for (let r = 0; r <= ROWS; r++) {
    const y = Math.min(H - core, Math.max(0, r * CH));
    for (let f = fringe.length - 1; f >= 0; f--) {
      const g = fringe[f];
      stripe(0, y - (f + 1), W, 1, [g, g, g]);
      stripe(0, y + core + f, W, 1, [g, g, g]);
    }
    stripe(0, y, W, core, [140, 140, 140]);
    bands.push({ x: 0, y: y - fringe.length, w: W, h: core + fringe.length * 2 });
  }
  for (let c = 0; c <= COLS; c++) {
    const x = Math.min(W - core, Math.max(0, c * CW));
    for (let f = fringe.length - 1; f >= 0; f--) {
      const g = fringe[f];
      stripe(x - (f + 1), 0, 1, H, [g, g, g]);
      stripe(x + core + f, 0, 1, H, [g, g, g]);
    }
    stripe(x, 0, core, H, [140, 140, 140]);
    bands.push({ x: x - fringe.length, y: 0, w: core + fringe.length * 2, h: H });
  }
  return bands;
}

const cellRegion = (i: number): Region => ({
  x: (i % COLS) * CW, y: Math.floor(i / COLS) * CH, w: CW, h: CH,
});

/** The part of a cell the picture lives in: everything above the word band. */
const pictureArea = (i: number): Region => ({ ...cellRegion(i), h: Math.round(cellRegion(i).h * (1 - LABEL_BAND)) });

/** A doodle of `frac` of the picture area, centred in it unless nudged. The
 *  prompt asks the model to keep the drawing clear of the word band, so that —
 *  not the whole cell — is the space a doodle is measured against. */
function doodleIn(i: number, frac: number, nudge = { x: 0, y: 0 }): Rect {
  const area = pictureArea(i);
  const s = Math.round(Math.min(area.w, area.h) * frac);
  return {
    x: area.x + Math.round((area.w - s) / 2) + nudge.x,
    y: area.y + Math.round((area.h - s) / 2) + nudge.y,
    w: s,
    h: s,
  };
}

/** The word the model is asked to write under a doodle, in the band reserved
 *  for it at the foot of the cell. */
function labelUnder(b: Uint8ClampedArray, i: number): Rect {
  const reg = cellRegion(i);
  const area = pictureArea(i);
  return drawCaption(b, { x: reg.x + 60, y: area.y + area.h + 18 });
}

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Everything a good crop must satisfy, in one place. */
function expectGoodCrop(
  crop: { x: number; y: number; side: number },
  region: Region,
  rules: Rect[],
  doodle?: Rect,
) {
  const box: Rect = { x: crop.x, y: crop.y, w: crop.side, h: crop.side };
  // Never reaches into a neighbouring cell.
  expect(crop.x).toBeGreaterThanOrEqual(region.x);
  expect(crop.y).toBeGreaterThanOrEqual(region.y);
  expect(crop.x + crop.side).toBeLessThanOrEqual(region.x + region.w);
  expect(crop.y + crop.side).toBeLessThanOrEqual(region.y + region.h);
  // No grid rule inside the thumbnail — this is the "border" bug.
  for (const rule of rules) expect(overlaps(box, rule)).toBe(false);
  if (doodle) {
    // The whole drawing survives — this is the "clipped" bug.
    expect(crop.x).toBeLessThanOrEqual(doodle.x);
    expect(crop.y).toBeLessThanOrEqual(doodle.y);
    expect(crop.x + crop.side).toBeGreaterThanOrEqual(doodle.x + doodle.w);
    expect(crop.y + crop.side).toBeGreaterThanOrEqual(doodle.y + doodle.h);
  }
}

/** A line of lettering under (or over) a doodle: thin upright strokes, spaced
 *  out, spanning most of the cell — what the model writes no matter what the
 *  prompt says. Returns the band's bounding rect. */
function drawCaption(b: Uint8ClampedArray, { x, y, letters = 9, height = 12 }: { x: number; y: number; letters?: number; height?: number }): Rect {
  const pitch = 14;
  for (let l = 0; l < letters; l++) {
    const lx = x + l * pitch;
    fill(b, { x: lx, y, w: 2, h: height }, INK);          // stem
    fill(b, { x: lx + 5, y, w: 2, h: height }, INK);      // second stroke
    fill(b, { x: lx, y: y + Math.round(height / 2), w: 7, h: 2 }, INK); // crossbar
  }
  return { x, y, w: letters * pitch, h: height };
}

/** How much of the thumbnail the drawing takes up. */
const fillRatio = (crop: { side: number }, doodle: Rect) =>
  Math.max(doodle.w, doodle.h) / crop.side;

/** The real pipeline for one cell: locate the grid, then fit the crop. */
function cropCell(b: Uint8ClampedArray, i: number, cols = COLS, rows = ROWS) {
  const region = cellRegions(b, W, H, cols, rows).regions[i];
  return { crop: fitCrop(b, W, H, region), region };
}

describe('inkBounds', () => {
  it('finds dark ink and ignores paper', () => {
    const b = blankSheet();
    fill(b, { x: 100, y: 120, w: 40, h: 30 }, INK);
    expect(inkBounds(b, W, 0, 0, 512, 512)).toEqual({ minX: 100, minY: 120, maxX: 139, maxY: 149 });
  });

  it('counts a flat accent colour as ink, not paper', () => {
    const b = blankSheet();
    fill(b, { x: 60, y: 60, w: 20, h: 20 }, ORANGE);
    expect(inkBounds(b, W, 0, 0, 256, 256)).not.toBeNull();
  });

  it('returns null for a blank region', () => {
    expect(inkBounds(blankSheet(), W, 0, 0, 256, 256)).toBeNull();
  });

  it('ignores fully transparent pixels', () => {
    const b = blankSheet();
    for (let i = 0; i < 100 * 4; i += 4) { b[i] = 0; b[i + 1] = 0; b[i + 2] = 0; b[i + 3] = 0; }
    expect(inkBounds(b, W, 0, 0, 100, 1)).toBeNull();
  });
});

describe('clearRegion', () => {
  it('trims thin rules off every edge', () => {
    const b = blankSheet();
    drawRules(b, { thickness: 2 });
    const inner = clearRegion(b, W, H, cellRegion(5));
    expect(inner.x).toBeGreaterThan(cellRegion(5).x);
    expect(inner.w).toBeLessThan(CW);
  });

  it('trims thick rules a fixed guard band would have missed', () => {
    const b = blankSheet();
    const rules = drawRules(b, { thickness: 12 });
    const region = cellRegion(5);
    const inner = clearRegion(b, W, H, region);
    const innerRect = { x: inner.x, y: inner.y, w: inner.w, h: inner.h };
    for (const rule of rules) expect(overlaps(innerRect, rule)).toBe(false);
  });

  it('trims a leftover sliver of rule at the region edge', () => {
    // Locating the grid can leave a pixel or two behind where a line fades;
    // this is the second line of defence. The sliver runs the height of the
    // SHEET, as a real rule does — that is what marks it as a rule rather than
    // part of a drawing.
    const b = blankSheet();
    const region = cellRegion(5);
    const sliver = { x: region.x, y: 0, w: 3, h: H };
    fill(b, sliver, RULE_DARK);
    fill(b, doodleIn(5, 0.6), INK);
    const inner = clearRegion(b, W, H, region);
    expect(overlaps({ x: inner.x, y: inner.y, w: inner.w, h: inner.h }, sliver)).toBe(false);
  });

  it('keeps a long thin doodle stroke that only spans its own cell', () => {
    // A rope, a horizon, a cable: wide and thin enough to look exactly like a
    // rule inside one cell. It stops at the cell edge; a rule never does.
    const b = blankSheet();
    drawRules(b);
    const region = cellRegions(b, W, H, COLS, ROWS).regions[5];
    const stroke = { x: region.x + 12, y: region.y + 120, w: region.w - 24, h: 12 };
    fill(b, stroke, INK);
    const inner = clearRegion(b, W, H, region);
    expect(inner.y).toBeLessThanOrEqual(stroke.y);
    expect(inner.y + inner.h).toBeGreaterThanOrEqual(stroke.y + stroke.h);
  });

  it('leaves a clean cell alone', () => {
    const b = blankSheet();
    const region = cellRegion(5);
    const inner = clearRegion(b, W, H, region);
    expect(inner).toEqual(region);
  });

  it('does not eat a wide doodle sitting in the middle of the cell', () => {
    const b = blankSheet();
    drawRules(b);
    // A "cable"-ish doodle: one long stroke spanning most of the cell.
    const stroke = { x: cellRegion(5).x + 20, y: cellRegion(5).y + 120, w: CW - 40, h: 14 };
    fill(b, stroke, INK);
    const inner = clearRegion(b, W, H, cellRegion(5));
    expect(inner.y).toBeLessThan(stroke.y);
    expect(inner.y + inner.h).toBeGreaterThan(stroke.y + stroke.h);
  });
});

describe('withoutLabelBand', () => {
  // The prompt asks for the word under each doodle; this is what takes it back
  // off. It cuts on the gap between picture and word, because the model puts
  // the block where it likes — on a real sheet it left 40px of blank page under
  // the last row, and a cut at a fixed 80% of the cell went through the word.
  it('cuts the word off the bottom of the cell', () => {
    const b = blankSheet();
    const reg = cellRegion(5);
    const doodle = doodleIn(5, 0.6);
    fill(b, doodle, INK);
    const label = labelUnder(b, 5);
    const inner = withoutLabelBand(b, W, reg);
    expect(inner.y + inner.h).toBeLessThanOrEqual(label.y);
    expect(inner.y + inner.h).toBeGreaterThanOrEqual(doodle.y + doodle.h);
  });

  it('cuts it wherever the block sits, not at a fixed fraction', () => {
    // The same cell with 40px of blank page under the word, as the model
    // really drew the bottom row.
    const b = blankSheet();
    const reg = cellRegion(5);
    const doodle = { x: reg.x + 50, y: reg.y + 20, w: 150, h: 140 };
    fill(b, doodle, INK);
    const label = drawCaption(b, { x: reg.x + 60, y: reg.y + 186 });
    const inner = withoutLabelBand(b, W, reg);
    expect(inner.y + inner.h).toBeLessThanOrEqual(label.y);
    expect(inner.y + inner.h).toBeGreaterThanOrEqual(doodle.y + doodle.h);
  });

  it('takes a word split in two by its own descenders', () => {
    // Measured on a real cell: "dormitory" came back as bands 222-243 and
    // 245-248. Cutting only the last run would leave most of the word.
    const b = blankSheet();
    const reg = cellRegion(5);
    fill(b, { x: reg.x + 50, y: reg.y + 20, w: 150, h: 140 }, INK);
    const label = drawCaption(b, { x: reg.x + 60, y: reg.y + 190 });
    fill(b, { x: reg.x + 90, y: label.y + label.h + 2, w: 40, h: 4 }, INK); // descenders
    const inner = withoutLabelBand(b, W, reg);
    expect(inner.y + inner.h).toBeLessThanOrEqual(label.y);
  });

  it('leaves a cell with no word under it exactly as it was', () => {
    const b = blankSheet();
    const reg = cellRegion(5);
    fill(b, doodleIn(5, 0.6), INK);
    expect(withoutLabelBand(b, W, reg)).toEqual(reg);
  });
});

describe('cellRegions', () => {
  it('reads the cells off the drawn rules', () => {
    const b = blankSheet();
    drawRules(b, { thickness: 2 });
    const { regions } = cellRegions(b, W, H, COLS, ROWS);
    expect(regions).toHaveLength(16);
    // Each region sits between rules, so it starts just after one.
    expect(regions[0].x).toBeGreaterThanOrEqual(2);
    expect(regions[5].x).toBeGreaterThan(CW);
  });

  it('follows a grid the model drew off the exact boundary', () => {
    const b = blankSheet();
    const rules = drawRules(b, { thickness: 3, offset: 14 });
    const { regions } = cellRegions(b, W, H, COLS, ROWS);
    for (const region of regions) {
      const rect = { x: region.x, y: region.y, w: region.w, h: region.h };
      for (const rule of rules) expect(overlaps(rect, rule)).toBe(false);
    }
  });

  it('follows uneven cells', () => {
    const b = blankSheet();
    // Vertical rules at irregular positions — the model does not measure.
    const xs = [0, 200, 500, 760, 1020];
    const rules: Rect[] = [];
    for (const x of xs) rules.push({ x, y: 0, w: 4, h: H });
    for (let r = 0; r <= ROWS; r++) rules.push({ x: 0, y: Math.min(H - 4, r * CH), w: W, h: 4 });
    for (const r of rules) fill(b, r, RULE_DARK);
    const { regions } = cellRegions(b, W, H, COLS, ROWS);
    expect(regions[0].w).toBeCloseTo(196, -1);
    expect(regions[1].w).toBeCloseTo(296, -1);
    for (const region of regions) {
      const rect = { x: region.x, y: region.y, w: region.w, h: region.h };
      for (const rule of rules) expect(overlaps(rect, rule)).toBe(false);
    }
  });

  it('falls back to even division when no grid was drawn, and says so', () => {
    const { regions, grid } = cellRegions(blankSheet(), W, H, COLS, ROWS);
    expect(regions[0]).toEqual({ x: 0, y: 0, w: CW, h: CH });
    expect(regions[5]).toEqual({ x: CW, y: CH, w: CW, h: CH });
    // Usable: with no rules drawn there is no line for a crop to cut into.
    expect(grid).toBe('ungridded');
  });

  it('works on a sheet whose paper is not pure white', () => {
    // Live failure: the model handed back a page at 249-251 in every channel,
    // under the fixed 252 that meant "paper". Every pixel on the sheet then
    // counted as ink, every scanline read as a full run, and the rule scan went
    // blind — a drawn grid could not be found and a stray line could not be
    // trimmed off a cell. The level has to be measured off the sheet.
    const b = blankSheet();
    const OFF_WHITE: RGB = [250, 251, 250];
    fill(b, { x: 0, y: 0, w: W, h: H }, OFF_WHITE);
    const rules = drawRules(b, { thickness: 3, colour: RULE_PALE });
    const { regions, grid } = cellRegions(b, W, H, COLS, ROWS);
    expect(grid).toBe('detected');
    for (const region of regions) {
      const rect = { x: region.x, y: region.y, w: region.w, h: region.h };
      for (const rule of rules) expect(overlaps(rect, rule)).toBe(false);
    }
  });

  it('cuts on the gutter the doodles left, not on the even quarter', () => {
    // Live failure: with no rules to find, the last cut fell on x=768 while the
    // gutter the model actually left was at 728 — 40px inside a doodle, and the
    // thumbnail lost the end of it. Nothing is drawn between doodles now, so
    // the white space between them IS the boundary.
    const b = blankSheet();
    const bottom = 3 * CH;
    for (let c = 0; c < 3; c++) {
      fill(b, { x: c * CW + 50, y: bottom + 50, w: 150, h: 150 }, INK);
    }
    // ...and the last one drawn 40px left of where its cell starts.
    const straddler = { x: 3 * CW - 40, y: bottom + 50, w: 190, h: 150 };
    fill(b, straddler, INK);
    const { regions } = cellRegions(b, W, H, COLS, ROWS);
    expect(regions[15].x).toBeLessThan(straddler.x);
    // And the whole doodle survives the crop that follows.
    expectGoodCrop(fitCrop(b, W, H, regions[15]), regions[15], [], straddler);
  });

  it('leaves the cut where it was when two doodles run together', () => {
    // No gutter to find: guessing further afield would only cut a third doodle.
    const b = blankSheet();
    const bottom = 3 * CH;
    fill(b, { x: 2 * CW + 40, y: bottom + 40, w: CW - 40, h: 160 }, INK);
    fill(b, { x: 3 * CW, y: bottom + 40, w: 180, h: 160 }, INK);
    const { regions } = cellRegions(b, W, H, COLS, ROWS);
    expect(regions[15].x).toBe(3 * CW);
  });

  it('reports a lineless sheet with the wrong number of rows', () => {
    // Live failure: asked for 4x4, the model drew FIVE rows of four — twenty
    // doodles, one word drawn twice. With no rules to give it away, the sheet
    // cut into sixteen cells that each straddled a boundary, and thumbnails
    // came back with a neighbour's word inside them.
    const b = blankSheet();
    const rowHeight = H / 5;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < COLS; c++) {
        const top = Math.round(r * rowHeight);
        fill(b, { x: c * CW + 60, y: top + 20, w: 130, h: 120 }, INK);
        drawCaption(b, { x: c * CW + 70, y: top + 160 });
      }
    }
    expect(cellRegions(b, W, H, COLS, ROWS).grid).toBe('mismatch');
  });

  it('accepts the layout it asked for', () => {
    const b = blankSheet();
    for (let i = 0; i < 16; i++) {
      fill(b, doodleIn(i, 0.6), INK);
      labelUnder(b, i);
    }
    expect(cellRegions(b, W, H, COLS, ROWS).grid).toBe('ungridded');
  });

  it('reports a grid that is not the one we asked for', () => {
    // Live failure: asked for 4x4, the model drew 3x3. Every even quarter then
    // straddles a real rule, clearRegion keeps whichever fragment holds most
    // ink, and the thumbnail is a piece of one stroke blown up to 192px. This
    // is the sheet that has to be thrown away, so it must not read the same as
    // a sheet with no rules at all.
    const b = blankSheet();
    for (let i = 0; i <= 3; i++) {
      fill(b, { x: Math.min(W - 3, Math.round(i * (W / 3))), y: 0, w: 3, h: H }, RULE_DARK);
      fill(b, { x: 0, y: Math.min(H - 3, Math.round(i * (H / 3))), w: W, h: 3 }, RULE_DARK);
    }
    expect(cellRegions(b, W, H, COLS, ROWS).grid).toBe('mismatch');
  });

  it('reports a mismatch when one line of the grid is missing', () => {
    // The commoner near-miss: a 4x4 with one internal rule left out, so two
    // cells read as one wide one.
    const b = blankSheet();
    for (let i = 0; i <= COLS; i++) {
      if (i !== 2) fill(b, { x: Math.min(W - 3, i * CW), y: 0, w: 3, h: H }, RULE_DARK);
      fill(b, { x: 0, y: Math.min(H - 3, i * CH), w: W, h: 3 }, RULE_DARK);
    }
    expect(cellRegions(b, W, H, COLS, ROWS).grid).toBe('mismatch');
  });

  it('confirms the grid when the model drew what it was asked for', () => {
    const b = blankSheet();
    drawRules(b, { thickness: 2 });
    expect(cellRegions(b, W, H, COLS, ROWS).grid).toBe('detected');
  });

  it('confirms the grid through every layout the real pipeline survives', () => {
    // These sheets already crop correctly, so the new gate must not start
    // throwing them away: off-boundary rules, thick rules, and the fading
    // antialiased ones.
    for (const opts of [{ offset: 14, thickness: 3 }, { thickness: 10, offset: 12 }]) {
      const b = blankSheet();
      drawRules(b, opts);
      expect(cellRegions(b, W, H, COLS, ROWS).grid).toBe('detected');
    }
    const soft = blankSheet();
    drawSoftRules(soft);
    expect(cellRegions(soft, W, H, COLS, ROWS).grid).toBe('detected');
  });

  it('treats an ungridded single doodle as one whole cell', () => {
    const b = blankSheet();
    fill(b, { x: 380, y: 400, w: 260, h: 240 }, INK);
    expect(cellRegions(b, W, H, 1, 1).regions).toEqual([{ x: 0, y: 0, w: W, h: H }]);
  });

  it('is not fooled by a doodle stroke spanning its whole cell', () => {
    const b = blankSheet();
    drawRules(b);
    // A full-width stroke inside cell 5 reads as a rule; the sliver cells it
    // would carve out are too thin to be real and must be discarded.
    fill(b, { x: CW + 4, y: CH + 130, w: CW - 8, h: 10 }, INK);
    const { regions } = cellRegions(b, W, H, COLS, ROWS);
    expect(regions).toHaveLength(16);
    expect(regions[5].h).toBeGreaterThan(CH * 0.7);
  });
});

describe('fitCrop', () => {
  const sizes = [
    ['small, 50% of the cell', 0.5],
    ['the prompt target, 70%', 0.7],
    ['oversized, 90% — the clipped-tiger case', 0.9],
  ] as const;

  for (const [name, frac] of sizes) {
    for (const [shade, colour] of [['dark', RULE_DARK], ['pale', RULE_PALE]] as const) {
      it(`fits a doodle drawn ${name} (${shade} rules)`, () => {
        const b = blankSheet();
        const rules = drawRules(b, { colour });
        const doodle = doodleIn(5, frac);
        fill(b, doodle, INK);
        const { crop, region } = cropCell(b, 5);
        expectGoodCrop(crop, region, rules, doodle);
      });
    }
  }

  it('normalises apparent size: a 50% and a 90% doodle fill the thumbnail alike', () => {
    const ratios = [0.5, 0.7, 0.9].map((frac) => {
      const b = blankSheet();
      drawRules(b);
      const doodle = doodleIn(5, frac);
      fill(b, doodle, INK);
      return fillRatio(cropCell(b, 5).crop, doodle);
    });
    for (const r of ratios) expect(r).toBeGreaterThan(0.8);
    expect(Math.max(...ratios) - Math.min(...ratios)).toBeLessThan(0.15);
  });

  it('fits the doodle, not the doodle plus the word under it', () => {
    // The whole pipeline on a cell as the prompt now asks for it: picture on
    // top, word in the band below. Left in, the word pulls the square down off
    // the doodle and shrinks it to fit both.
    const b = blankSheet();
    const rules = drawRules(b);
    const doodle = doodleIn(5, 0.7);
    fill(b, doodle, INK);
    const label = labelUnder(b, 5);
    const { crop, region } = cropCell(b, 5);
    expectGoodCrop(crop, region, [...rules, label], doodle);
    // And it still fills the thumbnail, rather than being squeezed by the text.
    expect(fillRatio(crop, doodle)).toBeGreaterThan(0.8);
  });

  it('centres a doodle the model pushed into a corner', () => {
    const b = blankSheet();
    const rules = drawRules(b);
    const doodle = doodleIn(5, 0.6, { x: 50, y: 30 });
    fill(b, doodle, INK);
    const { crop, region } = cropCell(b, 5);
    expectGoodCrop(crop, region, rules, doodle);
    // Roughly centred on the drawing, not on the cell.
    const cropCx = crop.x + crop.side / 2;
    expect(Math.abs(cropCx - (doodle.x + doodle.w / 2))).toBeLessThan(crop.side * 0.12);
  });

  it('keeps the whole of a wide, short doodle', () => {
    const b = blankSheet();
    const rules = drawRules(b);
    const reg = cellRegion(5);
    // Wide, but no wider than the picture area is tall: with the word band
    // reserved, that height is the biggest square the crop can cut.
    const doodle = { x: reg.x + 26, y: reg.y + 90, w: Math.round(CW * 0.7), h: Math.round(CH * 0.3) };
    fill(b, doodle, INK);
    const { crop, region } = cropCell(b, 5);
    expectGoodCrop(crop, region, rules, doodle);
  });

  it('survives rules that are thick and off-boundary at once', () => {
    const b = blankSheet();
    const rules = drawRules(b, { thickness: 10, offset: 12 });
    // The doodle follows the shifted grid, as it would on a real sheet.
    const doodle = doodleIn(5, 0.66, { x: 12, y: 12 });
    fill(b, doodle, INK);
    const { crop, region } = cropCell(b, 5);
    expectGoodCrop(crop, region, rules, doodle);
  });

  it('handles an outer frame drawn around the whole sheet', () => {
    const b = blankSheet();
    const rules = drawRules(b);
    const frame: Rect[] = [
      { x: 0, y: 0, w: W, h: 6 }, { x: 0, y: H - 6, w: W, h: 6 },
      { x: 0, y: 0, w: 6, h: H }, { x: W - 6, y: 0, w: 6, h: H },
    ];
    for (const f of frame) fill(b, f, INK);
    // Cell 0 is the one with the frame on two of its edges.
    const doodle = doodleIn(0, 0.6);
    fill(b, doodle, INK);
    expectGoodCrop(fitCrop(b, W, H, cellRegion(0)), cellRegion(0), [...rules, ...frame], doodle);
  });

  it('works in every cell of the grid, including the corners', () => {
    for (let i = 0; i < COLS * ROWS; i++) {
      const b = blankSheet();
      const rules = drawRules(b);
      const doodle = doodleIn(i, 0.7);
      fill(b, doodle, INK);
      const { crop, region } = cropCell(b, i);
      expectGoodCrop(crop, region, rules, doodle);
    }
  });

  it('excludes an antialiased rule INCLUDING its pale fringe', () => {
    // The core of a rule is easy; the fade either side is what shows up as a
    // hairline border in the thumbnail while reading as paper to a strict test.
    const b = blankSheet();
    const rules = drawSoftRules(b);
    const doodle = doodleIn(5, 0.65);
    fill(b, doodle, INK);
    const { crop, region } = cropCell(b, 5);
    expectGoodCrop(crop, region, rules, doodle);
  });

  it('keeps a doodle that fills its cell, rules and all', () => {
    // A solid doodle's own edge is a full-height run of ink, which looks just
    // like a rule to a per-cell scan — the difference is that a rule is THIN.
    // Get this wrong and the drawing gets eaten from the outside in.
    const b = blankSheet();
    const rules = drawSoftRules(b);
    const doodle = doodleIn(5, 0.94);
    fill(b, doodle, INK);
    const { crop, region } = cropCell(b, 5);
    expectGoodCrop(crop, region, rules, doodle);
  });

  it('cuts at the rule when the region straddles two cells', () => {
    // What a failed grid detection looks like: the region is an even quarter
    // but the real cells sit elsewhere, so the region contains a rule with a
    // neighbouring doodle beyond it. Seen live as a bordered thumbnail with a
    // slice of the next drawing showing at one edge.
    const b = blankSheet();
    const rules = drawSoftRules(b);
    const mine = { x: 300, y: 300, w: 140, h: 140 };
    const neighbour = { x: 530, y: 300, w: 140, h: 140 };
    fill(b, mine, INK);
    fill(b, neighbour, ORANGE);
    // Deliberately wrong region: spans the rule at x=512 into the next cell.
    const straddling: Region = { x: 290, y: 290, w: 380, h: 240 };
    const crop = fitCrop(b, W, H, straddling);
    const cropBox = { x: crop.x, y: crop.y, w: crop.side, h: crop.side };
    for (const rule of rules) expect(overlaps(cropBox, rule)).toBe(false);
    expect(overlaps(cropBox, neighbour)).toBe(false);
    // And it kept the drawing it was actually for.
    expect(crop.x).toBeLessThanOrEqual(mine.x);
    expect(crop.x + crop.side).toBeGreaterThanOrEqual(mine.x + mine.w);
  });

  it('never lets a rule into the thumbnail, whatever the grid did', () => {
    // A sheet whose table is inset from the canvas, so even division is wrong
    // for every cell — the crop still has to come out clean.
    const b = blankSheet();
    const margin = 40;
    const inner = W - margin * 2;
    const step = inner / COLS;
    const rules: Rect[] = [];
    for (let i = 0; i <= COLS; i++) {
      rules.push({ x: Math.round(margin + i * step), y: margin, w: 3, h: inner });
      rules.push({ x: margin, y: Math.round(margin + i * step), w: inner, h: 3 });
    }
    for (const r of rules) fill(b, r, RULE_DARK);
    // An inset table is still the 4x4 we asked for: the outer margins are too
    // narrow to count as cells, so the gate must not discard this sheet.
    expect(cellRegions(b, W, H, COLS, ROWS).grid).toBe('detected');
    for (let i = 0; i < COLS * ROWS; i++) {
      const c = i % COLS, r = Math.floor(i / COLS);
      const s = Math.round(step * 0.55);
      fill(b, {
        x: Math.round(margin + c * step + (step - s) / 2),
        y: Math.round(margin + r * step + (step - s) / 2),
        w: s, h: s,
      }, INK);
    }
    for (let i = 0; i < COLS * ROWS; i++) {
      const { crop } = cropCell(b, i);
      const cropBox = { x: crop.x, y: crop.y, w: crop.side, h: crop.side };
      for (const rule of rules) expect(overlaps(cropBox, rule)).toBe(false);
    }
  });

  it('falls back inside the cell when it is blank', () => {
    const b = blankSheet();
    const rules = drawRules(b);
    const { crop, region } = cropCell(b, 5);
    expectGoodCrop(crop, region, rules);
  });

  it('trims the margin on a single ungridded doodle so it matches sheet crops', () => {
    // n === 1 is drawn with no grid: the whole image is one cell, and the
    // prompt asks for a wide white margin the crop has to take back.
    const b = blankSheet();
    const doodle = { x: 380, y: 400, w: 260, h: 240 };
    fill(b, doodle, INK);
    const whole: Region = { x: 0, y: 0, w: W, h: H };
    const crop = fitCrop(b, W, H, whole);
    expectGoodCrop(crop, whole, [], doodle);
    expect(fillRatio(crop, doodle)).toBeGreaterThan(0.8);
  });
});

describe('a whole sheet, laid out the way the prompt asks for it', () => {
  // No rules, a doodle in the top of every cell, its word in the band below.
  it('gives every cell its own word band, and keeps the words out of the crops', () => {
    const b = blankSheet();
    const doodles: Rect[] = [];
    const labels: Rect[] = [];
    for (let i = 0; i < 16; i++) {
      const doodle = doodleIn(i, 0.6);
      fill(b, doodle, INK);
      doodles.push(doodle);
      labels.push(labelUnder(b, i));
    }
    const { regions, grid } = cellRegions(b, W, H, COLS, ROWS);
    expect(grid).toBe('ungridded');
    for (let i = 0; i < 16; i++) {
      const region = regions[i];
      // The row cut must fall BELOW a word, not between a doodle and its own
      // word — otherwise the band the crop trims is in the next cell down.
      expect(region.y).toBeLessThanOrEqual(labels[i].y);
      expect(region.y + region.h).toBeGreaterThanOrEqual(labels[i].y + labels[i].h);
      const crop = fitCrop(b, W, H, region);
      expectGoodCrop(crop, region, labels, doodles[i]);
    }
  });
});

describe('cropFault', () => {
  // The "badge" thumbnail: a ~20px sliver of one stroke, resized to 192px, so
  // the card showed about twenty enormous pixels. Whatever confused the region,
  // a crop this small is never a doodle and must not be saved.
  it('rejects a fragment of a stroke', () => {
    expect(cropFault(cellRegion(5), { x: 300, y: 300, side: 20 }))
      .toMatch(/under 30% of the 256px cell/);
  });

  it('rejects a crop just under a third of the cell', () => {
    expect(cropFault(cellRegion(5), { x: 300, y: 300, side: Math.floor(CW * 0.29) })).not.toBeNull();
  });

  it('accepts a doodle the model drew small but whole', () => {
    // 40% of the cell is a legitimately small drawing — 100px into a 192px
    // thumbnail is a mild upscale, not a magnified fragment.
    expect(cropFault(cellRegion(5), { x: 300, y: 300, side: Math.round(CW * 0.4) })).toBeNull();
  });

  it('accepts the sizes the real pipeline produces', () => {
    for (const frac of [0.5, 0.7, 0.9]) {
      const b = blankSheet();
      drawRules(b);
      fill(b, doodleIn(5, frac), INK);
      const { crop, region } = cropCell(b, 5);
      expect(cropFault(region, crop)).toBeNull();
    }
  });

  it('accepts the blank-cell fallback, which is 90% of the cell', () => {
    const b = blankSheet();
    drawRules(b);
    const { crop, region } = cropCell(b, 5);
    expect(cropFault(region, crop)).toBeNull();
  });
});
