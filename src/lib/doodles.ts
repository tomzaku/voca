// Doodles: the small hand-drawn sketch of a word's meaning shown on flash
// cards and the Pro mind map. Fetched from the `doodles` edge function, which
// serves the shared cache and — only when asked — draws what is missing,
// 16 words to a SHEET. One generated image costs the same whatever it holds,
// so batching is what makes doodles affordable (~$0.0025/word, not ~$0.04).
//
// Doodles are cached per WORD, not per feature, in localStorage AND in the
// server's shared `word_doodles` table. So a word sketched on the mind map
// shows up instantly on its flash card, and vice versa — for every user, not
// just the one who paid for it. Nothing is ever drawn twice.

import { request } from './api';

export const DOODLE_SIZE = 192; // thumbnail px — crisp at the ~126px display box on retina
export const DOODLE_SHEET_SIZE = 16; // words per generated sheet — keep in sync with SHEET_MAX server-side
// Candidates worth offering per request — keep in sync with BATCH_MAX server-side.
// Only DOODLE_SHEET_SIZE of them get drawn; the surplus lets the server skip the
// ones that already have a doodle and still return a full sheet. Costs nothing.
export const DOODLE_BATCH_MAX = 40;

// v8: v7 cropped every cell on fixed arithmetic, which clipped any doodle the
// model drew larger than its share of the cell and let the sheet's grid lines
// through on the rest — so v7 thumbnails are abandoned, not migrated. (v3-v6
// were dropped before it for their own layout failures.) A bad crop can't be
// repaired locally: the server stores the cut-out cell, not the sheet, so the
// word has to be drawn again. v1/v2 were known-good single doodles and still
// migrate locally, no AI call.
const DOODLE_PREFIX = 'voca-doodle-v8:';
const DOODLE_PREFIXES_LEGACY = ['voca-doodle-v2:', 'voca-doodle-v1:'];

// Abandoned thumbnails are unreadable after a version bump but would sit in
// localStorage forever, eating the ~5MB quota the new ones need — a doodle is
// 10-20KB and there are thousands of words. Swept once per browser.
const DOODLE_PREFIXES_ABANDONED = ['voca-doodle-v7:'];
const SWEEP_FLAG = 'voca-doodle-swept-v8';

function purgeAbandonedDoodles(): void {
  try {
    if (localStorage.getItem(SWEEP_FLAG)) return;
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && DOODLE_PREFIXES_ABANDONED.some((p) => k.startsWith(p))) doomed.push(k);
    }
    // Collected first: removing while iterating shifts the indices.
    for (const k of doomed) localStorage.removeItem(k);
    localStorage.setItem(SWEEP_FLAG, '1');
  } catch { /* storage unavailable — nothing cached to sweep either */ }
}

purgeAbandonedDoodles();

export function doodleKey(word: string): string {
  return word.trim().toLowerCase();
}

/**
 * Turn the doodle's flat background transparent. The background color is
 * sampled from the image's own border ring rather than assumed to be pure
 * white — Gemini's "plain white background" is really off-white/cream, and
 * lossy WebP re-encoding of cached thumbs shifts it further. Alpha only ever
 * decreases, so re-running this on an already-keyed thumbnail is safe.
 */
function keyOutBackground(ctx: CanvasRenderingContext2D, size: number): void {
  const imgData = ctx.getImageData(0, 0, size, size);
  const px = imgData.data;

  // Background estimate: average the border-ring pixels that are still
  // opaque (skips already-transparent areas of re-processed thumbs) and
  // light (skips ink strokes crossing the edge).
  let r = 0, g = 0, b = 0, n = 0;
  const sample = (x: number, y: number) => {
    const i = (y * size + x) * 4;
    if (px[i + 3] < 200) return;
    if ((px[i] + px[i + 1] + px[i + 2]) / 3 < 128) return;
    r += px[i];
    g += px[i + 1];
    b += px[i + 2];
    n += 1;
  };
  for (let x = 0; x < size; x++) for (const y of [0, 1, size - 2, size - 1]) sample(x, y);
  for (let y = 2; y < size - 2; y++) for (const x of [0, 1, size - 2, size - 1]) sample(x, y);
  const bg = n > 0 ? [r / n, g / n, b / n] : [255, 255, 255];

  for (let i = 0; i < px.length; i += 4) {
    const dist = Math.max(
      Math.abs(px[i] - bg[0]),
      Math.abs(px[i + 1] - bg[1]),
      Math.abs(px[i + 2] - bg[2]),
    );
    // Within ~20 of the background (compression noise, paper texture) →
    // transparent; ramp up to fully opaque by 64 to avoid hard halos.
    const alpha = dist <= 20 ? 0 : dist >= 64 ? 255 : Math.round(((dist - 20) / 44) * 255);
    px[i + 3] = Math.min(px[i + 3], alpha);
  }
  ctx.putImageData(imgData, 0, 0);
}

