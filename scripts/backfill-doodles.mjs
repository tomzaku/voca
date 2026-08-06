#!/usr/bin/env node
// Draw doodles ahead of time for words in the shared cache that don't have one
// yet, so learners meet them already illustrated — and free, because a doodle
// is drawn once globally and reused by everyone forever.
//
// This does NOT reimplement generation: it imports the SAME sheet generator and
// crop the `doodles` edge function uses (supabase/functions/doodles/sheet.ts).
// A second copy of the tuned prompt or the crop geometry would drift, and a
// mis-cropped thumbnail is stored forever and can never be re-cut. sheet.ts is
// free of Deno APIs precisely so this script can drive it, and Node strips the
// .ts types on import (Node 22.18+).
//
// It talks to the database directly with the service role, so there's no HTTP
// call, no sign-in, no Pro gate and no rate limit — none of which mean anything
// for a maintenance script run from a laptop.
//
// Idempotent + resumable: `words_needing_doodles` only ever returns words with
// no `word_doodles` row, so a re-run picks up exactly what the last one didn't
// finish (including cells whose crop was rejected).
//
// COSTS MONEY — one generated image per sheet of 16 (~$0.04, ~$0.0025/word).
// The default 160-word batch is 10 sheets, ~$0.40. `--dry-run` spends nothing.
//
// Requires env (.env is read automatically):
//   VITE_SUPABASE_URL            https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    secret key — word_cache/word_doodles are RLS'd
//                                with no client policies at all
//   GOOGLE_API_KEY               image key, on a project with billing enabled
//                                (free-tier keys have zero image quota)
//   MINDMAP_IMAGE_MODEL          optional model override, same as the function
//
// NOTHING IS WRITTEN WITHOUT APPROVAL. Every sheet is drawn, cropped and
// written to `doodle-sheets/` (git-ignored) as the full image, the thumbnails
// cut from it, and the exact prompt that drew it — then you look at them and
// say y/n. A doodle in `word_doodles` is what every learner sees for that word
// from then on and can't be re-cut later, so a human decides by default.
// `--auto` writes without asking; `--no-write` never writes at all.
//
// What was approved is recorded: a sheet you say yes to is written with
// `word_doodles.verified` true. `--auto` writes the same doodles with verified
// false, as does the edge function drawing on demand — usable pictures nobody
// has looked at.
//
// Usage:
//   npm run doodles:backfill                    # 160 words, reviewed sheet by sheet
//   npm run doodles:backfill -- --dry-run       # list the words, draw nothing
//   npm run doodles:backfill -- --limit 16      # one sheet, to check the prompt
//   npm run doodles:backfill -- --no-write      # draw + keep images, never write
//   npm run doodles:backfill -- --auto          # write every good crop, no prompts
//   npm run doodles:backfill -- --auto --concurrency 2
//   npm run doodles:backfill -- --out /tmp/x    # where to keep the images
//   npm run doodles:backfill -- --no-out        # don't keep them
//
// Working on the prompt: `--limit 16 --no-write` draws one sheet, leaves the
// image and prompt.txt on disk, and cannot touch the database.

import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';
import {
  cropDoodleSheet,
  generateDoodleSheet,
  SHEET_MAX,
} from '../supabase/functions/doodles/sheet.ts';

try {
  process.loadEnvFile('.env');
} catch {
  // Fine if it's absent — the vars may already be exported.
}

const {
  VITE_SUPABASE_URL,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  GOOGLE_API_KEY,
  MINDMAP_IMAGE_MODEL,
} = process.env;

