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
// The audio engine is Kokoro on the Apple GPU through MLX — ~3.4x the CPU —
// once `npm run speech:setup-mlx` has made its Python environment; without it,
// ONNX on the CPU. Either way this process phonemizes, names, encodes and
// uploads; the engine only turns phonemes into samples.
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
//   npm run speech:pregen                                         # GPU (MLX) when set up, else CPU
//   npm run speech:pregen -- --engine onnx --workers 3            # CPU: 3 ONNX models in parallel
//   npm run speech:pregen -- --cpu-workers 2 --threads 4          # GPU + 2 CPU models, fastest
//   npm run speech:pregen:background                              # low priority: the Mac stays usable
//   npm run speech:status                                         # how many are uploaded / left
//
// Full speed (the GPU plus CPU models) takes the whole machine — the display
// shares that GPU — so it's for when nobody's using it. While someone is,
// :background runs it at macOS's background priority (taskpolicy -b):
// efficiency cores, last in line for the GPU and disk, slower but out of the
// way.
//   npm run speech:pregen -- --words live,use,tear                # just these words, now
//   npm run speech:pregen -- --shard 1/2                          # half the clips (another machine)
//
// One Kokoro model keeps about half of a 10-core Mac busy — short clips don't
// parallelise well inside ONNX — so --workers runs several, each a child
// process with a share of the cores (onnxruntime-node can't share one process
// between threads). The children only make audio; this process encodes and
// uploads everything, on purpose: each process refreshes the `aws login`
// session on its own, and three of them racing on its cache file corrupted it.
// --shard splits the clips by hash across machines; shards never overlap.
//
// --podcasts records the Listen podcasts instead (src/data/englishListening.ts),
// each episode as ONE file plus its timed transcript, so the player can stream
// a whole episode and still light up — and jump to — each sentence:
//   podcasts/<voice folder>/<sha256>.mp3    the episode, sentence after sentence
//   podcasts/<voice folder>/<sha256>.json   { duration, lines: [{ start, end, text }] }
// named by episodeHashInput (src/lib/speechChunks), so an edited script is a
// new recording. The JSON is uploaded last: it's what marks an episode done.
//   npm run speech:pregen:podcasts                                # every episode not yet recorded
//   npm run speech:pregen:podcasts -- --words pod-1,pod-2 --out /tmp/pods
//   npm run speech:status:podcasts
//
// --scripts records the app's fixed scripts instead of the word list: Daily
// Dialogue, IELTS Speaking and IELTS Listening, line by line, plus the
// comprehension clips, dictation sentences and phrase chips. Each line is
// recorded only in the voice that reads it on the cloud engine — speaker A and
// the examiner in the female slot (af_heart), speaker B and the candidate in
// the male one (am_michael) — so it takes a run per voice. Clips land beside
// the word clips, named the same way, so a line plays from the CDN instead of
// a ~1.3 s round trip to the speech function.
//   npm run speech:pregen:scripts                                 # af_heart's lines
//   npm run speech:pregen:scripts -- --voice am_michael           # am_michael's lines
//   npm run speech:status:scripts -- --voice am_michael

