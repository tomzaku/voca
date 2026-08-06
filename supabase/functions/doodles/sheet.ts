// Drawing a doodle SHEET and cutting it back apart.
//
// Kept apart from the edge function (and free of any Deno API — the API key and
// model come in as arguments) so it can be driven from a plain Node script as
// well as from the function itself. Same reasoning as doodleCrop.ts, which this
// builds on: `scripts/backfill-doodles.mjs` draws sheets ahead of time for words
// nobody has met yet, and it has to draw them the SAME way the live path does.
// A second copy of the prompt or the crop maths would drift, and a mis-cropped
// thumbnail is stored forever and can never be re-cut.
//
// `imagescript` resolves in both runtimes: through the import map in
// supabase/functions/deno.json for Deno, and from node_modules for Node.

import { Image } from 'imagescript';
import { cellRegions, cropFault, describeCrop, fitCrop } from './doodleCrop.ts';
import { cellSubject } from './prompt.ts';

/** A cell's subject: the word, and the meaning that disambiguates what to draw. */
export interface SheetItem {
  word: string;
  definition: string;
}

/** Which image API to call. Read from Deno.env in the function, process.env in
 *  the script — this module takes no view on where they come from. */
export interface ImageConfig {
  apiKey: string;
  /** Defaults to DEFAULT_IMAGE_MODEL. */
  model?: string;
}

// ─── Image generation ───────────────────────────────────────────────
// Doodles always use Google's image API regardless of AI_PROVIDER.
//
// Default model is gemini-2.5-flash-image: doodles are generated as grid
// SHEETS that get cropped apart, and Gemini follows layout instructions far
// more faithfully than Imagen 4 Fast (which, tested, draws whole mini-tables
// with captions inside single cells — unusable crops). Gemini costs ~2x more
// per image (~$0.04 vs ~$0.02) but a 16-word sheet still lands ~$0.0025/word.
// No model offers outputs below 1024×1024 — "1K" is the floor.
// Override with MINDMAP_IMAGE_MODEL: an `imagen-*` id uses the :predict
// endpoint, anything else uses :generateContent.

export const DEFAULT_IMAGE_MODEL = 'gemini-2.5-flash-image';

export const DOODLE_THUMB = 192; // px — the map shows doodles in a 126px box; 192 keeps them crisp on retina

/** Throw a friendly error for a failed image API response. */
async function throwImageApiError(res: Response, model: string): Promise<never> {
  const body = await res.text().catch(() => '');
  // Free-tier keys have ZERO image-generation quota ("limit: 0") — surface
  // that as a plain sentence instead of Google's multi-line quota dump.
  if (res.status === 429 && /free_tier|limit:\s*0/.test(body)) {
    throw new Error(
      'The Google API key has no image-generation quota (free tier). Enable billing on its Google Cloud project to generate doodles.',
    );
  }
  let msg = '';
  try {
    msg = JSON.parse(body)?.error?.message || '';
  } catch { /* not JSON */ }
  throw new Error(`Image API error ${res.status} (model=${model})${msg ? `: ${msg}` : ''}`);
}

/** Call the configured image model with a prompt; returns the raw image. */
async function generateImage(prompt: string, cfg: ImageConfig): Promise<{ mime: string; b64: string }> {
  if (!cfg.apiKey) throw new Error('Doodles require a Google API key on the server.');
  const model = cfg.model || DEFAULT_IMAGE_MODEL;
  console.log(`[doodle] generateImage model=${model} promptChars=${prompt.length}`);
  const t0 = Date.now();
  try {
    const result = await generateImageInner(model, cfg.apiKey, prompt);
    console.log(`[doodle] generateImage ok model=${model} mime=${result.mime} b64Chars=${result.b64.length} ms=${Date.now() - t0}`);
    return result;
  } catch (err) {
    console.error(`[doodle] generateImage FAILED model=${model} ms=${Date.now() - t0}: ${(err as Error).message}`);
    throw err;
  }
}

async function generateImageInner(model: string, apiKey: string, prompt: string): Promise<{ mime: string; b64: string }> {
  const headers = { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey };

  // Imagen models use the :predict endpoint with a different payload shape.
  if (model.startsWith('imagen')) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: '1:1' },
        }),
      },
    );
    if (!res.ok) await throwImageApiError(res, model);
    const data = await res.json();
    const pred: { mimeType?: string; bytesBase64Encoded?: string } | undefined =
      data.predictions?.[0];
    if (!pred?.bytesBase64Encoded) throw new Error('The image model returned no image.');
    return { mime: pred.mimeType || 'image/png', b64: pred.bytesBase64Encoded };
  }

  // Gemini image models (e.g. gemini-2.5-flash-image) via :generateContent.
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    },
  );
  if (!res.ok) await throwImageApiError(res, model);
  const data = await res.json();
  const parts: { inlineData?: { mimeType?: string; data?: string } }[] =
    data.candidates?.[0]?.content?.parts ?? [];
  const inline = parts.find((p) => p.inlineData?.data)?.inlineData;
  if (!inline?.data) throw new Error('The image model returned no image.');
  return { mime: inline.mimeType || 'image/png', b64: inline.data };
}