const url = (VITE_SUPABASE_URL || SUPABASE_URL || '').replace(/\/+$/, '');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const QUIET = !args.includes('--verbose');
const LIMIT = numArg('--limit') ?? 160;
// A doodle written to `word_doodles` is what every learner sees for that word
// from then on, and it can't be re-cut later — only redrawn, for money. So the
// default is that a human looks at the sheet first and says yes. `--auto` is
// the unattended mode: draw, crop, write, no questions.
const AUTO = args.includes('--auto');
// Draw and keep the images, never touch the database. For working on the
// prompt, where the whole point is to look at what comes back.
const NO_WRITE = args.includes('--no-write');
// Reviewing means one sheet at a time by definition — there's no sense drawing
// the next while someone is looking at this one, and parallel prompts would
// interleave on the same terminal.
const REVIEW = !AUTO && !NO_WRITE;
const CONCURRENCY = REVIEW ? 1 : (numArg('--concurrency') ?? 1);
// Every sheet is kept on disk. A rejected cell and a discarded sheet are both
// reported as numbers in the crop report, and numbers don't tell you that the
// model drew no grid, or drew captions, or ran two doodles together — only
// looking at the sheet does. It's one PNG per sheet, and the folder is
// git-ignored. `--no-out` if you don't want them.
const OUT_DIR = args.includes('--no-out') ? null : (strArg('--out') ?? 'doodle-sheets');

function strArg(flag) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; }
function numArg(flag) { const v = strArg(flag); return v ? parseInt(v, 10) : undefined; }

function fail(message, hint) {
  console.error(`\n✗ ${message}`);
  if (hint) console.error(`  ${hint}`);
  process.exit(1);
}

if (!url) fail('VITE_SUPABASE_URL is not set.', 'Add it to .env (see .env.example).');
if (!SUPABASE_SERVICE_ROLE_KEY) {
  fail(
    'SUPABASE_SERVICE_ROLE_KEY is not set.',
    'Supabase → Settings → API → service_role. The cache tables have RLS with no policies, so nothing else can read them.',
  );
}
if (!DRY_RUN && !GOOGLE_API_KEY) {
  fail(
    'GOOGLE_API_KEY is not set.',
    'Needed unless --dry-run. It must be on a Google Cloud project with billing — free-tier keys have zero image-generation quota.',
  );
}
if (!Number.isFinite(LIMIT) || LIMIT < 1) fail('--limit must be a positive number.');
if (!Number.isFinite(CONCURRENCY) || CONCURRENCY < 1) fail('--concurrency must be a positive number.');
if (REVIEW && !OUT_DIR) {
  fail(
    '--no-out leaves nothing to review.',
    'Approving a sheet means looking at it. Add --auto to write without review, or --no-write to draw without writing.',
  );
}

const svc = createClient(url, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// sheet.ts logs the whole 2KB prompt and a per-cell crop report for every
// sheet — invaluable when a sheet comes out wrong, far too much when ten of
// them go past. Keep it behind --verbose, but never swallow warnings or
// errors: a rejected crop is the thing you want to see.
if (QUIET) console.log = () => {};

/** The undrawn words, newest first — the same source the function tops sheets up from. */
async function pickWords(want) {
  const { data, error } = await svc.rpc('words_needing_doodles', { want, skip: [] });
  if (error) {
    fail(
      `Could not list undrawn words: ${error.message}`,
      'Is the words_needing_doodles migration applied? `npm run db:push`.',
    );
  }
  return (data ?? []).map((r) => ({ word: r.word, definition: (r.definition ?? '').slice(0, 200) }));
}

/** A word as a filename: "bite off more than you can chew" → "bite-off-more…". */
function slug(word) {
  return word.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

/**
 * Keep a sheet on disk: the whole generated image, plus every thumbnail that
 * survived the crop, so what the model actually drew can be looked at.
 * Rejected cells have no image by definition — the sheet shows why.
 */
async function saveSheetImages(n, b64, prompt, items, cells) {
  if (!OUT_DIR) return null;
  const pad = String(n).padStart(2, '0');
  const dir = join(OUT_DIR, `sheet-${pad}`);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'sheet.png'), Buffer.from(b64, 'base64'));
  // The exact prompt that drew this image, so a sheet can be read against what
  // was asked for — the point of a review run is usually the prompt itself.
  await writeFile(join(dir, 'prompt.txt'), prompt);
  for (let i = 0; i < items.length; i++) {
    const cell = cells?.[i];
    if (!cell) continue;
    const png = Buffer.from(cell.slice(cell.indexOf(',') + 1), 'base64');
    await writeFile(join(dir, `${String(i).padStart(2, '0')}-${slug(items[i].word)}.png`), png);
  }
  return dir;
}