import { fork, spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import os from 'node:os';
import { KokoroTTS } from 'kokoro-js';
import { cleanMarkdown } from '../src/lib/cleanMarkdown.ts';
import { bareIpa, clipHashInput, episodeHashInput, kokoroPhonemes, splitIntoChunks, splitSentences } from '../src/lib/speechChunks.ts';
import { KOKORO_MODEL_ID } from '../src/lib/ttsModel.ts';

const args = process.argv.slice(2);
const strArg = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const VOICE = strArg('--voice') || 'af_heart';
const FOLDER = `kokoro-${VOICE}`;
const LIMIT = Number(strArg('--limit')) || Infinity;
const ONLY = strArg('--words')?.split(',').map((w) => w.trim().toLowerCase()).filter(Boolean);
const OUT = strArg('--out');
const DRY_RUN = args.includes('--dry-run');
const PODCASTS = args.includes('--podcasts');
const SCRIPTS = args.includes('--scripts');
const [SHARD, SHARDS] = (strArg('--shard') ?? '1/1').split('/').map(Number);
if (!(SHARDS >= 1 && SHARD >= 1 && SHARD <= SHARDS)) throw new Error('--shard must be i/n with 1 ≤ i ≤ n');
/** Where `npm run speech:setup-mlx` puts the GPU engine's Python. */
const MLX_PYTHON = path.join(os.homedir(), '.cache/voca-mlx/.venv/bin/python');
// MLX (the Apple GPU, ~3.4x the CPU) when it's set up, ONNX on the CPU otherwise.
const ENGINE = strArg('--engine') || (fs.existsSync(MLX_PYTHON) ? 'mlx' : 'onnx');
if (!['mlx', 'onnx'].includes(ENGINE)) throw new Error('--engine must be mlx or onnx');
// One GPU model keeps the GPU busy — a second only queues behind it (86 vs
// ~100 clips a minute) — while CPU models need several to fill the cores.
const WORKERS = Math.max(1, Number(strArg('--workers')) || (ENGINE === 'mlx' ? 1 : 3));
// CPU models alongside the GPU one, on cores the GPU run leaves idle: they
// pull from the same queue, so the two engines just add up. Both say the same
// phonemes with the same weights (bf16 vs fp32) and sound alike.
const CPU_WORKERS = ENGINE === 'mlx' ? Math.max(0, Number(strArg('--cpu-workers')) || 0) : 0;
const CPU_MODELS = ENGINE === 'mlx' ? CPU_WORKERS : WORKERS;
const THREADS = Number(strArg('--threads')) || Math.max(1, Math.floor(os.availableParallelism() / Math.max(1, CPU_MODELS)));
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
  return { source: `${words.length} words`, clips: [...clips.values()] };
}

/**
 * The cloud slot a script voice reads in — the rule cloudVoiceFor applies in
 * src/lib/tts.ts: a male Kokoro id (am_/bm_) is the male slot, anything else
 * the female one.
 */
const slotOf = (voice) => (voice === 'male' || /^[ab]m_/.test(voice ?? '') ? 'male' : 'female');

/** Every script line this run's voice reads: { key, text, label }. */
async function scriptManifest() {
  const { dialogues } = await import('../src/data/englishDialogues.ts');
  const { ieltsConversations } = await import('../src/data/englishIelts.ts');
  const { comprehensionClips, dictationSentences, ieltsListeningSections } = await import('../src/data/englishListening.ts');
  // assignVoices from src/lib/listeningRules, which Node can't import (its
  // own imports have no extension): speakers take the pool's voices in order.
  const assignVoices = (speakers, pool) => {
    const voice = {};
    for (const sp of speakers) if (!(sp in voice)) voice[sp] = pool[Object.keys(voice).length % pool.length];
    return voice;
  };
  // Not imported from src/lib/tts — that module needs a browser. The voices
  // each screen gives its speakers: DailyDialogueTab, IeltsSpeakingTab,
  // EnglishListeningPage (RECORDING_VOICES).
  const A = 'af_sarah', B = 'am_michael';
  const IELTS = { examiner: 'bf_emma', candidate: 'am_michael' };
  const RECORDING_VOICES = [A, B, 'bf_emma', 'bm_george'];

  /** [text, voice, label] for every line any script reads aloud. */
  const lines = [];
  const keep = (id) => !ONLY || ONLY.includes(id);
  for (const d of dialogues.filter((d) => keep(d.id))) {
    for (const l of d.lines) lines.push([l.text, l.speaker === 'a' ? A : B, d.id]);
    for (const p of d.usefulPhrases ?? []) lines.push([p, A, `${d.id} phrase`]);
  }
  for (const c of ieltsConversations.filter((c) => keep(c.id))) {
    for (const e of c.exchanges) lines.push([e.text, IELTS[e.role], c.id]);
    for (const p of c.keyPhrases ?? []) lines.push([p, IELTS.candidate, `${c.id} phrase`]);
  }
  for (const s of ieltsListeningSections.filter((s) => keep(s.id))) {
    const voice = assignVoices(s.transcript.map((t) => t.speaker), RECORDING_VOICES);
    for (const t of s.transcript) lines.push([t.text, voice[t.speaker], s.id]);
  }
  for (const c of comprehensionClips.filter((c) => keep(c.id))) lines.push([c.script, undefined, c.id]);
  for (const d of dictationSentences.filter((d) => keep(d.id))) lines.push([d.text, undefined, d.id]);

  const slot = slotOf(VOICE);
  const clips = new Map();
  let read = 0;
  for (const [text, voice, label] of lines) {
    if (slotOf(voice) !== slot) continue;
    read++;
    const clean = cleanMarkdown(text);
    for (const c of clean ? splitIntoChunks(clean) : []) {
      const key = `${FOLDER}/${sha256(clipHashInput(c))}.mp3`;
      if (!clips.has(key)) clips.set(key, { key, text: c, label: `${label}: ${c}` });
    }
  }
  return { source: `${read} script lines (${slot} slot)`, clips: [...clips.values()].slice(0, LIMIT) };
}

