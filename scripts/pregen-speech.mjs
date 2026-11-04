#!/usr/bin/env node
// Record the word list with Kokoro on this machine and upload the clips to the
// audio bucket, so the cloud voice serves them from S3 instead of paying
// Google for each one. Runs entirely locally: Kokoro makes the audio here,
// ffmpeg encodes it, and only the finished MP3s leave.
//
// What gets recorded, per word in word_cache:
//   - the word itself;
//   - for a word with several meanings, the word once per pronunciation —
//     "live" as /lɪv/ and as /laɪv/ — fed to Kokoro as IPA, the way the
//     flash card asks for it; the plain-word clip uses the primary meaning's
//     IPA too, so "live" outside the card is the verb, not a guess;
//   - every example sentence, of the word and of its other meanings.
//
// Clips are named exactly as the app and the speech function name them —
// cleanMarkdown, splitIntoChunks and clipHashInput are imported from src/lib,
// not copied — and stored at <voice folder>/<sha256>.mp3. One differing
// character and the server would never find the clip.
//
// Resumable: the bucket is listed first and anything already there is
// skipped, so a re-run records only what's new (words added since).
//
// Requires: ffmpeg with libmp3lame, `aws login` for the voca profile, and
// .env for Supabase. The npm script sets AWS_PROFILE rather than exporting
// the session: exported credentials last minutes, and a full run is hours —
// the SDK refreshes a profile's session itself.
//
// Usage:
//   npm run speech:pregen -- --limit 100 --out /tmp/voca-listen   # a sample to listen to
//   npm run speech:pregen -- --dry-run                            # count, record nothing
//   npm run speech:pregen                                         # everything missing
//   npm run speech:pregen -- --voice am_michael                   # the male voice
//   npm run speech:pregen -- --workers 3                          # 3 models in parallel (default)
//   npm run speech:pregen -- --words live,use,tear                # just these words, now
//   npm run speech:pregen -- --shard 1/2                          # half the clips (another machine)
//
// One Kokoro model keeps about half of a 10-core Mac busy — short clips don't
// parallelise well inside ONNX — so --workers runs several, each in a worker
// thread with a share of the cores. They're threads of ONE process, not
// separate runs, on purpose: each process refreshes the `aws login` session
// on its own, and three of them racing on its cache file corrupted it.
// --shard splits the clips by hash across machines; shards never overlap.

import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import os from 'node:os';
import { Worker } from 'node:worker_threads';
import { cleanMarkdown } from '../src/lib/cleanMarkdown.ts';
import { bareIpa, clipHashInput, kokoroPhonemes, splitIntoChunks } from '../src/lib/speechChunks.ts';
import { KOKORO_MODEL_ID } from '../src/lib/ttsModel.ts';

const args = process.argv.slice(2);
const strArg = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const VOICE = strArg('--voice') || 'af_heart';
const FOLDER = `kokoro-${VOICE}`;
const LIMIT = Number(strArg('--limit')) || Infinity;
const ONLY = strArg('--words')?.split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);
const OUT = strArg('--out');
const DRY_RUN = args.includes('--dry-run');
const [SHARD, SHARDS] = (strArg('--shard') ?? '1/1').split('/').map(Number);
if (!(SHARDS >= 1 && SHARD >= 1 && SHARD <= SHARDS)) throw new Error('--shard must be i/n with 1 ≤ i ≤ n');
const WORKERS = Math.max(1, Number(strArg('--workers')) || 3);
const THREADS = Number(strArg('--threads')) || Math.max(1, Math.floor(os.availableParallelism() / WORKERS));
const BUCKET = process.env.AUDIO_S3_BUCKET || 'trile-voca-audio';
const REGION = process.env.AUDIO_S3_REGION || 'ap-southeast-2';
/** Mono at Kokoro's 24 kHz; 48 kb/s keeps speech clean at ~6 KB a second. */
const BITRATE = '48k';
const UPLOADS = 6;

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const db = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
const s3 = new S3Client({ region: REGION });

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
/** American voices read the en-US IPA, British (bf_/bm_) the en-GB — as the app picks. */
const LOCALE = /^b[fm]_/.test(VOICE) ? 'en-GB' : 'en-US';

// ─── What to record ────────────────────────────────────────────────

