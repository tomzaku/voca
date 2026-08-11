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
// A sheet is always drawn FULL: exactly 16 words, whatever the caller brought.
// A part-full grid is the thing the model won't lay out faithfully, and the
// crop is cut on the grid, so short sheets came back mis-cropped. Any shortfall
// is made up from cached words nobody has drawn yet (`sheetFillers`), and if
// even that can't reach 16, nothing is drawn at all.
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
// Drawing and cutting a sheet lives in sheet.ts, which takes no Deno API, so
// `scripts/backfill-doodles.mjs` can draw sheets ahead of time exactly the way
// this function draws them on demand.
import {
  cropDoodleSheet,
  generateDoodleSheet,
  SHEET_MAX,
  type SheetItem,
} from './sheet.ts';

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

// How many candidate words a caller may send. Only SHEET_MAX of them are ever
// drawn — the surplus exists so the words that already have doodles can be
// filtered out and the sheet still comes out full.
const BATCH_MAX = 40;

/**
 * Words to fill the rest of the sheet with: cached words nobody has drawn yet,
 * newest first, minus everything already on this sheet.
 *
 * Nothing here is wasted — every cell is a real word, saved to `word_doodles`
 * like the caller's own, so it's already illustrated (and free) when a learner
 * meets it. The image costs the same whatever it holds; the empty cells were
 * the waste, and the bad crops they caused were worse than that.
 */
async function sheetFillers(
  svc: SupabaseClient,
  want: number,
  skip: string[],
): Promise<SheetItem[]> {
  const { data, error } = await svc.rpc('words_needing_doodles', { want, skip });
  if (error) {
    // Most likely the migration hasn't been applied. Say so plainly: the
    // symptom otherwise is doodles quietly never being drawn again.
    console.error(
      `[sheet] filler lookup failed (is the words_needing_doodles migration applied?): ${error.message}`,
    );
    return [];
  }
  return ((data ?? []) as { word: string; definition: string | null }[])
    .map((r) => ({ word: r.word, definition: (r.definition ?? '').slice(0, 200) }));
}

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
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
    // The meaning is what disambiguates what to draw ("bank" the riverside vs
    // the building), so it is sent alongside the word. Callers batching words
    // they haven't loaded yet (the flash card sends the ones coming up next)
    // send the word alone, so the meaning is filled in here.
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

  // A sheet is drawn full or not at all — see SHEET_MAX. The caller's words go
  // first (they're the ones somebody is waiting on) and the rest of the grid is
  // topped up from the cache.
  let sheet = missing;
  if (missing.length > 0 && missing.length < SHEET_MAX && svc) {
    const fillers = await sheetFillers(
      svc,
      SHEET_MAX - missing.length,
      // Everything already spoken for: the words being drawn, and the ones the
      // caller sent that already had a doodle. A word drawn twice on one sheet
      // wastes a cell and gives the model two chances to confuse them.
      items.map((it) => it.word.toLowerCase()),
    );
    sheet = [...missing, ...fillers].slice(0, SHEET_MAX);
    console.log(`[sheet] topped up ${missing.length} + ${sheet.length - missing.length} filler(s)`);
  }

  if (missing.length > 0 && sheet.length < SHEET_MAX) {
    // Not enough undrawn words in the whole cache to fill a grid. Drawing a
    // part-full one would come back mis-cropped, which is worse than no
    // picture: the client just shows the card without one, and the word gets
    // another chance on a later sheet.
    console.warn(
      `[sheet] skipping generation — only ${sheet.length}/${SHEET_MAX} words to draw, and a part-full sheet crops wrong`,
    );
  } else if (missing.length > 0) {
    try {
      // sheet.ts reads no environment of its own — the key and model override
      // are this function's to supply (see the header's `supabase secrets set`).
      const { b64 } = await generateDoodleSheet(sheet, {
        apiKey: Deno.env.get('GOOGLE_API_KEY') ?? '',
        model: Deno.env.get('MINDMAP_IMAGE_MODEL') || undefined,
      });
      const t0 = Date.now();
      const cells = await cropDoodleSheet(b64, sheet.map((it) => it.word));
      // A sheet the crop can't read is dropped whole. Saving it would put a
      // mis-cut thumbnail in front of every learner who meets those words from
      // now on, and the stored cell can't be re-cut later — only the sheet
      // could be, and we don't keep it. A word with no picture costs nothing.
      if (!cells) {
        console.warn(`[sheet] discarded — ${sheet.length} words go back undrawn`);
      } else {
        const kept = cells.filter(Boolean).length;
        console.log(`[sheet] cropped ${kept}/${cells.length} cells ms=${Date.now() - t0} thumbChars=${cells.map((c) => c?.length ?? 0).join(',')}`);
        for (let i = 0; i < sheet.length; i++) {
          const cell = cells[i];
          if (!cell) continue; // rejected crop — not shown, not stored
          // Only the words that were asked for go back — a filler's thumbnail is
          // tens of KB the caller has no use for. It's saved below all the same,
          // which is the whole point of drawing it.
          if (i < missing.length) images[sheet[i].word] = cell;
          if (svc) {
            const wordKey = sheet[i].word.toLowerCase();
            // Upsert, not update: the word may have no cache row of its own
            // yet, and an image we've paid for has to persist regardless.
            //
            // Never verified: nobody has looked at this cell — it was drawn
            // while a user waited and goes straight on screen. That holds for a
            // redraw of an already-approved word too, which is why `verified` is
            // written every time rather than left alone: the approval belonged
            // to the picture that just got replaced.
            const { error: writeErr } = await svc
              .from('word_doodles')
              .upsert({ word: wordKey, doodle: cell, verified: false }, { onConflict: 'word' });
            if (writeErr) console.error(`[sheet] doodle write error word="${wordKey}": ${writeErr.message}`);
          }
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
}

if (import.meta.main) Deno.serve(handler);
