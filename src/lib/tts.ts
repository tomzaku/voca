import { cleanMarkdown } from './cleanMarkdown';
import { getTtsEngine, getTtsVoice, getTtsSpeed, getPiperVoice, getCloudVoice, demoteAutoEngine, PIPER_VOICES, type TtsEngine } from '../hooks/useTtsSettings';
import { classifyDevice, readDeviceSignals, isSafariBrowser, hasWebGPU } from './deviceTier';
import { KOKORO_MODEL_ID } from './ttsModel';
import type { SpeechVoice } from './speechApi';
import { getClip, type Clip } from './speechCache';
import type { WorkerInMsg, WorkerOutMsg } from './ttsWorker';
import toast from 'react-hot-toast';
import { t } from '../i18n';

type KokoroTTSInstance = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generate(text: string, options: { voice: any; speed: number }): Promise<{ toBlob(): Blob }>;
};

type PiperTTSModule = {
  predict(config: { text: string; voiceId: string }): Promise<Blob>;
};

// Exported for the benchmark page (src/lib/ttsBenchmark.ts), which loads its
// own isolated KokoroTTS instance rather than sharing this module's worker.
export const MODEL_ID = KOKORO_MODEL_ID;
const TAG = '[tts]';
const MAX_TTS_CHARS = 5000;

const lowPower = classifyDevice(readDeviceSignals()) === 'low';

let sessionStart = 0;
function elapsed(): string {
  return `+${((performance.now() - sessionStart) / 1000).toFixed(2)}s`;
}
function log(...args: unknown[]) {
  console.log(TAG, elapsed(), ...args);
}

let kokoroUnavailable = isSafariBrowser();

/**
 * Whether this browser can run the Kokoro AI voice model. Kokoro loads on WASM
 * or WebGPU everywhere except Safari (which we blocklist). Used to decide the
 * default voice engine during onboarding.
 */
export function isKokoroSupported(): boolean {
  return typeof navigator !== 'undefined' && !isSafariBrowser();
}

// Re-exported for the benchmark page, which needs to know (and report) which
// device a fresh Kokoro load would pick before it picks it.
export { hasWebGPU };

// ─── Auto engine safety net ────────────────────────────────────────
//
// Auto picks an engine from device signals (deviceTier.ts), but signals can
// flatter a machine. If its pick fails to load, or keeps synthesising slower
// than the audio plays, step Auto down for good on this device — Piper runs
// on the main thread, so a slow synth there is a frozen page, not just a wait.
// A hand-picked engine is never changed (demoteAutoEngine returns null).

const ENGINE_NAME_ID: Record<TtsEngine, string> = {
  native: 'settings.engineNative',
  cloud: 'settings.engineCloud',
  piper: 'settings.enginePiper',
  kokoro: 'settings.engineKokoro',
};

function demote(from: TtsEngine) {
  const next = demoteAutoEngine(from);
  if (!next) return;
  log(`auto: ${from} too heavy here, now ${next}`);
  if (from === 'kokoro') shutdownKokoro();
  toast(t('settings.ttsDemoted', { engine: t(ENGINE_NAME_ID[next]) }), { id: 'tts-demoted', duration: 4000 });
}

// Roughly 15 characters of English per second of speech.
const MS_PER_CHAR = 65;
// Short texts are dominated by fixed overhead, so they can't show a trend.
const MIN_JUDGED_CHARS = 40;
const SLOW_RTF = 1.2;
const STRIKES_TO_DEMOTE = 2;
const warmed = new Set<string>();
let strikes = 0;

/**
 * Report one synthesis. The first per engine+voice is skipped — it carries
 * shader compilation (WebGPU) or the voice download (Piper) — and it takes
 * two slow ones in a row to demote, so one hiccup in a busy tab doesn't.
 */
