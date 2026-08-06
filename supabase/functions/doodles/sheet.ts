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
import { cellRegions, cropFault, describeCrop, fitCrop, paperLevel } from './doodleCrop.ts';
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

// ─── Doodle sheets ──────────────────────────────────────────────────
// Every generated image costs the same regardless of content, so we pack a
// grid of doodles into ONE 1024px image and crop it into cells — ~16x cheaper
// per word than one image per word. The prompt pins a strict row-major grid;
// the crop assumes the model respected it (it reliably does with explicit
// cell-by-cell numbering). A bad sheet just gets re-sketched by the user.
//
// The prompt is kept SHORT on purpose. It grew long one clause at a time —
// every failed sheet answered with another line spelling out what not to draw —
// and the long version obeyed less, not more: the anti-text stanza alone ran to
// four positions in the prompt and the model captioned every cell anyway. What
// survives is one line per rule, stated once.
//
// The grid is INVISIBLE: the prompt asks for placement on an imaginary 4x4, not
// for a drawn table. Asked for ruled cells the model kept enclosing each doodle
// — first as a boxed card, then as a bordered table cell — and that enclosing
// line is inside the cell, so `fitCrop` keeps it and every thumbnail comes out
// as a doodle in a box. With nothing drawn between the doodles there is no line
// to cut into, so `cellRegions` reports 'ungridded' and even division is the
// expected path: equal cells filling the canvas is exactly what it assumes.
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
  // lets the model drift out of row-major order. Short keys, because the list
  // is the one part of the prompt that repeats 16 times.
  const list = items
    .map((it, i) => `R${Math.floor(i / cols) + 1}C${(i % cols) + 1}: ${cellSubject(it.word, it.definition)}`)
    .join('\n');
  const prompt = `${rows * cols} small hand-drawn doodles on a pure white square page, laid out in ${rows} rows of ${cols}. No text and no lines: pictures only.

Each doodle is a memory hook for an English learner — one bold, instantly recognizable idea, still readable at 1cm.

- Imagine the page split into ${rows} equal rows and ${cols} equal columns filling it edge to edge. Center one doodle in each cell, about 60% of the cell's size, with white space all around it.
- Never draw the grid: no lines, boxes, frames, panels or borders anywhere, and nothing enclosing a doodle.
- Never write anything: no words, letters, captions or labels anywhere on the page.
- Background: pure white (#FFFFFF), no texture or tint.
- Style: quick felt-tip pen doodle, thick clean lines, 2-3 flat accent colors.

What to draw in each cell (R = row from the top, C = column from the left):
${list}`
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
 * Null for the whole sheet means the model drew rules across it after all, and
 * not on the grid it was placing to — every cut would then land on a
 * boundary that isn't where it looks, so nothing on it is worth keeping. See
 * `cellRegions`.
 */
export async function cropDoodleSheet(b64: string, words: string[]): Promise<(string | null)[] | null> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const img = await Image.decode(bytes);
  const bitmap = img.bitmap;
  const cols = SHEET_COLS;
  const rows = SHEET_COLS;
  // What counts as blank page on THIS sheet, measured once and used for every
  // cell: models hand back off-white pages, and a fixed "white" then reads the
  // whole sheet as ink (see `paperLevel`).
  const paper = paperLevel(bitmap, img.width, img.height);
  // Even quarters normally, but rules are looked for first: if the model drew
  // any, they are where the cells actually are (or proof the sheet is unusable).
  const { regions, grid } = cellRegions(bitmap, img.width, img.height, cols, rows, paper);
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
    // The normal case: the prompt asks for an invisible grid, so there are no
    // rules to find and nothing between the doodles for a crop to cut into.
    console.log(`[sheet] no rules drawn (as asked) — cutting on even ${cols}x${rows} division`);
  }
  const out: (string | null)[] = [];
  const fitted: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const region = regions[i];
    const { x, y, side } = fitCrop(bitmap, img.width, img.height, region, paper);
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
  console.log(`[sheet] crop report (${img.width}x${img.height}, ${cols}x${rows} grid, cell~${maxSide}px, paper>=${paper}):\n${fitted.join('\n')}`);
  return out;
}
