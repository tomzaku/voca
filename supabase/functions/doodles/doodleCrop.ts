// Geometry for cutting a generated doodle SHEET into per-word thumbnails.
//
// Kept apart from the edge function (and free of any Deno API) so it can be
// unit tested with the rest of the app — see doodleCrop.test.ts. Everything
// here works straight off an RGBA bitmap: 0-based, 4 bytes per pixel,
// row-major, exactly what imagescript's `Image.bitmap` gives us.

export interface Region { x: number; y: number; w: number; h: number }

// Paper (and the sheet's "thin light gray" rules) are bright in every channel;
// doodle ink is either dark or a saturated accent colour, so one channel below
// this always gives it away. Keep it high enough that JPEG-ish noise on white
// doesn't register as ink.
const INK_MAX_CHANNEL = 205;

// Finding the RULES is a different question from finding the drawing, and it
// needs a much lower bar. A drawn rule is not a crisp 2px line: it has a dark
// core that fades out through several near-white pixels, and that fade is what
// reaches the thumbnail as a hairline border. Measured off a real sheet, the
// fade ran 140, 210, 232, 246, 251 before hitting paper — so a threshold of
// 245 left two visible pixels behind on every edge.
//
// Set just under pure white: near enough that nothing perceptible survives,
// and safe against stray light pixels because a rule is only ever recognised
// as a FULL edge-to-edge run, which noise does not produce.
const PAPER_MIN_CHANNEL = 252;

/**
 * Bounding box of the ink inside a region, or null if the region is blank.
 * Works straight off the RGBA bitmap — 0-based, 4 bytes per pixel.
 */
export function inkBounds(
  bitmap: Uint8ClampedArray,
  imgWidth: number,
  x0: number,
  y0: number,
  w: number,
  h: number,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = x0 + w, minY = y0 + h, maxX = x0 - 1, maxY = y0 - 1;
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const i = (y * imgWidth + x) * 4;
      if (bitmap[i + 3] < 128) continue; // transparent — not ink
      if (bitmap[i] > INK_MAX_CHANNEL && bitmap[i + 1] > INK_MAX_CHANNEL && bitmap[i + 2] > INK_MAX_CHANNEL) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  return maxX < minX || maxY < minY ? null : { minX, minY, maxX, maxY };
}

/** True if this row (or column) of the region reads as a ruled line: ink
 *  running edge to edge. A doodle's strokes never span the full width of the
 *  cell that solidly — the prompt keeps it to ~70% with white all around. */
export function isRuleLine(
  bitmap: Uint8ClampedArray,
  imgWidth: number,
  from: number,
  to: number,
  fixed: number,
  horizontal: boolean,
): boolean {
  let ink = 0;
  const span = to - from;
  for (let v = from; v < to; v++) {
    const x = horizontal ? v : fixed;
    const y = horizontal ? fixed : v;
    const i = (y * imgWidth + x) * 4;
    if (bitmap[i + 3] < 128) continue;
    if (bitmap[i] >= PAPER_MIN_CHANNEL && bitmap[i + 1] >= PAPER_MIN_CHANNEL && bitmap[i + 2] >= PAPER_MIN_CHANNEL) continue;
    ink++;
  }
  return ink > span * 0.8;
}

/** Runs of consecutive rule lines along one axis — the sheet's drawn grid,
 *  wherever the model actually put it. */
function ruleBands(
  bitmap: Uint8ClampedArray,
  imgWidth: number,
  imgHeight: number,
  horizontal: boolean,
): { start: number; end: number }[] {
  const bands: { start: number; end: number }[] = [];
  const count = horizontal ? imgHeight : imgWidth;
  const span = horizontal ? imgWidth : imgHeight;
  let start = -1;
  for (let i = 0; i < count; i++) {
    if (isRuleLine(bitmap, imgWidth, 0, span, i, horizontal)) {
      if (start < 0) start = i;
    } else if (start >= 0) {
      bands.push({ start, end: i - 1 });
      start = -1;
    }
  }
  if (start >= 0) bands.push({ start, end: count - 1 });
  return bands;
}

/** The clear spans between the rules, i.e. the cells. Slivers are dropped: a
 *  doodle stroke running the full width of its cell can read as a rule and
 *  would otherwise split one cell into two useless offcuts. */