function judgeSpeed(engine: TtsEngine, voice: string, text: string, ms: number) {
  const key = `${engine}:${voice}`;
  if (!warmed.has(key)) { warmed.add(key); return; }
  if (text.length < MIN_JUDGED_CHARS) return;
  const rtf = ms / (text.length * MS_PER_CHAR);
  if (rtf <= SLOW_RTF) { strikes = 0; return; }
  log(`slow ${engine} synth: rtf≈${rtf.toFixed(2)}`);
  if (++strikes >= STRIKES_TO_DEMOTE) { strikes = 0; demote(engine); }
}

// Kokoro itself runs inside this worker (see ttsWorker.ts) so model loading
// and every generate() call happen off the main thread — that's what stops
// the page from freezing while a clip is produced. This wrapper just proxies
// generate() calls to the worker and turns its postMessage replies back into
// promises, so the rest of this file can keep treating it as a plain
// KokoroTTSInstance.
let ttsWorker: Worker | null = null;
let workerReadyPromise: Promise<void> | null = null;
let genCounter = 0;
const pendingGenerations = new Map<number, { resolve: (blob: Blob) => void; reject: (err: unknown) => void }>();

function send(msg: WorkerInMsg) {
  ttsWorker!.postMessage(msg);
}

function startWorker(device: 'webgpu' | 'wasm', dtype: string): Promise<void> {
  const worker = new Worker(new URL('./ttsWorker.ts', import.meta.url), { type: 'module' });
  ttsWorker = worker;

  const ready = new Promise<void>((resolve, reject) => {
    worker.onmessage = (e: MessageEvent<WorkerOutMsg>) => {
      const msg = e.data;
      switch (msg.type) {
        case 'progress':
          if (typeof msg.progress === 'number' && msg.progress > 0 && msg.progress % 10 < 1) {
            toast.loading(t('settings.ttsLoadingProgress', { engine: 'Kokoro AI', percent: Math.round(msg.progress) }), { id: 'tts-loading' });
          }
          break;
        case 'ready':
          toast.success(t('settings.ttsReady', { engine: 'Kokoro AI' }), { id: 'tts-loading', duration: 2000 });
          resolve();
          break;
        case 'load-error':
          kokoroUnavailable = true;
          demote('kokoro');
          toast.error(t('settings.ttsFailed', { engine: 'Kokoro AI' }), { id: 'tts-loading', duration: 3000 });
          reject(new Error(msg.error));
          break;
        case 'generated': {
          const pending = pendingGenerations.get(msg.id);
          if (pending) { pendingGenerations.delete(msg.id); pending.resolve(msg.blob); }
          break;
        }
        case 'generate-error': {
          const pending = pendingGenerations.get(msg.id);
          if (pending) { pendingGenerations.delete(msg.id); pending.reject(new Error(msg.error)); }
          break;
        }
      }
    };
    worker.onerror = (err) => {
      kokoroUnavailable = true;
      reject(err.error ?? new Error(err.message));
    };
  });

  ready.catch(() => {
    // Let a later call retry from scratch instead of being stuck on a
    // rejected promise forever.
    workerReadyPromise = null;
    worker.terminate();
    if (ttsWorker === worker) ttsWorker = null;
  });

  send({ type: 'load', device, dtype });
  return ready;
}

/** Free the model's memory; anything mid-generation fails rather than hangs. */
function shutdownKokoro() {
  ttsWorker?.terminate();
  ttsWorker = null;
  workerReadyPromise = null;
  for (const p of pendingGenerations.values()) p.reject(new Error('kokoro shut down'));
  pendingGenerations.clear();
}

export async function getKokoroTTS(): Promise<KokoroTTSInstance> {
  if (!workerReadyPromise) {
    const useGPU = await hasWebGPU();
    const device = useGPU ? 'webgpu' : 'wasm';
    const dtype = useGPU ? 'fp32' : 'q8';
    log(`starting model download... device=${device} dtype=${dtype}`);
    toast.loading(t('settings.ttsLoading', { engine: 'Kokoro AI' }), { id: 'tts-loading' });
    workerReadyPromise = startWorker(device, dtype);
  }

  await workerReadyPromise;

  return {
    generate(text, options) {
      return new Promise((resolve, reject) => {
        const id = ++genCounter;
        pendingGenerations.set(id, { resolve: (blob) => resolve({ toBlob: () => blob }), reject });
        send({ type: 'generate', id, text, voice: options.voice, speed: options.speed });
      });
    },
  };
}

