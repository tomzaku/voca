// Cutting a generated doodle sheet into thumbnails, tested against synthetic
// sheets. Every case here is one the real pipeline got wrong at some point:
// doodles clipped by a fixed-inset crop, and grid rules surviving into the
// thumbnail as a border. The two failures look opposite but have one cause —
// where the model actually puts its lines and how big it draws, neither of
// which is knowable in advance. So the crop has to measure the sheet, and
// these tests are how we know it does.

import { describe, expect, it } from 'vitest';
import { cellRegions, fitCrop, inkBounds, stripRules, type Region } from './doodleCrop.ts';

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

/** A doodle of `frac` of the cell, centred unless nudged. */
function doodleIn(i: number, frac: number, nudge = { x: 0, y: 0 }): Rect {
  const reg = cellRegion(i);
  const s = Math.round(CW * frac);
  return { x: reg.x + Math.round((CW - s) / 2) + nudge.x, y: reg.y + Math.round((CH - s) / 2) + nudge.y, w: s, h: s };
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

/** How much of the thumbnail the drawing takes up. */
const fillRatio = (crop: { side: number }, doodle: Rect) =>
  Math.max(doodle.w, doodle.h) / crop.side;

/** The real pipeline for one cell: locate the grid, then fit the crop. */
function cropCell(b: Uint8ClampedArray, i: number, cols = COLS, rows = ROWS) {
  const region = cellRegions(b, W, H, cols, rows)[i];
  return { crop: fitCrop(b, W, region), region };
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

describe('stripRules', () => {
  it('trims thin rules off every edge', () => {
    const b = blankSheet();
    drawRules(b, { thickness: 2 });
    const inner = stripRules(b, W, cellRegion(5));
    expect(inner.x).toBeGreaterThan(cellRegion(5).x);
    expect(inner.w).toBeLessThan(CW);
  });

  it('trims thick rules a fixed guard band would have missed', () => {
    const b = blankSheet();
    const rules = drawRules(b, { thickness: 12 });
    const region = cellRegion(5);
    const inner = stripRules(b, W, region);
    const innerRect = { x: inner.x, y: inner.y, w: inner.w, h: inner.h };
    for (const rule of rules) expect(overlaps(innerRect, rule)).toBe(false);
  });

  it('trims a leftover sliver of rule at the region edge', () => {
    // Locating the grid leaves at most a pixel or two of rule when the line
    // fades out; the stripper is the second line of defence for that.
    const b = blankSheet();
    const region = cellRegion(5);
    const sliver = { x: region.x, y: region.y, w: 3, h: region.h };
    fill(b, sliver, RULE_DARK);
    const inner = stripRules(b, W, region);
    expect(overlaps({ x: inner.x, y: inner.y, w: inner.w, h: inner.h }, sliver)).toBe(false);
  });

  it('leaves a clean cell alone', () => {
    const b = blankSheet();
    const region = cellRegion(5);
    const inner = stripRules(b, W, region);
    expect(inner).toEqual(region);
  });

  it('does not eat a wide doodle sitting in the middle of the cell', () => {
    const b = blankSheet();
    drawRules(b);
    // A "cable"-ish doodle: one long stroke spanning most of the cell.
    const stroke = { x: cellRegion(5).x + 20, y: cellRegion(5).y + 120, w: CW - 40, h: 14 };
    fill(b, stroke, INK);
    const inner = stripRules(b, W, cellRegion(5));
    expect(inner.y).toBeLessThan(stroke.y);
    expect(inner.y + inner.h).toBeGreaterThan(stroke.y + stroke.h);
  });
});

describe('cellRegions', () => {
  it('reads the cells off the drawn rules', () => {
    const b = blankSheet();
    drawRules(b, { thickness: 2 });
    const regions = cellRegions(b, W, H, COLS, ROWS);
    expect(regions).toHaveLength(16);
    // Each region sits between rules, so it starts just after one.
    expect(regions[0].x).toBeGreaterThanOrEqual(2);
    expect(regions[5].x).toBeGreaterThan(CW);
  });

  it('follows a grid the model drew off the exact boundary', () => {
    const b = blankSheet();
    const rules = drawRules(b, { thickness: 3, offset: 14 });
    const regions = cellRegions(b, W, H, COLS, ROWS);
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
    const regions = cellRegions(b, W, H, COLS, ROWS);
    expect(regions[0].w).toBeCloseTo(196, -1);
    expect(regions[1].w).toBeCloseTo(296, -1);
    for (const region of regions) {
      const rect = { x: region.x, y: region.y, w: region.w, h: region.h };
      for (const rule of rules) expect(overlaps(rect, rule)).toBe(false);
    }
  });

  it('falls back to even division when no grid was drawn', () => {
    const regions = cellRegions(blankSheet(), W, H, COLS, ROWS);
    expect(regions[0]).toEqual({ x: 0, y: 0, w: CW, h: CH });
    expect(regions[5]).toEqual({ x: CW, y: CH, w: CW, h: CH });
  });

  it('treats an ungridded single doodle as one whole cell', () => {
    const b = blankSheet();
    fill(b, { x: 380, y: 400, w: 260, h: 240 }, INK);
    expect(cellRegions(b, W, H, 1, 1)).toEqual([{ x: 0, y: 0, w: W, h: H }]);
  });

  it('is not fooled by a doodle stroke spanning its whole cell', () => {
    const b = blankSheet();
    drawRules(b);
    // A full-width stroke inside cell 5 reads as a rule; the sliver cells it
    // would carve out are too thin to be real and must be discarded.
    fill(b, { x: CW + 4, y: CH + 130, w: CW - 8, h: 10 }, INK);
    const regions = cellRegions(b, W, H, COLS, ROWS);
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

  it('centres a doodle the model pushed into a corner', () => {
    const b = blankSheet();
    const rules = drawRules(b);
    const doodle = doodleIn(5, 0.6, { x: 50, y: 44 });
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
    const doodle = { x: reg.x + 26, y: reg.y + 90, w: Math.round(CW * 0.8), h: Math.round(CH * 0.3) };
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
    expectGoodCrop(fitCrop(b, W, cellRegion(0)), cellRegion(0), [...rules, ...frame], doodle);
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
    const crop = fitCrop(b, W, whole);
    expectGoodCrop(crop, whole, [], doodle);
    expect(fillRatio(crop, doodle)).toBeGreaterThan(0.8);
  });
});