async function pageAll(table, columns, key) {
  const rows = [];
  let after = '';
  for (;;) {
    const { data, error } = await db.from(table).select(columns).gt(key, after).order(key).limit(1000);
    if (error) throw error;
    if (!data.length) return rows;
    rows.push(...data);
    after = data[data.length - 1][key];
  }
}

/** Every clip, deduplicated by name: { key, text, phonemes?, label }. */
async function manifest() {
  const all = await pageAll('word_cache', 'word, headword, phonetics, examples', 'word');
  const words = (ONLY ? all.filter((w) => ONLY.includes(w.word)) : all).slice(0, LIMIT);
  const keep = new Set(words.map((w) => w.word));
  const senses = new Map();
  for (const s of await pageAll('word_senses', 'word, rank, ipa_us, ipa_gb, examples', 'word')) {
    if (!keep.has(s.word)) continue;
    if (!senses.has(s.word)) senses.set(s.word, []);
    senses.get(s.word).push(s);
  }

  const clips = new Map();
  const add = (text, ipa, label) => {
    const key = `${FOLDER}/${sha256(clipHashInput(text, ipa))}.mp3`;
    if (!clips.has(key)) clips.set(key, { key, text, phonemes: ipa ? kokoroPhonemes(ipa) : undefined, label });
  };
  /** What speakText would send for this text — each chunk, after cleanMarkdown. */
  const chunks = (text) => {
    const clean = cleanMarkdown(text);
    return clean ? splitIntoChunks(clean) : [];
  };

  for (const w of words) {
    const head = w.headword || w.word;
    const others = senses.get(w.word) ?? [];
    const primaryIpa = w.phonetics?.[LOCALE] ? bareIpa(w.phonetics[LOCALE]) : undefined;
    const [wordChunk] = chunks(head);
    if (wordChunk) {
      // The plain clip: Kokoro's own reading, except for a word whose
      // spelling has several — then the primary meaning's sound.
      if (others.length && primaryIpa) clips.set(`${FOLDER}/${sha256(clipHashInput(wordChunk))}.mp3`,
        { key: `${FOLDER}/${sha256(clipHashInput(wordChunk))}.mp3`, text: wordChunk, phonemes: kokoroPhonemes(primaryIpa), label: `${head} (word)` });
      else add(wordChunk, undefined, `${head} (word)`);
      // One clip per reading, as the card asks for them by tab.
      if (others.length) {
        if (primaryIpa) add(wordChunk, primaryIpa, `${head} /${primaryIpa}/`);
        for (const s of others) {
          const ipa = s[LOCALE === 'en-GB' ? 'ipa_gb' : 'ipa_us'];
          if (ipa) add(wordChunk, bareIpa(ipa), `${head} /${bareIpa(ipa)}/`);
        }
      }
    }
    for (const ex of [...(w.examples ?? []), ...others.flatMap((s) => s.examples ?? [])]) {
      for (const c of chunks(ex)) add(c, undefined, `${head}: ${c}`);
    }
  }
  return { words: words.length, clips: [...clips.values()] };
}

async function existing() {
  const keys = new Set();
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: `${FOLDER}/`, ContinuationToken: token }));
    for (const o of res.Contents ?? []) keys.add(o.Key);
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

// ─── Record, encode, upload ────────────────────────────────────────

/** Kokoro's float samples → MP3 bytes, through ffmpeg. */
function toMp3(samples, rate) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-loglevel', 'error', '-f', 'f32le', '-ar', String(rate), '-ac', '1', '-i', 'pipe:0',
      '-codec:a', 'libmp3lame', '-b:a', BITRATE, '-f', 'mp3', 'pipe:1']);
    const out = [];
    ff.stdout.on('data', (d) => out.push(d));
    ff.on('error', reject);
    ff.on('close', (code) => (code === 0 ? resolve(Buffer.concat(out)) : reject(new Error(`ffmpeg exited ${code}`))));
    ff.stdin.end(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength));
  });
}