/**
 * Downscale a (large) generated image to a small square thumbnail data URI
 * with its background keyed out, so the doodle floats on the page instead of
 * sitting in a pale box.
 */
export function shrinkDataUri(dataUri: string, size = DOODLE_SIZE): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUri);
        return;
      }
      ctx.drawImage(img, 0, 0, size, size);
      keyOutBackground(ctx, size);
      // toDataURL silently falls back to PNG where WebP isn't supported —
      // both formats keep the alpha channel.
      resolve(canvas.toDataURL('image/webp', 0.8));
    };
    img.onerror = () => reject(new Error('Could not decode doodle image.'));
    img.src = dataUri;
  });
}

/** The stored thumbnail for a word, or null. Key it with `doodleKey` first. */
export function readLocalDoodle(key: string): string | null {
  try {
    return localStorage.getItem(DOODLE_PREFIX + key);
  } catch {
    return null; // storage unavailable (private mode) — treat as a miss
  }
}

/** An older-format thumbnail, if one exists — re-key it locally rather than
 *  paying to regenerate. Callers pass the result through `shrinkDataUri`. */
export function readLegacyDoodle(key: string): string | null {
  try {
    return DOODLE_PREFIXES_LEGACY
      .map((p) => localStorage.getItem(p + key))
      .find((v): v is string => Boolean(v)) ?? null;
  } catch {
    return null;
  }
}

export function writeLocalDoodle(key: string, thumb: string): void {
  try {
    localStorage.setItem(DOODLE_PREFIX + key, thumb);
    for (const p of DOODLE_PREFIXES_LEGACY) localStorage.removeItem(p + key);
  } catch { /* storage full — the in-memory copy still renders */ }
}

/**
 * Ask the `doodles` function for a batch of words. Returns the raw images it
 * had (or drew), keyed by the word AS SENT.
 *
 * Looking up is free and is the default. `generate` is the paid path — it
 * draws the words with no doodle yet, up to one sheet, and needs Pro. Callers
 * should send everything they might want soon rather than just the word on
 * screen: the rest of the sheet costs nothing either way.
 */
export async function callDoodles(
  words: { word: string; definition?: string }[],
  opts: { generate?: boolean; signal?: AbortSignal } = {},
): Promise<Record<string, string>> {
  // Drawing a sheet is slow; looking one up is not. Either way the caller
  // decides how long to wait via `signal`.
  const { images } = await request.post<{ images: Record<string, string> }>(
    '/doodles',
    { words, generate: opts.generate === true },
    { signal: opts.signal, timeout: 120_000 },
  );
  return images ?? {};
}

/**
 * Doodles for a batch of words, shrunk to thumbnails and cached locally.
 * Returns `doodleKey(word)` → data URI; words with no doodle are absent.
 */
export async function fetchDoodles(
  items: { word: string; definition?: string }[],
  opts: { generate?: boolean; signal?: AbortSignal } = {},
): Promise<Record<string, string>> {
  const images = await callDoodles(items, opts);
  const out: Record<string, string> = {};
  for (const [word, dataUri] of Object.entries(images)) {
    const key = doodleKey(word);
    try {
      const thumb = await shrinkDataUri(dataUri);
      out[key] = thumb;
      writeLocalDoodle(key, thumb);
    } catch { /* undecodable image — skip it, the word stays doodle-less */ }
  }
  return out;
}