function spansBetween(
  bands: { start: number; end: number }[],
  size: number,
  expected: number,
): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  let pos = 0;
  for (const b of bands) {
    if (b.start > pos) out.push({ from: pos, to: b.start - 1 });
    pos = b.end + 1;
  }
  if (pos < size) out.push({ from: pos, to: size - 1 });
  const minWidth = (size / expected) * 0.4;
  return out.filter((s) => s.to - s.from + 1 >= minWidth);
}

/**
 * Where each cell of the sheet actually is.
 *
 * Dividing the canvas evenly is only right if the model drew its grid exactly
 * on the quarter lines. When the whole grid sits a few pixels over, or the
 * cells came out slightly uneven, even division cuts across the rules — which
 * is how a thumbnail ends up with a border down one side and its neighbour's
 * ink in the corner. So the rules are located first and the cells read off the
 * gaps between them.
 *
 * `grid` says how much to trust the result, which the caller needs because a
 * thumbnail is stored forever and the sheet it was cut from is not:
 *
 *   'detected'  — the sheet holds the cols x rows grid it was asked for and the
 *                 regions were read off the drawn rules.
 *   'ungridded' — no rules anywhere. The regions are even division: still a
 *                 sound guess, since with nothing drawn between the doodles
 *                 there is no line for a crop to cut into.
 *   'mismatch'  — rules were found, but not that grid (3 columns where 4 were
 *                 asked for, a merged pair of cells, an omitted line). Even
 *                 division is then wrong for EVERY cell: each quarter straddles
 *                 a real boundary, `clearRegion` keeps whichever fragment holds
 *                 the most ink, and the thumbnail comes out as a piece of one
 *                 stroke magnified. Nothing cut from such a sheet is worth
 *                 keeping.
 */
export function cellRegions(
  bitmap: Uint8ClampedArray,
  imgWidth: number,
  imgHeight: number,
  cols: number,
  rows: number,
): { regions: Region[]; grid: 'detected' | 'ungridded' | 'mismatch' } {
  const xs = spansBetween(ruleBands(bitmap, imgWidth, imgHeight, false), imgWidth, cols);
  const ys = spansBetween(ruleBands(bitmap, imgWidth, imgHeight, true), imgHeight, rows);
  const cw = Math.floor(imgWidth / cols);
  const ch = Math.floor(imgHeight / rows);
  const detected = xs.length === cols && ys.length === rows;
  // One span each way is a blank sheet as far as rules go: the scan found
  // nothing to divide on, not a grid of the wrong shape.
  const grid = detected ? 'detected' : xs.length <= 1 && ys.length <= 1 ? 'ungridded' : 'mismatch';
  const regions: Region[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      regions.push(detected
        ? { x: xs[c].from, y: ys[r].from, w: xs[c].to - xs[c].from + 1, h: ys[r].to - ys[r].from + 1 }
        : { x: c * cw, y: r * ch, w: cw, h: ch });
    }
  }
  return { regions, grid };
}

// A crop this much smaller than its cell is not a doodle drawn small — it's a
// fragment. The model is asked for ~70% of the cell and the crop is fitted to
// the ink with 12% air, so anything under a third of the cell means the region
// collapsed onto a piece of one stroke. It's also the quality floor: a 192px
// thumbnail from a 70px crop is already a 2.7x upscale, and the visible result
// is a handful of enormous pixels.
const MIN_CROP_FRACTION = 0.3;

/**
 * Why this crop can't be used, or null if it's fine. The reason is for the
 * function logs — a rejected cell is simply not saved, and the word gets drawn
 * again on a later sheet.
 */
export function cropFault(
  region: Region,
  crop: { x: number; y: number; side: number },
): string | null {
  const cell = Math.min(region.w, region.h);
  if (crop.side < cell * MIN_CROP_FRACTION) {
    return `crop ${crop.side}px is under ${Math.round(MIN_CROP_FRACTION * 100)}% of the ${cell}px cell`;
  }
  return null;
}


/** Ink pixels per column (or per row) across a region. One pass, and both the
 *  rule test and the "which side has the drawing" test read off it. */