/** A Kokoro model in a worker thread: generate(clip) → { samples, rate }. */
function startModel() {
  const worker = new Worker(new URL('./pregen-speech-worker.mjs', import.meta.url), {
    workerData: { modelId: KOKORO_MODEL_ID, voice: VOICE, threads: THREADS },
  });
  const waiting = new Map();
  let ids = 0;
  return new Promise((resolve, reject) => {
    worker.on('error', (err) => {
      reject(err);
      for (const w of waiting.values()) w.reject(err);
      waiting.clear();
    });
    worker.on('message', (msg) => {
      if (msg.type === 'ready') {
        resolve({
          generate: (clip) => new Promise((res, rej) => {
            const id = ++ids;
            waiting.set(id, { resolve: res, reject: rej });
            worker.postMessage({ id, text: clip.text, phonemes: clip.phonemes });
          }),
          close: () => worker.terminate(),
        });
        return;
      }
      const w = waiting.get(msg.id);
      if (!w) return;
      waiting.delete(msg.id);
      if (msg.type === 'done') w.resolve({ samples: msg.samples, rate: msg.rate });
      else w.reject(new Error(msg.error));
    });
  });
}

async function main() {
  const { words, clips } = await manifest();
  const have = await existing();
  // A clip's shard is fixed by its name, so every run agrees on who owns it.
  const mine = (c) => SHARDS === 1 || parseInt(path.basename(c.key).slice(0, 8), 16) % SHARDS === SHARD - 1;
  const todo = clips.filter((c) => mine(c) && !have.has(c.key));
  const tag = SHARDS > 1 ? ` [shard ${SHARD}/${SHARDS}]` : '';
  console.log(`${words} words → ${clips.length} clips for ${FOLDER}; ${clips.length - clips.filter((c) => !have.has(c.key)).length} already uploaded, ${todo.length} to record${tag}.`);
  if (DRY_RUN || !todo.length) return;

  if (OUT) fs.mkdirSync(OUT, { recursive: true });
  console.log(`Loading ${WORKERS} Kokoro model(s), ${THREADS} threads each…`);
  const models = await Promise.all(Array.from({ length: WORKERS }, () => startModel()));

  const started = Date.now();
  const pending = new Set();
  const listened = [];
  let done = 0, failed = 0, bytes = 0, next = 0;

  // Encoding and upload overlap the next generation; cap what's in flight.
  const upload = async (clip, { samples, rate }) => {
    const mp3 = await toMp3(samples, rate);
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: clip.key,
      Body: mp3,
      ContentType: 'audio/mpeg',
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    if (OUT) {
      const file = path.basename(clip.key);
      fs.writeFileSync(path.join(OUT, file), mp3);
      listened.push({ file, label: clip.label });
    }
    bytes += mp3.length;
    done++;
    if (done % 50 === 0 || done === todo.length) {
      const rate = done / ((Date.now() - started) / 1000);
      const left = Math.round((todo.length - done) / rate / 60);
      console.log(`${done}/${todo.length}${tag}  ${(bytes / 1e6).toFixed(1)} MB  ~${left} min left`);
    }
  };

  // Each model pulls the next clip as soon as it's free.
  await Promise.all(models.map(async (m) => {
    while (next < todo.length) {
      const clip = todo[next++];
      let audio;
      try {
        audio = await m.generate(clip);
      } catch (err) {
        failed++;
        console.warn(`✗ ${clip.label}: ${err.message}`);
        continue;
      }
      const job = upload(clip, audio).catch((err) => { failed++; console.warn(`✗ ${clip.label}: ${err.message}`); });
      pending.add(job);
      job.finally(() => pending.delete(job));
      if (pending.size >= UPLOADS) await Promise.race(pending);
    }
  }));
  await Promise.all(pending);
  for (const m of models) await m.close();

  if (OUT) {
    const rows = listened
      .sort((a, b) => a.label.localeCompare(b.label))
      .map((c) => `<tr><td>${c.label.replace(/</g, '&lt;')}</td><td><audio controls preload="none" src="${c.file}"></audio></td></tr>`)
      .join('');
    fs.writeFileSync(path.join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Kokoro ${VOICE}</title><style>body{font:15px system-ui;padding:16px}td{padding:4px 8px;border-bottom:1px solid #ddd}audio{height:30px}</style><h2>Kokoro ${VOICE}: ${listened.length} clips</h2><table>${rows}</table>`);
    console.log(`Listen: ${path.join(OUT, 'index.html')}`);
  }
  console.log(`\n${done} uploaded (${(bytes / 1e6).toFixed(1)} MB), ${failed} failed, in ${Math.round((Date.now() - started) / 60000)} min.`);
}

await main();