// Purpose context shared by both doodle prompts. Telling the model WHY the
// image exists (a memory aid inside a vocabulary mind map, shown tiny next to
// the word) steers it toward the right choices — instantly readable icon-like
// sketches rather than detailed illustrations.
const DOODLE_CONTEXT =
  `Context: we are building a hand-drawn vocabulary MIND MAP for English learners. Each word on the map gets a tiny doodle next to it as a memory hook — a quick visual that makes the word's meaning click and stick. The doodles are displayed very small (about 1cm), so each one must be a single bold, instantly recognizable idea; fine detail would be lost.`;

const DOODLE_STYLE =
  'Style: quick felt-tip pen doodle, 2-3 flat accent colors, thick clean lines, loose and hand-drawn like a margin doodle. The page behind it is plain blank white — never graph paper, squared or ruled notebook paper, a colored wash, or any texture or tint. The drawing floats free on the white page — never inside a frame, border, circle, or colored panel, and never captioned or labelled.';

// ─── Doodle sheets ──────────────────────────────────────────────────
// Every generated image costs the same regardless of content, so we pack a
// grid of doodles into ONE 1024px image and crop it into cells — ~16x cheaper
// per word than one image per word. The prompt pins a strict row-major grid;
// the crop assumes the model respected it (it reliably does with explicit
// cell-by-cell numbering). A bad sheet just gets re-sketched by the user.
// 16 = 4x4 grid → 256px cells, still above the 192px thumbnail size.

// The grid is ALWAYS 4x4, and every one of its 16 cells is always filled —
// SHEET_MAX is a sheet's exact size, not a ceiling. A part-full sheet was the
// tidy-looking option and it does not work: asked for a 4x4 with most cells
// left empty, the model draws the doodles in whatever arrangement suits them
// instead, the crop's rule-detection finds no 4x4, it falls back to even
// quarters, and each thumbnail is cut across the wrong part of the sheet. The
// full grid is the layout the prompt was tuned against and the one the model
// reproduces faithfully, so it's the only one we ask for. (It must also stay
// SQUARE: a non-square grid on the square 1:1 canvas makes "equal square cells"
// impossible and the model improvises a layout the crop maths can't follow.)
//
// Where the 16th word comes from when the caller has fewer: `sheetFillers`.
export const SHEET_MAX = 16;
export const SHEET_COLS = 4;

/** The drawn sheet, and the prompt that drew it — `scripts/backfill-doodles.mjs`
 *  keeps the prompt next to the image so a bad sheet can be read against the
 *  words that asked for it. */
export interface Sheet {
  mime: string;
  b64: string;
  prompt: string;
}

export async function generateDoodleSheet(items: SheetItem[], cfg: ImageConfig): Promise<Sheet> {
  const cols = SHEET_COLS;
  const rows = SHEET_COLS;
  // Address every cell to an explicit (row, column) — a bare numbered list
  // lets the model drift out of row-major order on bigger grids.
  const list = items
    .map((it, i) => {
      const r = Math.floor(i / cols) + 1;
      const c = (i % cols) + 1;
      return `Row ${r}, Column ${c}: ${cellSubject(it.word, it.definition)}`;
    })
    .join('\n');
  const prompt = `${DOODLE_CONTEXT}

This image is a production sheet: it will be cut apart into individual doodles by exact grid position, one per word. That is why the layout must be followed precisely — if a doodle drifts into a neighboring cell or lands in the wrong cell, the wrong picture ends up next to the wrong word on the map.

Draw a ${rows}x${cols} grid of equal-sized square cells covering the whole image on plain blank white paper, separated by thin light gray lines (like a worksheet table). Each cell contains exactly ONE small hand-drawn doodle — a single object or simple scene — centered in its cell, filling at most 70% of the cell so there is clear white margin between the doodle and the cell's gray border lines. A doodle must NEVER touch or cross a gray line.

How to draw the grid — as LINES, not as boxes: exactly ${rows - 1} light gray hairlines running the full width of the image and ${cols - 1} light gray hairlines running its full height, and nothing else. Neighboring cells SHARE the single line between them. Do NOT draw a square, box, card, tile, panel, or rounded rectangle around a cell or around a doodle; do NOT leave a gap or gutter between separate boxes; do NOT double the lines; do NOT draw an outer border or frame around the edge of the image. Apart from those ${rows - 1 + cols - 1} hairlines and the doodle strokes themselves, every pixel of the page is white.

STRICT rules for every cell:
- ONE doodle per cell — never a group of separate small drawings
- NO tables, frames, boxes, or smaller grids inside a cell — a cell is bounded only by the shared grid lines, never by a second square drawn inside it
- NO border, outline, frame, circle, badge, or panel drawn AROUND the doodle — each doodle sits directly on the white page with nothing enclosing it. The only lines in the whole image are the thin gray grid and the doodles themselves.
- NO shading, backdrop, or filled background behind a doodle — the paper stays plain white right up to the doodle's own strokes
- NO text ANYWHERE in the image — no words, letters, captions, labels, titles, or numbers, not inside a cell, not above or below a doodle, not in the margins. Do not write the word the cell was assigned; the picture alone has to carry the meaning
- The paper is plain blank white — NOT graph paper, NOT squared or ruled notebook paper, no dots, no texture, no tint. The ONLY gray lines in the whole image are the ${rows}x${cols} grid lines described above: no smaller squares, no background pattern, no extra lines anywhere

Cell assignments (rows numbered top to bottom, columns left to right). Each word below says what that cell must depict — it is never to be written or lettered in the image:
${list}

${DOODLE_STYLE}

Last and most important, because every cell is cut out on its exact grid position: keep each doodle centered well inside its own cell, at most 70% of the cell's width and height, with clear white space between it and the gray lines. A doodle must never touch a gray line, cross into a neighboring cell, be drawn in a cell other than the one it was assigned, or sit inside a box, card, or panel of its own.`
  console.log('[sheet] prompt: ', prompt)
  return { ...await generateImage(prompt, cfg), prompt };
}