function inkProfile(
  bitmap: Uint8ClampedArray,
  imgWidth: number,
  region: Region,
  horizontal: boolean,
): number[] {
  const lines = horizontal ? region.h : region.w;
  const span = horizontal ? region.w : region.h;
  const profile = new Array<number>(lines).fill(0);
  for (let l = 0; l < lines; l++) {
    const fixed = (horizontal ? region.y : region.x) + l;
    let ink = 0;
    for (let s = 0; s < span; s++) {
      const v = (horizontal ? region.x : region.y) + s;
      const px = horizontal ? v : fixed;
      const py = horizontal ? fixed : v;
      const i = (py * imgWidth + px) * 4;
      if (bitmap[i + 3] < 128) continue;
      if (bitmap[i] >= PAPER_MIN_CHANNEL && bitmap[i + 1] >= PAPER_MIN_CHANNEL && bitmap[i + 2] >= PAPER_MIN_CHANNEL) continue;
      ink++;
    }
    profile[l] = ink;
  }
  return profile;
}

/** Runs of rule lines, thin enough to be a rule rather than the drawing.
 *  Thinness has to be judged on the WHOLE run, not the first row met — a
 *  doodle 80 rows deep is not a rule no matter what its first row looks like. */
function thinBands(isRule: boolean[], maxRule: number): { start: number; end: number }[] {
  const bands: { start: number; end: number }[] = [];
  let start = -1;
  for (let i = 0; i <= isRule.length; i++) {
    if (i < isRule.length && isRule[i]) {
      if (start < 0) start = i;
    } else if (start >= 0) {
      if (i - start <= maxRule) bands.push({ start, end: i - 1 });
      start = -1;
    }
  }
  return bands;
}

/** The stretch between rules holding the most ink — the drawing this cell is
 *  actually for, as opposed to a neighbour's bleeding in past a line. */
function bestSegment(profile: number[], bands: { start: number; end: number }[]): { from: number; to: number } {
  const segments: { from: number; to: number }[] = [];
  let pos = 0;
  for (const b of bands) {
    if (b.start > pos) segments.push({ from: pos, to: b.start - 1 });
    pos = b.end + 1;
  }
  if (pos < profile.length) segments.push({ from: pos, to: profile.length - 1 });
  if (segments.length === 0) return { from: 0, to: profile.length - 1 };
  let best = segments[0];
  let bestInk = -1;
  for (const s of segments) {
    let ink = 0;
    for (let i = s.from; i <= s.to; i++) ink += profile[i];
    if (ink > bestInk) { bestInk = ink; best = s; }
  }
  return best;
}

/**
 * Narrow a region to the stretch of clear space that holds its drawing: no
 * rule line may lie inside it, and no neighbour's ink beyond one.
 *
 * This is the backstop for the whole pipeline. Locating the grid can fail —
 * the model insets its table from the canvas, merges two cells, or omits a
 * line — and the region then falls back to an even quarter that straddles a
 * real boundary. The thumbnail comes out with a border and a slice of the next
 * doodle beyond it. Whatever went wrong upstream, a rule crossing the region
 * proves the region is too big, so the region is split on its rules and the
 * busiest piece kept.
 */
export function clearRegion(
  bitmap: Uint8ClampedArray,
  imgWidth: number,
  imgHeight: number,
  region: Region,
): Region {
  const maxRule = Math.max(4, Math.floor(Math.min(region.w, region.h) * 0.08));
  // Rules are judged across the WHOLE sheet, not just this cell. That is what
  // separates a rule from a doodle that happens to be wide and thin — a long
  // stroke for a rope or a horizon fills its own cell edge to edge, but stops
  // there, while a rule carries on across every cell in the row.
  const isRuleCol: boolean[] = [];
  for (let i = 0; i < region.w; i++) {
    isRuleCol.push(isRuleLine(bitmap, imgWidth, 0, imgHeight, region.x + i, false));
  }
  const isRuleRow: boolean[] = [];
  for (let i = 0; i < region.h; i++) {
    isRuleRow.push(isRuleLine(bitmap, imgWidth, 0, imgWidth, region.y + i, true));
  }
  const cols = inkProfile(bitmap, imgWidth, region, false);
  const rows = inkProfile(bitmap, imgWidth, region, true);
  const xs = bestSegment(cols, thinBands(isRuleCol, maxRule));
  const ys = bestSegment(rows, thinBands(isRuleRow, maxRule));
  return {
    x: region.x + xs.from,
    y: region.y + ys.from,
    w: xs.to - xs.from + 1,
    h: ys.to - ys.from + 1,
  };
}

