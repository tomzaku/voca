// Doodles — the little hand-drawn pictures that illustrate a word's meaning,
// on flash cards and on the Pro mind map.
//
// This is a CACHE with a generator behind it, not a text action, which is why
// it lives apart from the `ai` function: give it words, get back pictures.
// Anything already drawn comes from the shared `word_doodles` table and is
// free for every signed-in user — the image is drawn once, globally, and reused
// forever. Only DRAWING costs money, so it has to be asked for explicitly with
// `generate: true`, and that path is Pro-only.
//
// Requests:
//   POST { words: [{ word, definition? }], generate?: boolean }
//   ->   { images: { "<word as sent>": "data:image/png;base64,..." } }
// Words with no doodle are simply absent from the response.
//
// Missing words are drawn 16 to a SHEET and cropped apart: one generated image
// costs the same whatever it holds, so batching is what makes doodles
// affordable (~$0.0025/word instead of ~$0.04). Callers should send everything
// they might want soon, not just the word on screen — see BATCH_MAX.
//
// Configure via `supabase secrets set`:
//   GOOGLE_API_KEY        required — doodles always use Google's image API
//   MINDMAP_IMAGE_MODEL   optional model override (default gemini-2.5-flash-image)
//   AI_RATE_LIMIT (default 60), AI_RATE_WINDOW_SECONDS (default 60)
//
// Deploy: `supabase functions deploy doodles`

import {
  BadRequest,
  corsHeaders,
  jsonResponse,
  requireUser,
  serviceClient,
  underRateLimit,
} from '../_shared/ai.ts';
import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts';
import { cellRegions, describeCrop, fitCrop } from './doodleCrop.ts';
import { cellSubject } from './prompt.ts';

type Auth = NonNullable<Awaited<ReturnType<typeof requireUser>>>;

/** What the word cache can tell us about a word's meaning. `definition` is NOT
 *  NULL in the schema; `short_definition` is the nicer one-liner when present. */
interface DefRow {
  word: string;
  short_definition: string | null;
  definition: string | null;
}

/** True when the caller has unexpired Pro, else the message to send back. The
 *  user-scoped client can only see this user's own `pro_users` row (RLS), so a
 *  returned row is proof. A NULL expires_at is a lifetime grant. */
async function isProUser(auth: Auth): Promise<true | string> {
  const { data, error } = await auth.supabase
    .from('pro_users')
    .select('expires_at')
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (error) return 'Could not verify Pro status.';
  if (!data) return 'Drawing new doodles requires a Pro account.';
  if (data.expires_at && new Date(data.expires_at) <= new Date()) {
    return 'Your Pro access has expired.';
  }
  return true;
}

// ─── Image generation ───────────────────────────────────────────────
// Unlike every other action, `mindmap_doodle` returns an image, not text, so
// it bypasses the ACTIONS/callProvider path. It always uses Google's image
// API regardless of AI_PROVIDER — set GOOGLE_API_KEY for doodles to work.
//
// Default model is gemini-2.5-flash-image: doodles are generated as grid
// SHEETS that get cropped apart, and Gemini follows layout instructions far
// more faithfully than Imagen 4 Fast (which, tested, draws whole mini-tables
// with captions inside single cells — unusable crops). Gemini costs ~2x more
// per image (~$0.04 vs ~$0.02) but a 16-word sheet still lands ~$0.0025/word.
// No model offers outputs below 1024×1024 — "1K" is the floor.
// Override with MINDMAP_IMAGE_MODEL: an `imagen-*` id uses the :predict
// endpoint, anything else uses :generateContent.