/** PNG bytes → base64, chunked so a big image can't blow the argument limit. */
function encodeBase64Png(png: Uint8Array): string {
  let s = '';
  const CHUNK = 0x8000;
  for (let j = 0; j < png.length; j += CHUNK) {
    s += String.fromCharCode(...png.subarray(j, j + CHUNK));
  }
  return btoa(s);
}

/**
 * Crop a generated sheet into per-word thumbnail data URIs (row-major). Each
 * cell is fitted to the drawing it contains rather than cut on fixed maths, so
 * every doodle lands centered and the same apparent size in its thumbnail
 * whether the model drew it small, large, or off to one side.
 *
 * Always SHEET_MAX cells, in the order the words were sent. A cell whose crop
 * can't be trusted comes back null rather than as a picture: it isn't sent to
 * the caller and isn't saved, and the word gets drawn again on a later sheet.
 * Null for the whole sheet means the model didn't draw the grid it was asked
 * for, so no cell on it can be located — see `cellRegions`.
 */
export async function cropDoodleSheet(b64: string, words: string[]): Promise<(string | null)[] | null> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const img = await Image.decode(bytes);
  const bitmap = img.bitmap;
  const cols = SHEET_COLS;
  const rows = SHEET_COLS;
  // Cells are located from the drawn rules, not assumed to be even quarters.
  const { regions, grid } = cellRegions(bitmap, img.width, img.height, cols, rows);
  const maxSide = Math.floor(Math.min(img.width / cols, img.height / rows));
  if (grid === 'mismatch') {
    // The model drew a grid, just not this one. Every cell would be cut on a
    // boundary that isn't there — the "20 magnified pixels" thumbnails.
    console.error(
      `[sheet] the ${img.width}x${img.height} sheet does not hold the ${cols}x${rows} grid it was asked for — discarding it rather than cutting ${words.length} cells on boundaries that aren't there`,
    );
    return null;
  }
  if (grid === 'ungridded') {
    // No rules at all: even division is a fair guess, because there are no
    // lines between the doodles for a crop to cut into. Worth knowing about
    // though — it means the prompt's grid instruction was ignored.
    console.warn(`[sheet] no rules found — falling back to even ${cols}x${rows} division`);
  }
  const out: (string | null)[] = [];
  const fitted: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const region = regions[i];
    const { x, y, side } = fitCrop(bitmap, img.width, img.height, region);
    const fault = cropFault(region, { x, y, side });
    // Per-cell diagnostics: `edges` (darkest pixel on each side of the
    // finished thumbnail) is the one to scan — four numbers near 255 mean the
    // crop came out on clean paper, anything low means a rule got in.
    fitted.push(
      `  #${i} ${words[i]} ${describeCrop(bitmap, img.width, region, { x, y, side })}` +
      (fault ? ` REJECTED (${fault})` : ''),
    );
    if (fault) {
      out.push(null);
      continue;
    }
    const cell = img.clone().crop(x, y, side, side);
    cell.resize(DOODLE_THUMB, DOODLE_THUMB);
    out.push(`data:image/png;base64,${encodeBase64Png(await cell.encode())}`);
  }
  console.log(`[sheet] crop report (${img.width}x${img.height}, ${cols}x${rows} grid, cell~${maxSide}px):\n${fitted.join('\n')}`);
  return out;
}