async function existing(prefix = `${FOLDER}/`) {
  const keys = new Set();
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token }));
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

// ─── Phonemes ──────────────────────────────────────────────────────
//
// The GPU engine takes phonemes, not text, so text is phonemized here — by
// kokoro-js itself, so a recording is pronounced (and paused, at the commas)
// exactly as the in-browser Kokoro would say it. kokoro-js doesn't export its
// phonemizer, but generate() hands the phonemes straight to the tokenizer: a
// tokenizer that throws them back ends the call there, before any model runs.

const CAPTURED = Symbol('phonemes');
const phonemizer = new KokoroTTS({}, (ps) => { throw { [CAPTURED]: ps }; });

async function phonemesOf(text) {
  try {
    await phonemizer.generate(text, { voice: VOICE });
  } catch (err) {
    if (err && CAPTURED in err) return err[CAPTURED];
    throw err;
  }
  throw new Error('kokoro-js generated without tokenizing — has its internals changed?');
}

/** Kokoro on the Apple GPU (scripts/pregen_speech_mlx.py): generate(clip) → { samples, rate }. */
function startMlxModel() {
  const py = spawn(MLX_PYTHON, [new URL('./pregen_speech_mlx.py', import.meta.url).pathname, VOICE], {
    stdio: ['pipe', 'pipe', 'inherit'],
  });
  const waiting = new Map();
  let ids = 0;
  // stdout is header lines, each followed by the raw float32 bytes it announces.
  let buf = Buffer.alloc(0);
  let header = null;
  return new Promise((resolve, reject) => {
    const fail = (err) => {
      reject(err);
      for (const w of waiting.values()) w.reject(err);
      waiting.clear();
    };
    py.on('error', fail);
    py.on('exit', (code) => fail(new Error(`MLX worker exited ${code}`)));
    py.stdout.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      for (;;) {
        if (!header) {
          const nl = buf.indexOf(10);
          if (nl < 0) return;
          header = JSON.parse(buf.subarray(0, nl).toString());
          buf = buf.subarray(nl + 1);
          if (header.ready) {
            header = null;
            resolve({
              generate: async (clip) => {
                const phonemes = clip.phonemes ?? await phonemesOf(clip.text);
                return new Promise((res, rej) => {
                  const id = ++ids;
                  waiting.set(id, { resolve: res, reject: rej });
                  py.stdin.write(JSON.stringify({ id, phonemes }) + '\n');
                });
              },
              close: () => { py.removeAllListeners('exit'); py.kill(); },
            });
            continue;
          }
        }
        const need = header.error ? 0 : header.samples * 4;
        if (buf.length < need) return;
        const w = waiting.get(header.id);
        waiting.delete(header.id);
        if (header.error) w?.reject(new Error(header.error));
        else {
          // Copy out: the slice shares the buffer the next chunk replaces.
          const bytes = Buffer.from(buf.subarray(0, need));
          w?.resolve({ samples: new Float32Array(bytes.buffer, bytes.byteOffset, header.samples), rate: header.rate });
        }
        buf = buf.subarray(need);
        header = null;
      }
    });
  });
}