const DOODLE_THUMB = 192; // px — the map shows doodles in a 126px box; 192 keeps them crisp on retina

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
async function generateImage(prompt: string): Promise<{ mime: string; b64: string }> {
  const apiKey = Deno.env.get('GOOGLE_API_KEY') ?? '';
  if (!apiKey) throw new Error('Doodles require a Google API key on the server.');
  const model = Deno.env.get('MINDMAP_IMAGE_MODEL') || 'gemini-2.5-flash-image';
  console.log(`[doodle] generateImage model=${model} promptChars=${prompt.length}`);
  const t0 = Date.now();
  try {
    const result = await generateImageInner(model, apiKey, prompt);
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

// "Sketchnote" is dropped from the style on purpose: sketchnotes are a
// lettering-heavy form, and naming it invites the model to write on the page.
const DOODLE_STYLE =
  'Style: quick felt-tip pen doodle, 2-3 flat accent colors, plain white background, thick clean lines, like a margin doodle in a study notebook. The drawing floats free on the white page — never inside a frame, border, circle, or colored panel.';

// Only ONE thing may never appear: the word the doodle illustrates. The flash
// card shows the picture while the learner is still guessing, so that word
// written anywhere hands them the answer. Everything else that reads as part
// of the scene — numerals on a clock, a "Zzz" over a sleeper, a sign in the
// background — is fine and often helps.
//
// Models reach for the label first when drawing an abstract idea, so the ban
// is spelled out by example and repeated last, where it carries most weight.
const NO_ANSWER_TEXT_RULE =
  `NEVER write the word a doodle illustrates. The learner sees this picture while trying to GUESS that word, so writing it anywhere gives the answer away. That covers every way it could appear:
- the word itself, at any size, anywhere in the cell
- any form of it: plural, past tense, -ing, comparative, or the root it comes from
- a translation of it into any language
- its initial used as a monogram, or the word spelled out on a sign, label, book cover, badge, or banner
- the word inside a speech bubble or thought bubble
- a caption naming the drawing, however small
Everything else is allowed and often helps the picture read: numbers and digits (a clock face, a calendar, dice), sound effects like "Zzz" or "POW", writing that belongs to the scene such as an unrelated shop sign, and wordless marks like arrows, a cross or tick, a heart, or motion lines. Only the illustrated word is off limits.`;

// ─── Doodle sheets ──────────────────────────────────────────────────
// Every generated image costs the same regardless of content, so we pack a
// grid of doodles into ONE 1024px image and crop it into cells — ~16x cheaper
// per word than one image per word. The prompt pins a strict row-major grid;
// the crop assumes the model respected it (it reliably does with explicit
// cell-by-cell numbering). A bad sheet just gets re-sketched by the user.
// 16 = 4x4 grid → 256px cells, still above the 192px thumbnail size.

const SHEET_MAX = 16;
// How many candidate words a caller may send. Only SHEET_MAX of them are ever
// drawn — the surplus exists so the words that already have doodles can be
// filtered out and the sheet still comes out full.
const BATCH_MAX = 40;

// The grid is ALWAYS 4x4 once there is more than one word, however few words
// there are. Sizing the grid to the word count sounds tidier but produces bad
// crops: on a roomy 2x2 the model draws big, loosely-placed doodles that spill
// well outside the 256px-equivalent cell the crop expects, so the thumbnail
// comes out clipped with a grid line running through it. A constant 4x4 is the
// layout the sheet prompt was tuned against and the one the model reproduces
// faithfully. Unused cells are left blank — they cost nothing, since the price
// is per image, not per doodle. (It must also stay SQUARE: a non-square grid
// on the square 1:1 canvas makes "equal square cells" impossible and the model
// improvises a layout the crop maths no longer matches.)
const SHEET_COLS = 4;

// One word is the exception: it gets a plain single doodle with no grid at all
// (see generateDoodleSheet), so there are no lines to crop away.
function sheetGrid(n: number): { cols: number; rows: number } {
  return n <= 1 ? { cols: 1, rows: 1 } : { cols: SHEET_COLS, rows: SHEET_COLS };
}

function generateDoodleSheet(items: { word: string; definition: string }[]): Promise<{ mime: string; b64: string }> {
  // A single word needs no grid — and drawing one would just put a box around
  // the doodle for the crop to trip over. The whole image IS the doodle.
  if (items.length === 1) {
    const it = items[0];
    return generateImage(`${DOODLE_CONTEXT}

Draw ONE doodle illustrating ${cellSubject(it.word, it.definition)}, centered on a plain white square with clear white margin all around it.

STRICT rules:
- NO grid, frame, border, box, circle, panel, or background shape of any kind — just the drawing, floating on plain white paper
- ${NO_ANSWER_TEXT_RULE}

${DOODLE_STYLE}

Last and most important: ${NO_ANSWER_TEXT_RULE}`);
  }

  const { cols, rows } = sheetGrid(items.length);
  // Address every cell to an explicit (row, column) — a bare numbered list
  // lets the model drift out of row-major order on bigger grids.
  //
  // Each cell is described by its MEANING, never by the word itself. Handing
  // the model a quoted word invites it to letter that word under the drawing,
  // and no wording of a "do not write it" rule reliably beats that pull; a
  // word it was never given is one it cannot caption with. The word is only
  // sent when we have no definition to send instead, and then the rule below
  // is the only thing standing in the way.
  const list = items
    .map((it, i) => {
      const r = Math.floor(i / cols) + 1;
      const c = (i % cols) + 1;
      return `Row ${r}, Column ${c}: ${cellSubject(it.word, it.definition)}`;
    })
    .join('\n');
  const prompt = `${DOODLE_CONTEXT}

This image is a production sheet: it will be cut apart into individual doodles by exact grid position, one per word. That is why the layout must be followed precisely — if a doodle drifts into a neighboring cell or lands in the wrong cell, the wrong picture ends up next to the wrong word on the map.

Draw a ${rows}x${cols} grid of equal-sized square cells covering the whole image, separated by thin light gray lines (like a worksheet table). Each cell contains exactly ONE small hand-drawn doodle — a single object or simple scene — centered in its cell, filling at most 70% of the cell so there is clear white margin between the doodle and the cell's gray border lines. A doodle must NEVER touch or cross a gray line.

STRICT rules for every cell:
- ONE doodle per cell — never a group of separate small drawings
- NO tables, frames, boxes, or smaller grids inside a cell
- NO border, outline, frame, circle, badge, or panel drawn AROUND the doodle — each doodle sits directly on the white page with nothing enclosing it. The only lines in the whole image are the thin gray grid and the doodles themselves.
- NO shading, backdrop, or filled background behind a doodle — the paper stays plain white right up to the doodle's own strokes
- ${NO_ANSWER_TEXT_RULE}

Cell assignments (rows numbered top to bottom, columns left to right):
${list}
${items.length < rows * cols ? `Leave the remaining ${rows * cols - items.length} cell(s) completely empty white.` : ''}

${DOODLE_STYLE}

Last and most important, applied to every cell separately — no cell may contain ITS OWN word, nor any of the other words listed above: ${NO_ANSWER_TEXT_RULE}`
  console.log('[sheet] prompt: ', prompt)
  return generateImage(prompt);
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
 */
async function cropDoodleSheet(b64: string, n: number, missingWords?: string[]): Promise<string[]> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const img = await Image.decode(bytes);
  const bitmap = img.bitmap;
  // n === 1 is drawn without a grid (sheetGrid gives 1x1), so the whole image
  // is the single cell — and fitting to the ink trims the wide white margin
  // that prompt asks for, keeping it the same size as sheet-cropped doodles.
  const { cols, rows } = sheetGrid(n);
  // Cells are located from the drawn rules, not assumed to be even quarters.
  const regions = cellRegions(bitmap, img.width, img.height, cols, rows);
  const out: string[] = [];
  const fitted: string[] = [];
  const maxSide = Math.floor(Math.min(img.width / cols, img.height / rows));
  for (let i = 0; i < n; i++) {
    const region = regions[i];
    const { x, y, side } = fitCrop(bitmap, img.width, img.height, region);
    // Per-cell diagnostics: `edges` (darkest pixel on each side of the
    // finished thumbnail) is the one to scan — four numbers near 255 mean the
    // crop came out on clean paper, anything low means a rule got in.
    fitted.push(`  #${i} ${missingWords?.[i] ?? ''} ${describeCrop(bitmap, img.width, region, { x, y, side })}`);
    const cell = img.clone().crop(x, y, side, side);
    cell.resize(DOODLE_THUMB, DOODLE_THUMB);
    out.push(`data:image/png;base64,${encodeBase64Png(await cell.encode())}`);
  }
  console.log(`[sheet] crop report (${img.width}x${img.height}, ${cols}x${rows} grid, cell~${maxSide}px):\n${fitted.join('\n')}`);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse(405, { error: 'Method not allowed' });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use doodles.' });

  if (!await underRateLimit(auth.supabase)) {
    return jsonResponse(429, { error: 'Too many requests — please slow down and try again shortly.' });
  }

  let payload: { params?: Record<string, unknown>; words?: unknown; generate?: unknown };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, { error: 'Invalid JSON body.' });
  }
  // Accept the params-wrapped shape too, so the older client keeps working
  // through a deploy.
  const p = (payload.params ?? payload) as Record<string, unknown>;

  let items: { word: string; definition: string }[];
  let generate: boolean;
  try {
    // Drawing is opt-IN: a caller that forgets the flag gets a free lookup,
    // never a bill.
    generate = p.generate === true;
    const raw = p.words;
    if (!Array.isArray(raw)) throw new BadRequest('"words" must be an array.');
    items = raw
      .slice(0, BATCH_MAX)
      .map((it) => ({
        word: typeof it?.word === 'string' ? it.word.trim().slice(0, 60) : '',
        definition: typeof it?.definition === 'string' ? it.definition.slice(0, 200) : '',
      }))
      .filter((it) => it.word);
    if (items.length === 0) throw new BadRequest('"words" needs at least 1 entry.');
  } catch (err) {
    if (err instanceof BadRequest) return jsonResponse(400, { error: err.message });
    return jsonResponse(400, { error: 'Invalid request parameters.' });
  }

  const svc = serviceClient();
  const images: Record<string, string> = {};
  console.log(`[doodles] request words=${items.length} generate=${generate} [${items.map((it) => it.word).join(', ')}] svc=${Boolean(svc)}`);

  // Serve already-cached doodles and only draw the rest.
  let missing = items;
  if (svc) {
    const keys = items.map((it) => it.word.toLowerCase());
    // Doodles live in their own table so one can be saved for a word whose
    // definition nobody has generated yet — see the word_doodles migration.
    const [doodleRes, defRes] = await Promise.all([
      svc.from('word_doodles').select('word, doodle').in('word', keys),
      svc.from('word_cache').select('word, short_definition, definition').in('word', keys),
    ]);
    if (doodleRes.error) console.error(`[sheet] doodle read error: ${doodleRes.error.message}`);
    if (defRes.error) console.error(`[sheet] definition read error: ${defRes.error.message}`);
    const cached = new Map<string, string>(
      ((doodleRes.data ?? []) as { word: string; doodle: string }[])
        .filter((r) => r.doodle)
        .map((r) => [r.word, r.doodle]),
    );
    // The meaning is what actually gets drawn — the word itself is never sent
    // to the image model, since a model handed a word letters it under the
    // picture and that is the answer the learner is guessing. Callers batching
    // words they haven't loaded yet (the flash card sends the ones coming up
    // next) send the word alone, so the meaning is filled in here.
    //
    // `short_definition` is the one written for this — simple English, one
    // line — but it is NULLABLE and only backfilled for some words (see
    // scripts/backfill-short-definitions.mjs). `definition` is NOT NULL, so
    // falling back to it means any word with a cache row has SOMETHING to draw
    // from, and only a word nobody has ever generated falls through to having
    // its name sent.
    const defs = new Map<string, string>();
    for (const r of (defRes.data ?? []) as DefRow[]) {
      const meaning = (r.definition || r.short_definition || '').trim().slice(0, 200);
      if (meaning) defs.set(r.word, meaning);
    }
    missing = [];
    for (const it of items) {
      const hit = cached.get(it.word.toLowerCase());
      if (hit) images[it.word] = hit;
      else missing.push(it.definition ? it : { ...it, definition: defs.get(it.word.toLowerCase()) ?? '' });
    }
    console.log(`[sheet] cache hits=${items.length - missing.length} missing=${missing.length}${missing.length ? ` [${missing.map((it) => it.word).join(', ')}]` : ''}`);
  }

  // Lookup-only is the DEFAULT: misses are simply absent from the response.
  // Drawing has to be asked for, so no caller spends money by accident — and
  // the map-open lookup (40 words) can never fall through into a sheet the
  // model cannot lay out (seen live: a 7x7/38-word grid).
  if (!generate) {
    console.log(`[doodles] lookup — ${Object.keys(images).length}/${items.length} hit`);
    return jsonResponse(200, { images });
  }

  // Only DRAWING is Pro. The lookup above is free for every signed-in user:
  // that image is already drawn and paid for, and handing it over costs one
  // indexed select.
  const pro = await isProUser(auth);
  if (pro !== true) return jsonResponse(403, { error: pro });

  // Belt and braces: generation never exceeds one SHEET_MAX grid, even if a
  // future caller slips a bigger list past the input slice. Overflow words
  // are simply absent from the response; the client re-offers them.
  if (missing.length > SHEET_MAX) {
    console.warn(`[sheet] clamping generation from ${missing.length} to ${SHEET_MAX} words`);
    missing = missing.slice(0, SHEET_MAX);
  }

  if (missing.length > 0) {
    try {
      const { b64 } = await generateDoodleSheet(missing);
      const t0 = Date.now();
      const cells = await cropDoodleSheet(b64, missing.length, missing.map((it) => it.word));
      console.log(`[sheet] cropped ${cells.length} cells ms=${Date.now() - t0} thumbChars=${cells.map((c) => c.length).join(',')}`);
      for (let i = 0; i < missing.length; i++) {
        images[missing[i].word] = cells[i];
        if (svc) {
          const wordKey = missing[i].word.toLowerCase();
          // Upsert, not update: the word may have no cache row of its own
          // yet, and an image we've paid for has to persist regardless.
          const { error: writeErr } = await svc
            .from('word_doodles')
            .upsert({ word: wordKey, doodle: cells[i] }, { onConflict: 'word' });
          if (writeErr) console.error(`[sheet] doodle write error word="${wordKey}": ${writeErr.message}`);
        }
      }
    } catch (err) {
      console.error(`[sheet] generation failed: ${(err as Error).message}`);
      // Cached hits (if any) still go back to the client alongside the error.
      if (Object.keys(images).length === 0) {
        return jsonResponse(502, { error: (err as Error).message || 'Image generation failed.' });
      }
    }
  }

  console.log(`[doodles] returning ${Object.keys(images).length}/${items.length} images`);
  return jsonResponse(200, { images });
});
