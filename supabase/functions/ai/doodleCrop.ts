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
 * gaps between them. If that doesn't yield the expected grid (no rules drawn,
 * or a doodle confusing the scan), it falls back to even division.
 */
export function cellRegions(
  bitmap: Uint8ClampedArray,
  imgWidth: number,
  imgHeight: number,
  cols: number,
  rows: number,
): Region[] {
  const xs = spansBetween(ruleBands(bitmap, imgWidth, imgHeight, false), imgWidth, cols);
  const ys = spansBetween(ruleBands(bitmap, imgWidth, imgHeight, true), imgHeight, rows);
  const cw = Math.floor(imgWidth / cols);
  const ch = Math.floor(imgHeight / rows);
  const detected = xs.length === cols && ys.length === rows;
  const out: Region[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push(detected
        ? { x: xs[c].from, y: ys[r].from, w: xs[c].to - xs[c].from + 1, h: ys[r].to - ys[r].from + 1 }
        : { x: c * cw, y: r * ch, w: cw, h: ch });
    }
  }
  return out;
}

/**
 * Shrink a cell inward past any ruled lines on its edges. Walks in from each
 * side while the edge reads as a line, so it copes with thick rules, rules a
 * few pixels off the expected boundary, and an outer frame around the whole
 * sheet. Capped at 15% per side: past that we are eating the drawing, and a
 * doodle that solid to its own edge is not one a wider crop would save.
 */
export function stripRules(
  bitmap: Uint8ClampedArray,
  imgWidth: number,
  region: Region,
): Region {
  const { x, y, w, h } = region;
  // How long a run of line-like rows/columns is still a rule. Past this it is
  // the drawing itself — a doodle filling its cell presents an edge that looks
  // exactly like a rule to a per-cell scan, and trimming it would eat the very
  // thing we are trying to keep. Rules are thin; drawings are not.
  const maxRule = Math.max(4, Math.floor(Math.min(region.w, region.h) * 0.08));

  /** Length of the line-like run starting at one edge, or 0 if it is too long
   *  to be a rule (i.e. it is the doodle). */
  const runFrom = (start: number, step: number, horizontal: boolean): number => {
    let run = 0;
    while (run <= maxRule) {
      const fixed = start + step * run;
      const isLine = horizontal
        ? isRuleLine(bitmap, imgWidth, x, x + w, fixed, true)
        : isRuleLine(bitmap, imgWidth, y, y + h, fixed, false);
      if (!isLine) return run;
      run++;
    }
    return 0; // ran past what a rule can be — leave the edge alone
  };

  const left = runFrom(x, 1, false);
  const right = runFrom(x + w - 1, -1, false);
  const top = runFrom(y, 1, true);
  const bottom = runFrom(y + h - 1, -1, true);
  return { x: x + left, y: y + top, w: w - left - right, h: h - top - bottom };
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
  region: Region,
): { x: number; y: number; side: number } {
  // Strip the drawn rules by FINDING them rather than assuming where they are.
  // A fixed guard band only works if the model puts its lines exactly on the
  // quarter boundaries; when they sit a few pixels off, or it frames the whole
  // sheet, a line survives inside the band, gets measured as ink, and the crop
  // maxes out with a border around a too-small doodle.
  const inner = stripRules(bitmap, imgWidth, region);
  const maxSide = Math.min(inner.w, inner.h);
  const box = inkBounds(bitmap, imgWidth, inner.x, inner.y, inner.w, inner.h);
  if (!box) {
    // Blank cell (or a doodle too faint to measure) — fall back to the middle.
    const side = Math.floor(maxSide * 0.9);
    return { x: inner.x + Math.floor((inner.w - side) / 2), y: inner.y + Math.floor((inner.h - side) / 2), side };
  }
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