/**
 * Draw one sheet, crop it, and keep the images — but write NOTHING. Whether
 * these cells reach the database is decided afterwards, by a human or by
 * `--auto`.
 *
 * `cells` is null when the crop couldn't read the sheet at all, and holds a
 * null per cell whose own crop couldn't be trusted.
 */
async function drawSheet(items, n) {
  const { b64, prompt } = await generateDoodleSheet(items, {
    apiKey: GOOGLE_API_KEY,
    model: MINDMAP_IMAGE_MODEL || undefined,
  });
  const cells = await cropDoodleSheet(b64, items.map((it) => it.word));
  const dir = await saveSheetImages(n, b64, prompt, items, cells);
  return { cells, dir };
}

/**
 * Write the approved cells. Returns [saved, failed] word lists.
 *
 * `verified` is the y/n that got us here: true only when a person looked at the
 * sheet and its cut cells and said yes. `--auto` writes the same doodles with
 * verified false — they're usable, nobody has checked them.
 */
async function saveCells(items, cells, verified) {
  const saved = [];
  const failed = [];
  for (let i = 0; i < items.length; i++) {
    const word = items[i].word;
    if (!cells[i]) continue; // rejected crop — never written
    // Upsert, not update: the word may have no cache row of its own yet, and
    // an image we've paid for has to persist regardless.
    const { error } = await svc
      .from('word_doodles')
      .upsert({ word: word.toLowerCase(), doodle: cells[i], verified }, { onConflict: 'word' });
    if (error) {
      failed.push(word);
      console.warn(`  ✗ write failed for "${word}": ${error.message}`);
      continue;
    }
    saved.push(word);
  }
  return [saved, failed];
}

// One shared reader: opening a second on the same stdin steals the first's
// input, and every prompt here is sequential anyway.
let rl = null;
function reader() {
  rl ??= createInterface({ input: process.stdin, output: process.stdout });
  return rl;
}

/**
 * Show the crop and ask whether it should go in the database. Anything but a
 * clear yes leaves the words undrawn, so they come back on the next run —
 * costing another sheet, which is the cheap side of the trade against a bad
 * doodle every learner sees from then on.
 */
async function approve(items, cells, dir) {
  const drawn = items.filter((_, i) => cells[i]).map((it) => it.word);
  const cut = items.filter((_, i) => !cells[i]).map((it) => it.word);
  console.warn(`\n  ${drawn.length}/${items.length} cells cropped cleanly.`);
  if (cut.length) console.warn(`  no usable crop: ${cut.join(', ')}`);
  console.warn(`  Look at ${resolve(dir ?? '.')}/`);
  console.warn('    sheet.png    what the model drew');
  console.warn('    NN-word.png  the thumbnail each word would get');
  if (!process.stdin.isTTY) {
    // Piped or backgrounded: there is nobody to ask, and defaulting to "yes"
    // would write unreviewed doodles under a flag that promised review.
    console.warn('  ✗ not a terminal, so nothing can be reviewed — skipping. Use --auto to write without review.');
    return false;
  }
  let answer;
  try {
    answer = await reader().question('  Write these to the database? [y/N] ');
  } catch {
    // Ctrl+D (or stdin closing under us) is not an answer, so it isn't a yes.
    console.warn('\n  no answer — nothing written');
    return false;
  }
  return ['y', 'yes'].includes(answer.trim().toLowerCase());
}