export function preloadTts() {
  if (lowPower) return;
  const engine = getTtsEngine();
  if (engine === 'piper') { preloadPiper(); return; }
  if (engine !== 'kokoro') return;
  if (kokoroUnavailable) return;
  sessionStart = performance.now();
  getKokoroTTS().catch((err) => {
    console.warn(TAG, 'preload failed:', err);
  });
}

// ─── Piper TTS ─────────────────────────────────────────────────────

let piperModule: PiperTTSModule | null = null;
let piperPromise: Promise<PiperTTSModule> | null = null;

async function getPiperTTS(): Promise<PiperTTSModule> {
  if (piperModule) return piperModule;
  if (piperPromise) return piperPromise;

  toast.loading(t('settings.ttsLoading', { engine: 'Piper AI' }), { id: 'tts-loading' });
  piperPromise = import('@mintplex-labs/piper-tts-web').then((mod) => {
    piperModule = mod as unknown as PiperTTSModule;
    toast.success(t('settings.ttsReady', { engine: 'Piper AI' }), { id: 'tts-loading', duration: 2000 });
    return piperModule;
  }).catch((err) => {
    piperPromise = null;
    toast.error(t('settings.ttsFailed', { engine: 'Piper AI' }), { id: 'tts-loading', duration: 3000 });
    demote('piper');
    throw err;
  });

  return piperPromise;
}

export function preloadPiper() {
  if (getTtsEngine() !== 'piper') return;
  sessionStart = performance.now();
  getPiperTTS().catch((err) => {
    console.warn(TAG, 'Piper preload failed:', err);
  });
}

// Every read takes a ticket; starting another read or stopping hands out a
// new one, and a read whose ticket is no longer current goes quiet. A single
// shared "cancelled" flag couldn't do this: the next read reset it, so an
// earlier read still generating audio (React's dev double-mount, or two
// callers asking at once) carried on and played too — every word read twice.
let session = 0;
const stale = (ticket: number) => ticket !== session;

// ─── Playback ──────────────────────────────────────────────────────
//
// One <audio> element for every clip, unlocked on the first tap. iOS only lets
// a page start audio from inside a tap, and a clip here usually starts after an
// await (a model generating it, or the cloud fetching it) — by then the tap is
// over and a fresh `new Audio().play()` is refused, silently. An element that
// has played once from a tap may play again later, so play a moment of silence
// on the first tap anywhere and reuse that element from then on.

let sharedAudio: HTMLAudioElement | null = null;
let silentUrl: string | null = null;
/** What's loaded right now, so stopping can revoke a blob URL we made. */
let currentUrl: string | null = null;
let ownsUrl = false;

function audioEl(): HTMLAudioElement {
  return sharedAudio ??= new Audio();
}

/** 0.1s of silence as a WAV — built here rather than shipped as a file. */
function silence(): string {
  if (silentUrl) return silentUrl;
  const samples = 800;
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const str = (o: number, t: string) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + samples * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, samples * 2, true);
  return silentUrl = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

if (typeof document !== 'undefined') {
  const events = ['pointerdown', 'touchend', 'keydown'] as const;
  const unlock = () => {
    events.forEach((e) => document.removeEventListener(e, unlock, true));
    const a = audioEl();
    // A clip already loaded (auto-speak on arrival) was likely refused for want
    // of a tap — this is one, so start it now; that unlocks the element too.
    if (currentUrl) { a.play().catch(() => {}); return; }
    const s = silence();
    a.src = s;
    // Only pause the silence: a real clip may have been loaded meanwhile.
    a.play().then(() => { if (a.src === s) a.pause(); }).catch(() => {});
  };
  events.forEach((e) => document.addEventListener(e, unlock, { capture: true, passive: true }));
}

