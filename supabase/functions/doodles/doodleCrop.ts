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
 * The sheet's own white, so "not paper" means something on a page the model
 * drew a shade under pure white.
 *
 * 252 is right for a #FFFFFF page and useless on a #FAFAF8 one: measured off a
 * real sheet, the paper sat at 249-251 in every channel, so EVERY pixel on it
 * counted as ink, every scanline read as a rule, and the rule machinery went
 * blind — no grid could be detected and no neighbour's ink could be trimmed.
 * The prompt asks for pure white and mostly gets it; this is what makes the
 * geometry survive the times it doesn't.
 *
 * Measured as the MEDIAN of a sparse sample of the whole sheet. Most of a
 * doodle sheet is empty page by construction — the doodles are asked to fill
 * 70% of a cell and come in well under that — so the middle of the sample is
 * paper. The edges can't be used for this even though they are always blank:
 * when the model does frame the sheet, the frame is exactly what the border
 * ring reads, and the level comes back as the colour of a line.
 *
 * Never above the tuned 252 — a rule's fade runs through the high 240s, and
 * catching that fade is the whole point of the number.
 */
export function paperLevel(bitmap: Uint8ClampedArray, imgWidth: number, imgHeight: number): number {
  // Every 4th pixel each way: 1/16th of a 1024px sheet is 65k samples, enough
  // that the median can't move, cheap enough to run per sheet.
  const step = 4;
  const seen: number[] = [];
  for (let y = 0; y < imgHeight; y += step) {
    for (let x = 0; x < imgWidth; x += step) {
      const i = (y * imgWidth + x) * 4;
      if (bitmap[i + 3] < 128) continue; // transparent — no colour to read
      seen.push(Math.min(bitmap[i], bitmap[i + 1], bitmap[i + 2]));
    }
  }
  if (!seen.length) return PAPER_MIN_CHANNEL;
  seen.sort((a, b) => a - b);
  const median = seen[Math.floor(seen.length / 2)];
  // Two levels of headroom under the measured white: enough for the dithering
  // an image model leaves on a flat fill, far short of a drawn line.
  return Math.min(PAPER_MIN_CHANNEL, median - 2);
}

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
  paper: number = PAPER_MIN_CHANNEL,
): boolean {
  let ink = 0;
  const span = to - from;
  for (let v = from; v < to; v++) {
    const x = horizontal ? v : fixed;
    const y = horizontal ? fixed : v;
    const i = (y * imgWidth + x) * 4;
    if (bitmap[i + 3] < 128) continue;
    if (bitmap[i] >= paper && bitmap[i + 1] >= paper && bitmap[i + 2] >= paper) continue;
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
  paper: number,
): { start: number; end: number }[] {
  const bands: { start: number; end: number }[] = [];
  const count = horizontal ? imgHeight : imgWidth;
  const span = horizontal ? imgWidth : imgHeight;
  let start = -1;
  for (let i = 0; i < count; i++) {
    if (isRuleLine(bitmap, imgWidth, 0, span, i, horizontal, paper)) {
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

// Snapping the cut to the GUTTER the drawing actually left.
//
// With no rules drawn, the fallback is even division — and an even quarter is
// only right if the model centred every doodle. It does not: measured on a real
// sheet, the gutters in the bottom row sat at 270, 518 and 728 where the
// quarters are 256, 512 and 768, so the last cut fell 40px inside a seesaw and
// the thumbnail lost the end of it. The white space between two doodles is the
// boundary; the quarter is only a guess at where to find it.
const GUTTER_SEARCH = 0.25; // how far from the even boundary to look, as a fraction of the cell
const GUTTER_MIN = 0.02;    // and how wide a run of blank has to be to count as one

/** Blank runs in an ink profile — the gaps between drawings. */
function blankRuns(profile: number[], floor: number, minWidth: number): { start: number; end: number }[] {
  const runs: { start: number; end: number }[] = [];
  let start = -1;
  for (let i = 0; i <= profile.length; i++) {
    if (i < profile.length && profile[i] <= floor) {
      if (start < 0) start = i;
    } else if (start >= 0) {
      if (i - start >= minWidth) runs.push({ start, end: i - 1 });
      start = -1;
    }
  }
  return runs;
}

/**
 * The `n + 1` cut positions across `size`: even division, with each interior
 * cut moved onto a gutter when there is one close enough. A cut with no gutter
 * near it stays where it was — two doodles that run together have no boundary
 * to find, and guessing further afield would only cut a third one.
 *
 * The WIDEST gutter in range wins, not the nearest. Between two rows there are
 * now two gaps: the thin one between a doodle and its own word, and the broad
 * one between that word and the next row. The thin one is often closer to the
 * even boundary, and taking it would cut a cell off from its own label and hand
 * it to the row below — which is exactly the ink `withoutLabelBand` then
 * expects to find at the foot of the cell above.
 */
function snapBoundaries(profile: number[], size: number, n: number): number[] {
  const cell = size / n;
  // A stray antialiased pixel or two does not make a column non-blank.
  const floor = Math.max(1, Math.round(size * 0.002));
  const runs = blankRuns(profile, floor, Math.max(2, Math.round(cell * GUTTER_MIN)));
  const cuts = [0];
  for (let i = 1; i < n; i++) {
    const ideal = Math.round(i * cell);
    let best = ideal;
    let bestWidth = 0;
    for (const run of runs) {
      const mid = Math.round((run.start + run.end) / 2);
      const width = run.end - run.start + 1;
      // Never cross a neighbouring cut: a gutter that would collapse a cell is
      // the wrong gutter, however wide it looks.
      if (
        Math.abs(mid - ideal) < cell * GUTTER_SEARCH &&
        width > bestWidth &&
        mid > cuts[cuts.length - 1] + cell * 0.4 &&
        mid < ideal + cell * 0.6
      ) {
        best = mid;
        bestWidth = width;
      }
    }
    cuts.push(best);
  }
  cuts.push(size);
  return cuts;
}

// Counting the rows the model actually drew.
//
// Asked for 4x4 it sometimes draws 5x4 — seen live: twenty doodles, one word
// repeated twice, and every row after the first straddling a cut. Cutting a
// five-row sheet into four rows puts a neighbour's word inside a thumbnail, and
// no amount of measuring inside a cell can undo that, because the cell is in
// the wrong place. So the row count is checked before anything is cut.
//
// A picture row and a word row are told apart by height alone, and the two are
// nowhere near each other: measured on a real sheet the pictures ran 128-138px
// on a 1024px page and the words 20-26px.
const PICTURE_ROW_MIN = 0.06; // of the page height — anything shorter is a word
const ROW_MERGE_GAP = 0.01;   // bands closer than this are one row

/** How many rows of PICTURES the sheet holds, however many it was asked for. */
export function pictureRows(bitmap: Uint8ClampedArray, imgWidth: number, imgHeight: number): number {
  const profile = inkProfile(bitmap, imgWidth, { x: 0, y: 0, w: imgWidth, h: imgHeight }, true, INK_MAX_CHANNEL);
  const floor = Math.max(1, Math.round(imgWidth * 0.002));
  const bands = inkBands(profile, floor);
  const merge = Math.round(imgHeight * ROW_MERGE_GAP);
  const blocks: { start: number; end: number }[] = [];
  for (const band of bands) {
    const last = blocks[blocks.length - 1];
    if (last && band.start - last.end <= merge) last.end = band.end;
    else blocks.push({ ...band });
  }
  return blocks.filter((b) => b.end - b.start + 1 >= imgHeight * PICTURE_ROW_MIN).length;
}

/** True when the sheet holds a different number of picture rows than it was
 *  asked for. A sheet with NO rows at all doesn't count as wrong: there is
 *  nothing there to contradict the layout, and an empty cell is rejected on its
 *  own merits further down. */
function isRowCountWrong(
  bitmap: Uint8ClampedArray,
  imgWidth: number,
  imgHeight: number,
  rows: number,
): boolean {
  const drawn = pictureRows(bitmap, imgWidth, imgHeight);
  return drawn > 0 && drawn !== rows;
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
 *   'ungridded' — no rules anywhere, which is what the prompt asks for. The
 *                 cells are then read off the white space between the doodles:
 *                 even division to start, each interior cut moved onto the
 *                 nearest gutter (see `snapBoundaries`).
 *   'mismatch'  — the sheet isn't the layout that was asked for: rules that
 *                 aren't that grid (3 columns where 4 were wanted, a merged
 *                 pair, an omitted line), or no rules and the wrong number of
 *                 picture rows (a 5x4 drawn for a 4x4 — see `pictureRows`).
 *                 Every cut is then in the wrong place: each cell straddles a
 *                 real boundary, so a thumbnail comes out as a piece of one
 *                 stroke magnified, or with a neighbour's word in it. Nothing
 *                 cut from such a sheet is worth keeping.
 */
export function cellRegions(
  bitmap: Uint8ClampedArray,
  imgWidth: number,
  imgHeight: number,
  cols: number,
  rows: number,
  paper: number = paperLevel(bitmap, imgWidth, imgHeight),
): { regions: Region[]; grid: 'detected' | 'ungridded' | 'mismatch' } {
  const xs = spansBetween(ruleBands(bitmap, imgWidth, imgHeight, false, paper), imgWidth, cols);
  const ys = spansBetween(ruleBands(bitmap, imgWidth, imgHeight, true, paper), imgHeight, rows);
  const detected = xs.length === cols && ys.length === rows;
  // One span each way is a blank sheet as far as rules go: the scan found
  // nothing to divide on, not a grid of the wrong shape. A lineless sheet has
  // to be counted instead — a 5x4 drawn for a 4x4 has no rules to give it away
  // and cuts into sixteen wrong cells without complaint.
  const grid = detected
    ? 'detected'
    : xs.length <= 1 && ys.length <= 1
      ? (isRowCountWrong(bitmap, imgWidth, imgHeight, rows) ? 'mismatch' : 'ungridded')
      : 'mismatch';
  const regions: Region[] = [];
  if (detected) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        regions.push({ x: xs[c].from, y: ys[r].from, w: xs[c].to - xs[c].from + 1, h: ys[r].to - ys[r].from + 1 });
      }
    }
    return { regions, grid };
  }
  // Nothing drawn between the doodles, so the cut goes on the white space they
  // left. Rows first, across the whole sheet; then the columns of each row on
  // its own, because a gutter is only clear where the two doodles beside it
  // are — one row's neighbours can run wide where another's leave a gap.
  const wholeSheet = { x: 0, y: 0, w: imgWidth, h: imgHeight };
  const rowCuts = snapBoundaries(inkProfile(bitmap, imgWidth, wholeSheet, true, INK_MAX_CHANNEL), imgHeight, rows);
  for (let r = 0; r < rows; r++) {
    const y = rowCuts[r];
    const h = rowCuts[r + 1] - y;
    const band = { x: 0, y, w: imgWidth, h };
    const colCuts = snapBoundaries(inkProfile(bitmap, imgWidth, band, false, INK_MAX_CHANNEL), imgWidth, cols);
    for (let c = 0; c < cols; c++) {
      regions.push({ x: colCuts[c], y, w: colCuts[c + 1] - colCuts[c], h });
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
  paper: number,
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
      if (bitmap[i] >= paper && bitmap[i + 1] >= paper && bitmap[i + 2] >= paper) continue;
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
  paper: number = paperLevel(bitmap, imgWidth, imgHeight),
): Region {
  const maxRule = Math.max(4, Math.floor(Math.min(region.w, region.h) * 0.08));
  // Rules are judged across the WHOLE sheet, not just this cell. That is what
  // separates a rule from a doodle that happens to be wide and thin — a long
  // stroke for a rope or a horizon fills its own cell edge to edge, but stops
  // there, while a rule carries on across every cell in the row.
  const isRuleCol: boolean[] = [];
  for (let i = 0; i < region.w; i++) {
    isRuleCol.push(isRuleLine(bitmap, imgWidth, 0, imgHeight, region.x + i, false, paper));
  }
  const isRuleRow: boolean[] = [];
  for (let i = 0; i < region.h; i++) {
    isRuleRow.push(isRuleLine(bitmap, imgWidth, 0, imgWidth, region.y + i, true, paper));
  }
  const cols = inkProfile(bitmap, imgWidth, region, false, paper);
  const rows = inkProfile(bitmap, imgWidth, region, true, paper);
  const xs = bestSegment(cols, thinBands(isRuleCol, maxRule));
  const ys = bestSegment(rows, thinBands(isRuleRow, maxRule));
  return {
    x: region.x + xs.from,
    y: region.y + ys.from,
    w: xs.to - xs.from + 1,
    h: ys.to - ys.from + 1,
  };
}

// The word band at the foot of every cell.
//
// The prompt no longer fights the model's habit of lettering its doodles — it
// asks for the word, in one fixed place: the doodle in the top of the cell, the
// word small and centered underneath. Every attempt to ban lettering instead
// ended somewhere between 3 and 16 cells out of 16 with text on them (the table
// in sheet.ts has the runs). A caption whose position we chose is one the crop
// can find; a caption we forbade is a fight we lose at a rate we don't control.
//
// It buys something else too: the word under each doodle is what makes a sheet
// reviewable at a glance — a picture in the wrong cell is obvious when the
// wrong word is under it.
export const LABEL_BAND = 0.2;

// The cut is made on the GAP between picture and word, not at a fixed fraction
// of the cell. Asking for the word in the bottom fifth gets the word in roughly
// the bottom fifth OF THE DRAWN CONTENT, which is not the same thing: on a real
// sheet the model left 40px of blank page under the last row, the content sat
// that much higher, and a cut at 80% of the cell went straight through the
// word. The layout the prompt asks for is picture, gap, word — so the widest
// gap low in the cell is the boundary, wherever the block happens to sit.
const LABEL_MIN_GAP = 2;       // px of clear paper; a split needs at least this
const LABEL_ZONE = 0.45;       // the cut must be below this much of the cell
const LABEL_MAX_INK = 0.35;    // and the word never holds this much of the cell's ink

/** Horizontal runs of ink in a region: the picture, and the word under it.
 *  `floor` keeps them apart on a real sheet — the paper an image model produces
 *  is not flat, so a few pixels per row sit under the page white all the way
 *  down the cell. */
function inkBands(rows: number[], floor: number): { start: number; end: number }[] {
  const bands: { start: number; end: number }[] = [];
  let start = -1;
  for (let i = 0; i <= rows.length; i++) {
    if (i < rows.length && rows[i] > floor) {
      if (start < 0) start = i;
    } else if (start >= 0) {
      bands.push({ start, end: i - 1 });
      start = -1;
    }
  }
  return bands;
}

/**
 * The cell without the word written under it — where the picture is.
 *
 * Everything below the widest low gap comes off, which takes a word split into
 * two runs by its own descenders with it. A cell with nothing under its picture
 * comes back unchanged: no gap qualifies, so nothing is cut.
 */
export function withoutLabelBand(
  bitmap: Uint8ClampedArray,
  imgWidth: number,
  region: Region,
): Region {
  const rows = inkProfile(bitmap, imgWidth, region, true, INK_MAX_CHANNEL);
  // 1% of the cell's width: under a word's stroke count, over a stray
  // antialiased pixel or two.
  const bands = inkBands(rows, Math.max(1, Math.round(region.w * 0.01)));
  if (bands.length < 2) return region;
  const total = rows.reduce((a, b) => a + b, 0);
  let cutAfter = -1;
  let widest = LABEL_MIN_GAP - 1;
  for (let i = 1; i < bands.length; i++) {
    const gap = bands[i].start - bands[i - 1].end - 1;
    if (gap <= widest) continue;
    if (bands[i - 1].end < region.h * LABEL_ZONE) continue;
    let below = 0;
    for (let r = bands[i].start; r < rows.length; r++) below += rows[r];
    if (total > 0 && below > total * LABEL_MAX_INK) continue;
    widest = gap;
    cutAfter = bands[i - 1].end;
  }
  return cutAfter < 0 ? region : { ...region, h: cutAfter + 1 };
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
  paper: number = paperLevel(bitmap, imgWidth, imgHeight),
): { x: number; y: number; side: number; wordTop: number } {
  // Strip the drawn rules by FINDING them rather than assuming where they are.
  // A fixed guard band only works if the model puts its lines exactly on the
  // quarter boundaries; when they sit a few pixels off, or it frames the whole
  // sheet, a line survives inside the band, gets measured as ink, and the crop
  // maxes out with a border around a too-small doodle.
  // Cut to the clear stretch holding this cell's drawing: no rules inside, and
  // nothing from beyond one. This subsumes trimming rules off the edges.
  const cleared = clearRegion(bitmap, imgWidth, imgHeight, region, paper);
  // Then take off the word band at its foot: that text is ink like any other
  // to the measurement below, and left in it drags the square down off the
  // doodle and shrinks it to fit the pair.
  const inner = withoutLabelBand(bitmap, imgWidth, cleared);
  // Where the word starts. The square is allowed to reach past it — see below —
  // and the caller wipes whatever falls beyond, so the line has to come back.
  const wordTop = inner.y + inner.h;
  const box = inkBounds(bitmap, imgWidth, inner.x, inner.y, inner.w, inner.h);
  if (!box) {
    // Blank cell (or a doodle too faint to measure) — fall back to the middle.
    const side = Math.floor(Math.min(inner.w, inner.h) * 0.9);
    return {
      x: inner.x + Math.floor((inner.w - side) / 2),
      y: inner.y + Math.floor((inner.h - side) / 2),
      side,
      wordTop,
    };
  }
  // The square is measured against the WHOLE cell, not the picture area above
  // the word. Reserving a fifth of the cell for the word caps a square at the
  // remaining height, and the model draws doodles wider than that — measured on
  // a real sheet, bunk beds and a bookcase both came out ~90% of the cell wide
  // and lost their ends. So a wide doodle is allowed to take the height it
  // needs, reaching down past the word if it must; anything below `wordTop` is
  // wiped to paper afterwards, so the word cannot come with it.
  const maxSide = Math.min(cleared.w, cleared.h);
  // Square it around the drawing's centre, with a little air so strokes don't
  // touch the thumbnail's edge.
  const boxW = box.maxX - box.minX + 1;
  const boxH = box.maxY - box.minY + 1;
  const side = Math.min(maxSide, Math.round(Math.max(boxW, boxH) * 1.12));
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;
  const x = Math.max(cleared.x, Math.min(Math.round(cx - side / 2), cleared.x + cleared.w - side));
  const y = Math.max(cleared.y, Math.min(Math.round(cy - side / 2), cleared.y + cleared.h - side));
  return { x, y, side, wordTop };
}