/** A Kokoro model in a child process: generate(clip) → { samples, rate }. */
function startModel(engine = ENGINE) {
  if (engine === 'mlx') return startMlxModel();
  // 'advanced' serialization carries the Float32Array of samples as-is.
  const worker = fork(new URL('./pregen-speech-worker.mjs', import.meta.url), [], {
    serialization: 'advanced',
    env: { ...process.env, PREGEN_WORKER: JSON.stringify({ modelId: KOKORO_MODEL_ID, voice: VOICE, threads: THREADS }) },
  });
  const waiting = new Map();
  let ids = 0;
  return new Promise((resolve, reject) => {
    const fail = (err) => {
      reject(err);
      for (const w of waiting.values()) w.reject(err);
      waiting.clear();
    };
    worker.on('error', fail);
    worker.on('exit', (code) => { if (code) fail(new Error(`Kokoro worker exited ${code}`)); });
    worker.on('message', (msg) => {
      if (msg.type === 'ready') {
        resolve({
          generate: (clip) => new Promise((res, rej) => {
            const id = ++ids;
            waiting.set(id, { resolve: res, reject: rej });
            worker.send({ id, text: clip.text, phonemes: clip.phonemes });
          }),
          close: () => worker.kill(),
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

function loadModels() {
  console.log(ENGINE === 'mlx'
    ? `Loading ${WORKERS} Kokoro model(s) on the GPU (MLX)${CPU_WORKERS ? ` + ${CPU_WORKERS} on the CPU, ${THREADS} threads each` : ''}…`
    : `Loading ${WORKERS} Kokoro model(s) on the CPU, ${THREADS} threads each…`);
  return Promise.all([
    ...Array.from({ length: WORKERS }, () => startModel()),
    ...Array.from({ length: CPU_WORKERS }, () => startModel('onnx')),
  ]);
}

async function upload(key, body, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
}

// ─── Podcasts: one file per episode, with a timed transcript ───────

const PODCAST_FOLDER = `podcasts/${FOLDER}`;
// Silence between the pieces, in seconds — a beat between sentences, a
// breath at a paragraph, nearly nothing where one long sentence was cut.
const GAP = { chunk: 0.08, sentence: 0.35, paragraph: 0.8 };

/** Every episode: its sentences as the player splits them, grouped by paragraph. */
async function podcastManifest() {
  const { podcasts } = await import('../src/data/englishListening.ts');
  const picked = (ONLY ? podcasts.filter((p) => ONLY.includes(p.id)) : podcasts).slice(0, LIMIT);
  return picked.map((p) => {
    // splitSentences cuts at newlines first, so per paragraph it gives the
    // same sentences — this just remembers where the paragraphs were.
    const paragraphs = p.script.split(/\n+/).map(splitSentences).filter((s) => s.length);
    const lines = paragraphs.flat();
    if (lines.join('\n') !== splitSentences(p.script).join('\n')) throw new Error(`${p.id}: paragraph split disagrees with splitSentences`);
    const hash = sha256(episodeHashInput(lines));
    return { id: p.id, title: p.title, paragraphs, lines, base: `${PODCAST_FOLDER}/${hash}` };
  });
}

/** Each sentence's pieces as speakText would read it: cleanMarkdown, then splitIntoChunks. */
function sentenceChunks(line) {
  const clean = cleanMarkdown(line);
  return clean ? splitIntoChunks(clean) : [];
}

async function recordEpisode(ep, models) {
  const jobs = ep.paragraphs.flatMap((para, pi) => para.flatMap((line, li) =>
    sentenceChunks(line).map((text, ci) => ({ pi, li, ci, text, label: `${ep.id}: ${text}` }))));
  const audio = new Array(jobs.length);
  let next = 0;
  await Promise.all(models.map(async (m) => {
    while (next < jobs.length) {
      const i = next++;
      audio[i] = await m.generate(jobs[i]);
    }
  }));

  const rate = audio[0].rate;
  const parts = [];
  const lines = [];
  let samples = 0;
  const pad = (seconds) => { const n = Math.round(seconds * rate); parts.push(new Float32Array(n)); samples += n; };
  const at = () => Math.round((samples / rate) * 1000) / 1000;
  let line = null;
  jobs.forEach((job, i) => {
    if (job.ci === 0) {
      if (line) { line.end = at(); lines.push(line); pad(job.li === 0 ? GAP.paragraph : GAP.sentence); }
      line = { start: at(), end: 0, text: ep.paragraphs[job.pi][job.li] };
    } else pad(GAP.chunk);
    parts.push(audio[i].samples);
    samples += audio[i].samples.length;
  });
  line.end = at();
  lines.push(line);
  if (lines.length !== ep.lines.length) throw new Error(`${ep.id}: ${lines.length} timed lines for ${ep.lines.length} sentences`);

  const pcm = new Float32Array(samples);
  let o = 0;
  for (const p of parts) { pcm.set(p, o); o += p.length; }
  const mp3 = await toMp3(pcm, rate);
  const timeline = JSON.stringify({ duration: at(), lines });
  await upload(`${ep.base}.mp3`, mp3, 'audio/mpeg');
  await upload(`${ep.base}.json`, timeline, 'application/json');
  if (OUT) {
    fs.writeFileSync(path.join(OUT, `${ep.id}.mp3`), mp3);
    fs.writeFileSync(path.join(OUT, `${ep.id}.json`), timeline);
  }
  return { seconds: at(), bytes: mp3.length };
}

async function podcastsMain() {
  const episodes = await podcastManifest();
  const have = await existing(`${PODCAST_FOLDER}/`);
  const todo = episodes.filter((e) => !have.has(`${e.base}.json`));
  const sentences = episodes.reduce((n, e) => n + e.lines.length, 0);
  console.log(`${episodes.length} episodes (${sentences} sentences) for ${PODCAST_FOLDER}; ${episodes.length - todo.length} already recorded, ${todo.length} to record.`);
  if (DRY_RUN || !todo.length) return;

  if (OUT) fs.mkdirSync(OUT, { recursive: true });
  const models = await loadModels();
  const started = Date.now();
  let done = 0, failed = 0;
  for (const ep of todo) {
    const t0 = Date.now();
    try {
      const { seconds, bytes } = await recordEpisode(ep, models);
      done++;
      console.log(`✓ ${ep.id} ${ep.title} — ${Math.round(seconds)} s of audio, ${(bytes / 1e6).toFixed(1)} MB, in ${Math.round((Date.now() - t0) / 1000)} s  (${done}/${todo.length})`);
    } catch (err) {
      failed++;
      console.warn(`✗ ${ep.id} ${ep.title}: ${err.message}`);
    }
  }
  for (const m of models) await m.close();
  console.log(`\n${done} episodes uploaded, ${failed} failed, in ${Math.round((Date.now() - started) / 60000)} min.`);
}

async function main() {
  const { source, clips } = await (SCRIPTS ? scriptManifest() : manifest());
  const have = await existing();
  // A clip's shard is fixed by its name, so every run agrees on who owns it.
  const mine = (c) => SHARDS === 1 || parseInt(path.basename(c.key).slice(0, 8), 16) % SHARDS === SHARD - 1;
  const todo = clips.filter((c) => mine(c) && !have.has(c.key));
  const tag = SHARDS > 1 ? ` [shard ${SHARD}/${SHARDS}]` : '';
  const uploaded = clips.length - clips.filter((c) => !have.has(c.key)).length;
  console.log(`${source} → ${clips.length} clips for ${FOLDER}; ${uploaded} already uploaded (${Math.floor((uploaded / clips.length) * 100)}%), ${todo.length} to record${tag}.`);
  if (DRY_RUN || !todo.length) return;

  if (OUT) fs.mkdirSync(OUT, { recursive: true });
  const models = await loadModels();

  const started = Date.now();
  const pending = new Set();
  const listened = [];
  let done = 0, failed = 0, bytes = 0, next = 0;

  // Encoding and upload overlap the next generation; cap what's in flight.
  const record = async (clip, { samples, rate }) => {
    const mp3 = await toMp3(samples, rate);
    await upload(clip.key, mp3, 'audio/mpeg');
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
      const job = record(clip, audio).catch((err) => { failed++; console.warn(`✗ ${clip.label}: ${err.message}`); });
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

await (PODCASTS ? podcastsMain() : main());