/**
 * A one-line report on how a crop turned out, for the function logs. The part
 * that matters is `edges`: the darkest pixel along each side of the finished
 * thumbnail, clockwise from the left. All four near 255 means clean paper; a
 * low number means a rule (or a neighbour's ink) made it into the picture, and
 * the surrounding numbers say where to look. Paste a bad line into
 * doodleCrop.test.ts and it reconstructs as a test case.
 */
export function describeCrop(
  bitmap: Uint8ClampedArray,
  imgWidth: number,
  region: Region,
  crop: { x: number; y: number; side: number },
): string {
  const darkest = (from: number, to: number, fixed: number, horizontal: boolean): number => {
    let min = 255;
    for (let v = from; v < to; v++) {
      const px = horizontal ? v : fixed;
      const py = horizontal ? fixed : v;
      const i = (py * imgWidth + px) * 4;
      min = Math.min(min, bitmap[i], bitmap[i + 1], bitmap[i + 2]);
    }
    return min;
  };
  const { x, y, side } = crop;
  const edges = [
    darkest(y, y + side, x, false),
    darkest(x, x + side, y, true),
    darkest(y, y + side, x + side - 1, false),
    darkest(x, x + side, y + side - 1, true),
  ];
  const ink = inkBounds(bitmap, imgWidth, region.x, region.y, region.w, region.h);
  return `region=${region.x},${region.y},${region.w}x${region.h}` +
    ` ink=${ink ? `${ink.minX},${ink.minY}-${ink.maxX},${ink.maxY}` : 'none'}` +
    ` crop=${x},${y},${side} edges=${edges.join('/')}`;
}

/**
 * A square crop around whatever was actually drawn inside `region`, clamped so
 * it never leaves the region.
 *
 * A fixed inset can't win here: small enough to keep the whole doodle lets the
 * grid lines through, big enough to cut the lines clips any doodle the model
 * drew larger than its share of the cell (it is asked for 70%, and it does not
 * always listen). So the lines are skipped with a small inset, the drawing is
 * then measured, and the crop is fitted to it — the doodle ends up centered
 * and filling the thumbnail no matter where in the cell it landed or how big
 * the model drew it.
 */
export function fitCrop(
  bitmap: Uint8ClampedArray,
  imgWidth: number,
  imgHeight: number,
  region: Region,
): { x: number; y: number; side: number } {
  // Strip the drawn rules by FINDING them rather than assuming where they are.
  // A fixed guard band only works if the model puts its lines exactly on the
  // quarter boundaries; when they sit a few pixels off, or it frames the whole
  // sheet, a line survives inside the band, gets measured as ink, and the crop
  // maxes out with a border around a too-small doodle.
  // Cut to the clear stretch holding this cell's drawing: no rules inside, and
  // nothing from beyond one. This subsumes trimming rules off the edges.
  const inner = clearRegion(bitmap, imgWidth, imgHeight, region);
  const box = inkBounds(bitmap, imgWidth, inner.x, inner.y, inner.w, inner.h);
  if (!box) {
    // Blank cell (or a doodle too faint to measure) — fall back to the middle.
    const side = Math.floor(Math.min(inner.w, inner.h) * 0.9);
    return {
      x: inner.x + Math.floor((inner.w - side) / 2),
      y: inner.y + Math.floor((inner.h - side) / 2),
      side,
    };
  }
  const maxSide = Math.min(inner.w, inner.h);
  // Square it around the drawing's centre, with a little air so strokes don't
  // touch the thumbnail's edge.
  const boxW = box.maxX - box.minX + 1;
  const boxH = box.maxY - box.minY + 1;
  const side = Math.min(maxSide, Math.round(Math.max(boxW, boxH) * 1.12));
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  const x = Math.max(inner.x, Math.min(Math.round(cx - side / 2), inner.x + inner.w - side));
  const y = Math.max(inner.y, Math.min(Math.round(cy - side / 2), inner.y + inner.h - side));
  return { x, y, side };
}
