// Pronunciation scoring on the device: record a word, find out which of its
// sounds came out right. Free and private — the audio never leaves the
// browser — at the cost of a one-time ~240MB model download and a few hundred
// ms of compute per try, which is why it's offered only on desktop-class
// machines (canScorePronunciation). The model runs in pronunciationWorker.ts;
// the scoring math is phonemeScore.ts.

import type { WordScore } from './phonemeScore';
import type { WorkerInMsg, WorkerOutMsg } from './pronunciationWorker';

export type PronunciationResult = WordScore & { ipa: string };

/**
 * Whether this device should be offered scoring at all. A phone would take a
 * quarter-gigabyte download and tens of seconds per word, so: a fine pointer
 * (mouse or trackpad — not a phone or tablet), at least 4 cores, and at least
 * 8GB of memory where the browser says (only Chromium does; elsewhere the
 * other two decide).
 */
export function canScorePronunciation(): boolean {
  if (typeof window === 'undefined' || typeof Worker === 'undefined' || !navigator.mediaDevices) return false;
  const nav = navigator as Navigator & { deviceMemory?: number; userAgentData?: { mobile?: boolean } };
  if (nav.userAgentData?.mobile) return false;
  if (!window.matchMedia?.('(pointer: fine)').matches) return false;
  if ((nav.hardwareConcurrency ?? 0) < 4) return false;
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 8) return false;
  return true;
}

// Set once the model has loaded on this device — the browser keeps the
// download, so until then the button says what it costs.
const CACHED_KEY = 'voca-phoneme-model-ready';
export function pronunciationModelCached(): boolean {
  try { return localStorage.getItem(CACHED_KEY) === '1'; } catch { return false; }
}

let worker: Worker | null = null;
let ready: Promise<void> | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (r: PronunciationResult | null) => void; reject: (e: Error) => void }>();
const progressListeners = new Set<(p: number) => void>();

async function pickDevice(): Promise<'webgpu' | 'wasm'> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  try {
    if (gpu && await gpu.requestAdapter()) return 'webgpu';
  } catch { /* no usable adapter */ }
  return 'wasm';
}

/** Load the model (once). `onProgress` gets 0..100 while it downloads. */
export function loadPronunciationModel(onProgress?: (p: number) => void): Promise<void> {
  if (onProgress) progressListeners.add(onProgress);
  ready ??= (async () => {
    const device = await pickDevice();
    const w = new Worker(new URL('./pronunciationWorker.ts', import.meta.url), { type: 'module' });
    worker = w;
    await new Promise<void>((resolve, reject) => {
      w.onmessage = (e: MessageEvent<WorkerOutMsg>) => {
        const msg = e.data;
        if (msg.type === 'progress') progressListeners.forEach((l) => l(msg.progress));
        else if (msg.type === 'ready') {
          try { localStorage.setItem(CACHED_KEY, '1'); } catch { /* private mode */ }
          resolve();
        }
        else if (msg.type === 'load-error') reject(new Error(msg.error));
        else if (msg.type === 'scored') { pending.get(msg.id)?.resolve(msg.result); pending.delete(msg.id); }
        else if (msg.type === 'score-error') { pending.get(msg.id)?.reject(new Error(msg.error)); pending.delete(msg.id); }
      };
      w.postMessage({ type: 'load', device } satisfies WorkerInMsg);
    });
  })().catch((err) => {
    // Let the next try start over rather than inherit a dead worker.
    worker?.terminate();
    worker = null;
    ready = null;
    throw err;
  });
  return ready.finally(() => { if (onProgress) progressListeners.delete(onProgress); });
}

/** Decode a recording to 16kHz mono, padded with a little silence each side. */
async function toPcm(blob: Blob): Promise<Float32Array> {
  const ctx = new AudioContext({ sampleRate: 16000 });
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    const pcm = decoded.getChannelData(0);
    // A word cut off right at its last consonant loses the release the model
    // listens for; real silence around it is what it was trained on.
    const pad = 3200;
    const out = new Float32Array(pcm.length + 2 * pad);
    out.set(pcm, pad);
    return out;
  } finally {
    void ctx.close();
  }
}

/**
 * Score a recording against the word's expected IPA — every accent given
 * (US, UK), keeping whichever it was closer to. Null when nothing usable was
 * heard (too short, or the IPA has no sounds the model knows).
 */
export async function scorePronunciation(blob: Blob, ipas: string[], onProgress?: (p: number) => void): Promise<PronunciationResult | null> {
  await loadPronunciationModel(onProgress);
  const audio = await toPcm(blob);
  // Under a fifth of a second (plus padding) is a click, not a word.
  if (audio.length < 6400 + 3200) return null;
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker!.postMessage({ type: 'score', id, audio, ipas } satisfies WorkerInMsg, [audio.buffer]);
  });
}

// The IPA chart (/ipa) uses textbook British symbols; the model writes eSpeak.
const CHART_SYMBOL: Record<string, string> = {
  'ɹ': 'r', 'ɡ': 'g', 'ɛ': 'e', 'ɚ': 'ɜː', 'ɜ': 'ɜː', 'ᵻ': 'ɪ', 'ɐ': 'ə', 'i': 'iː', 'u': 'uː',
  'ɑ': 'ɑː', 'oʊ': 'əʊ', 'o': 'əʊ', 'ɔ': 'ɔː', 'ɾ': 't', 'eə': 'eə',
};
const CHART = new Set([
  'ɪ', 'e', 'æ', 'ʌ', 'ɒ', 'ʊ', 'ə', 'iː', 'ɜː', 'ɑː', 'ɔː', 'uː', 'eɪ', 'aɪ', 'ɔɪ', 'aʊ', 'əʊ', 'ɪə', 'eə', 'ʊə',
  'p', 'b', 't', 'd', 'k', 'g', 'f', 'v', 'θ', 'ð', 's', 'z', 'ʃ', 'ʒ', 'h', 'tʃ', 'dʒ', 'm', 'n', 'ŋ', 'l', 'r', 'j', 'w',
]);

/** A phone as the IPA chart writes it, or null if the chart doesn't have it. */
export function chartSymbol(phone: string): string | null {
  const symbol = CHART_SYMBOL[phone] ?? phone;
  return CHART.has(symbol) ? symbol : null;
}

/** The /ipa page for a phone — its mouth diagram and drills — or null if the chart lacks it. */
export function ipaChartLink(phone: string): string | null {
  const symbol = chartSymbol(phone);
  return symbol ? `/ipa?view=detail&symbol=${encodeURIComponent(symbol)}` : null;
}