function releaseUrl() {
  if (currentUrl && ownsUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = null;
  ownsUrl = false;
}

/**
 * Play `src` and resolve when it ends, fails, or is refused. `rate` is for
 * clips that don't bake the speed in (cloud); model clips are made at speed.
 * A clip cut off by the next one or by stopSpeaking() stays pending, as it
 * always has — callers check their ticket, not this promise.
 */
function playSrc(src: string, ticket: number, rate = 1, owned = false): Promise<void> {
  return new Promise<void>((resolve) => {
    if (stale(ticket)) { if (owned) URL.revokeObjectURL(src); resolve(); return; }
    const audio = audioEl();
    // Never two clips at once, whoever started the other one.
    audio.pause();
    releaseUrl();
    currentUrl = src;
    ownsUrl = owned;
    audio.src = src;
    audio.defaultPlaybackRate = rate;
    audio.playbackRate = rate;
    const done = () => {
      if (currentUrl !== src) return; // replaced meanwhile
      audio.onended = audio.onerror = null;
      releaseUrl();
      resolve();
    };
    audio.onended = done;
    audio.onerror = done;
    audio.play().catch(done);
  });
}

function playBlob(blob: Blob, ticket: number): Promise<void> {
  return playSrc(URL.createObjectURL(blob), ticket, 1, true);
}

const FIRST_CHUNK_CHARS = 120;
const MAX_CHUNK_CHARS = 300;

function splitIntoChunks(text: string): string[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  for (const para of paragraphs) {
    const limit = chunks.length === 0 ? FIRST_CHUNK_CHARS : MAX_CHUNK_CHARS;
    if (para.length <= limit) { chunks.push(para); continue; }
    const sentences = para.match(/[^.!?]+[.!?]+\s*/g) || [para];
    let current = '';
    for (const sentence of sentences) {
      const curLimit = chunks.length === 0 && current === '' ? FIRST_CHUNK_CHARS : MAX_CHUNK_CHARS;
      if (current.length + sentence.length > curLimit && current) { chunks.push(current.trim()); current = ''; }
      current += sentence;
    }
    if (current.trim()) chunks.push(current.trim());
  }
  return chunks.length > 0 ? chunks : [text];
}

async function speakPiper(text: string, ticket: number, options?: { voice?: string; onStart?: () => void; onEnd?: () => void }): Promise<void> {
  const piper = await getPiperTTS();
  if (stale(ticket)) return;
  const chunks = splitIntoChunks(text);
  const rawVoice = options?.voice ?? getPiperVoice();
  const voiceId = PIPER_VOICES.some((v) => v.id === rawVoice) ? rawVoice : getPiperVoice();
  const timedPredict = async (text: string) => {
    const start = performance.now();
    const blob = await piper.predict({ text, voiceId });
    judgeSpeed('piper', voiceId, text, performance.now() - start);
    return blob;
  };
  let nextBlob: Blob | null = await timedPredict(chunks[0]);
  if (!nextBlob || stale(ticket)) { options?.onEnd?.(); return; }
  options?.onStart?.();
  for (let i = 0; i < chunks.length; i++) {
    if (stale(ticket)) break;
    const currentBlob = nextBlob!;
    const nextPromise = (i + 1 < chunks.length)
      ? timedPredict(chunks[i + 1]).catch(() => null)
      : Promise.resolve(null);
    await playBlob(currentBlob, ticket);
    nextBlob = await nextPromise;
    if (!nextBlob && i + 1 < chunks.length) break;
  }
}

// ─── Cloud (speech edge function) ──────────────────────────────────

/**
 * The cloud voice to ask for. A Google id (the Settings preview) goes as-is.
 * Callers that don't know the engine pass Kokoro/Piper ids (af_sarah,
 * am_michael, …_male-…): a male one is the dialogue's second speaker, so it
 * gets the server's male voice; anything else reads in the voice picked in
 * Settings, or the server's default.
 */
function cloudVoiceFor(voice?: string): SpeechVoice {
  if (voice && /^en-[A-Z]{2}-/.test(voice)) return voice;
  if (voice && (voice === 'male' || /^[ab]m_/.test(voice) || /(^|[-_])male\b/.test(voice))) return 'male';
  return getCloudVoice() || 'female';
}

/**
 * Read `text` with server-made clips, a sentence at a time, fetching the next
 * while one plays. Resolves false when not even the first clip came back
 * (offline, unconfigured, over the limit) so the caller can use the native
 * voice instead; a failure part-way reads the rest natively.
 */
async function speakCloud(text: string, ticket: number, options?: { voice?: string; speed?: number; onStart?: () => void }): Promise<boolean> {
  const chunks = splitIntoChunks(text);
  const slot = cloudVoiceFor(options?.voice);
  const speed = options?.speed ?? getTtsSpeed();
  // A clip that arrives after the read was stopped is never played; free it.
  const discard = (c: Clip | null) => { if (c?.owned) URL.revokeObjectURL(c.src); };
  let clip = await getClip(chunks[0], slot);
  if (stale(ticket)) { discard(clip); return true; }
  if (!clip) return false;
  options?.onStart?.();
  for (let i = 0; i < chunks.length; i++) {
    const next = i + 1 < chunks.length ? getClip(chunks[i + 1], slot) : null;
    await playSrc(clip.src, ticket, speed, clip.owned);
    if (stale(ticket) || !next) { void next?.then(discard); break; }
    const nextClip = await next;
    if (stale(ticket)) { discard(nextClip); break; }
    if (!nextClip) {
      await speakNative(chunks.slice(i + 1).join(' '), { speed });
      break;
    }
    clip = nextClip;
  }
  return true;
}

function speakNative(text: string, options?: { speed?: number; onStart?: () => void; onEnd?: () => void }): Promise<void> {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = options?.speed ?? getTtsSpeed();
  return new Promise<void>((resolve) => {
    utterance.onstart = () => options?.onStart?.();
    utterance.onend = () => { options?.onEnd?.(); resolve(); };
    utterance.onerror = () => { options?.onEnd?.(); resolve(); };
    speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  session++;
  if (currentUrl) { sharedAudio?.pause(); releaseUrl(); }
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

export function isTtsPlaying(): boolean {
  return (currentUrl !== null && !!sharedAudio && !sharedAudio.paused) || speechSynthesis.speaking;
}

// ─── Conversation read-aloud (two voices) ──────────────────────────

export const CONV_VOICE_A = 'af_sarah';   // Speaker A (AI bubble)
export const CONV_VOICE_B = 'am_michael'; // Speaker B (user bubble)
/** Voices for a recording with any number of speakers (IELTS Listening),
 *  handed out in turn — see assignVoices in listeningRules. */
export const RECORDING_VOICES = [CONV_VOICE_A, CONV_VOICE_B, 'bf_emma', 'bm_george'] as const;

async function speakOnce(text: string, voice: string, ticket: number): Promise<void> {
  const clean = cleanMarkdown(text);
  if (!clean || stale(ticket)) return;

  const engine = getTtsEngine();

  if (engine === 'native') {
    return speakNative(clean, { speed: getTtsSpeed() });
  }

  if (engine === 'cloud') {
    if (!await speakCloud(clean, ticket, { voice }) && !stale(ticket)) {
      return speakNative(clean, { speed: getTtsSpeed() });
    }
    return;
  }

  if (engine === 'piper' || (kokoroUnavailable && engine === 'kokoro')) {
    return speakPiper(clean, ticket, { voice });
  }

  let tts: KokoroTTSInstance;
  try {
    tts = await getKokoroTTS();
  } catch {
    return speakNative(clean, { speed: getTtsSpeed() });
  }
  if (stale(ticket)) return;

  const start = performance.now();
  const result = await tts.generate(clean, { voice: voice as 'af_heart', speed: getTtsSpeed() });
  judgeSpeed('kokoro', voice, clean, performance.now() - start);
  if (stale(ticket)) return;
  const blob = result.toBlob();
  return playBlob(blob, ticket);
}

export async function speakConversation(
  messages: Array<{ text: string; role: 'ai' | 'user' }>,
  options?: { onStart?: () => void; onEnd?: () => void },
): Promise<void> {
  stopSpeaking();
  const ticket = session;
  sessionStart = performance.now();
  options?.onStart?.();

  for (const msg of messages) {
    if (stale(ticket)) break;
    const voice = msg.role === 'ai' ? CONV_VOICE_A : CONV_VOICE_B;
    await speakOnce(msg.text, voice, ticket);
  }

  options?.onEnd?.();
}

export async function speakText(
  text: string,
  options?: { voice?: string; speed?: number; onStart?: () => void; onEnd?: () => void },
): Promise<void> {
  stopSpeaking();
  const ticket = session;
  sessionStart = performance.now();

  let clean = cleanMarkdown(text);
  if (!clean) return;

  if (clean.length > MAX_TTS_CHARS) {
    const truncated = clean.slice(0, MAX_TTS_CHARS);
    const lastSentence = truncated.lastIndexOf('. ');
    clean = lastSentence > MAX_TTS_CHARS * 0.5 ? truncated.slice(0, lastSentence + 1) : truncated;
  }

  const engine = getTtsEngine();

  if (engine === 'native') {
    options?.onStart?.();
    await speakNative(clean, options);
    return;
  }

  if (engine === 'cloud') {
    if (await speakCloud(clean, ticket, options)) {
      if (!stale(ticket)) options?.onEnd?.();
      return;
    }
    if (stale(ticket)) return;
    options?.onStart?.();
    await speakNative(clean, options);
    return;
  }

  if (engine === 'piper' || (kokoroUnavailable && engine === 'kokoro')) {
    try {
      await speakPiper(clean, ticket, options);
      options?.onEnd?.();
    } catch (err) {
      if (stale(ticket)) return;
      console.warn(TAG, 'Piper failed, falling back to native:', err);
      options?.onStart?.();
      await speakNative(clean, options);
    }
    return;
  }

  let tts: KokoroTTSInstance;
  try {
    tts = await getKokoroTTS();
  } catch {
    if (stale(ticket)) return;
    options?.onStart?.();
    await speakNative(clean, options);
    return;
  }
  if (stale(ticket)) return;

  const chunks = splitIntoChunks(clean);
  const voice = (options?.voice ?? getTtsVoice()) as 'af_heart';
  const speed = options?.speed ?? getTtsSpeed();

  const generateChunk = async (i: number): Promise<Blob | null> => {
    if (stale(ticket) || i >= chunks.length) return null;
    const start = performance.now();
    const result = await tts.generate(chunks[i], { voice, speed });
    judgeSpeed('kokoro', voice, chunks[i], performance.now() - start);
    if (stale(ticket)) return null;
    return result.toBlob();
  };

  let currentBlob = await generateChunk(0).catch(() => null);
  if (!currentBlob || stale(ticket)) { options?.onEnd?.(); return; }

  options?.onStart?.();

  for (let i = 0; i < chunks.length; i++) {
    if (stale(ticket)) break;
    // A demotion mid-read shuts the worker down; end the read rather than hang.
    const nextPromise = (i + 1 < chunks.length) ? generateChunk(i + 1).catch(() => null) : null;
    await playBlob(currentBlob!, ticket);
    if (!nextPromise) break;
    currentBlob = await nextPromise;
    if (!currentBlob || stale(ticket)) break;
  }

  options?.onEnd?.();
}