async function main() {
  const say = QUIET ? console.warn : console.log;
  say(`Looking for words with no doodle…${DRY_RUN ? ' (DRY RUN)' : ''}`);
  const pending = await pickWords(LIMIT);
  const sheets = [];
  for (let i = 0; i < pending.length; i += SHEET_MAX) sheets.push(pending.slice(i, i + SHEET_MAX));
  say(`${pending.length} word(s) to draw, in ${sheets.length} sheet(s) of ${SHEET_MAX}.`);
  if (!pending.length) return;

  if (DRY_RUN) {
    say(`\nWould draw (~$${(sheets.length * 0.04).toFixed(2)} of image generation):`);
    sheets.forEach((s, i) => say(`  sheet ${i + 1}: ${s.map((w) => w.word).join(', ')}`));
    const short = pending.length % SHEET_MAX;
    if (short) {
      say(
        `\nThe last sheet has only ${short}/${SHEET_MAX} words. A part-full grid is the one` +
        `\nthe model won't lay out faithfully, so it would crop wrong — pass a --limit` +
        `\nthat's a multiple of ${SHEET_MAX} to skip it.`,
      );
    }
    return;
  }

  if (NO_WRITE) {
    say('\nDrawing only — nothing will be written to the database (--no-write).');
  } else if (REVIEW) {
    say('\nEach sheet will be shown for approval before anything is written. --auto to skip that.');
  }

  let savedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const queue = sheets.map((items, n) => ({ items, n: n + 1 }));

  async function worker() {
    for (;;) {
      const job = queue.shift();
      if (!job) return;
      const { items, n } = job;
      const label = `sheet ${n}/${sheets.length}`;
      // A short sheet crops wrong for the same reason the function refuses to
      // draw one — the model doesn't lay out a part-full grid faithfully.
      if (items.length < SHEET_MAX) {
        skippedCount += items.length;
        console.warn(`- ${label}: skipped — only ${items.length}/${SHEET_MAX} words, and a part-full sheet crops wrong`);
        continue;
      }
      const t0 = Date.now();
      try {
        const { cells, dir } = await drawSheet(items, n);
        const secs = ((Date.now() - t0) / 1000).toFixed(0);
        // A sheet the crop can't read is dropped whole, exactly as the edge
        // function drops it: saving it would put a mis-cut thumbnail in front
        // of every learner who meets those words from now on, and the stored
        // cell can't be re-cut later. A word with no picture costs nothing.
        if (!cells) {
          skippedCount += items.length;
          console.warn(`✗ ${label}: sheet discarded — the model didn't draw the 4x4 grid (${secs}s)`);
          if (dir) console.warn(`  see ${dir}/sheet.png`);
          continue;
        }
        const usable = cells.filter(Boolean).length;
        console.warn(`· ${label}: ${usable}/${items.length} cells cropped in ${secs}s${dir ? ` → ${dir}/` : ''}`);

        if (NO_WRITE) {
          skippedCount += items.length;
          continue;
        }
        if (REVIEW && !await approve(items, cells, dir)) {
          skippedCount += items.length;
          console.warn(`  skipped — ${items.length} word(s) stay undrawn and come back next run`);
          continue;
        }
        // REVIEW is the only path that has a human's yes behind it — the
        // approve() above returned true. --auto skipped that, so its doodles go
        // in unverified and can be found later.
        const [saved, failed] = await saveCells(items, cells, REVIEW);
        savedCount += saved.length;
        // Everything not written comes back next run: rejected crops and any
        // write that errored.
        skippedCount += items.length - saved.length - failed.length;
        failedCount += failed.length;
        console.warn(`✓ ${label}: wrote ${saved.length}/${items.length}`);
      } catch (err) {
        failedCount += items.length;
        console.warn(`✗ ${label}: ${err.message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, sheets.length) }, worker));
  rl?.close();

  console.warn(
    `\nDone. Wrote ${savedCount} doodle(s)` +
    `, ${skippedCount} word(s) left undrawn` +
    (failedCount ? `, ${failedCount} failed` : '') + '.',
  );
  if (OUT_DIR) console.warn(`Sheets, thumbnails and prompts: ${resolve(OUT_DIR)}/`);
  if (skippedCount || failedCount) {
    console.warn('Re-run to retry the rest — only undrawn words are ever picked.');
    console.warn(`If a whole sheet was discarded, open its sheet.png: no gray grid ("no rules` +
      `\nfound") is the usual cause — the crop then has no boundaries to cut on and every` +
      `\ncell fits onto a fragment. prompt.txt next to it is exactly what was asked for.`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
