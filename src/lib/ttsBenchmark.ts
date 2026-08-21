// Timing harness for the hidden /ai-model-benchmark page. Deliberately
// independent of tts.ts's shared singletons (ttsInstance, piperModule) — a
// benchmark run should measure a real load, not report ~0ms because some
// other part of the app already warmed the engine.
import { MODEL_ID, hasWebGPU } from './tts';

export type BenchmarkEngine = 'kokoro' | 'piper' | 'native';

export interface BenchmarkResult {
  engine: BenchmarkEngine;
  voiceId: string;
  voiceLabel: string;
  /** Model download + init time. `null` where the engine has no separate load step (native). */
  loadMs: number | null;
  /**
   * Time to fetch this specific voice, separate from `loadMs`. Kokoro-only: one
   * model serves 26 voices, each needing its own small style file on first use
   * — this isolates that fetch so it doesn't inflate `genMs`. `null` where a
   * voice has no separate fetch of its own (Piper's is already all of `loadMs`;
   * native has no model at all).
   */
  voiceLoadMs: number | null;
  /** Time to produce audio: full synthesis for Kokoro/Piper, time-to-start for native. */
  genMs: number;
  /** Length of the resulting audio. */
  audioDurationMs: number;
  /** genMs / audioDurationMs — under 1 means faster than real-time playback. `null` when not meaningful. */
  rtf: number | null;
  /**
   * 100 / rtf, rounded: 100 = exactly real-time, 400 = 4× faster than
   * real-time, 50 = half real-time speed. Chip-comparable — text-length- and
   * model-size-independent, and depends only on the Synthesize phase (the
   * actual inference), not on network/disk (Load) or a fixed model file size.
   * `null` wherever `rtf` is (including native, whose timing reflects the
   * OS's own speech engine, not this device's compute).
   */
  score: number | null;
  /** Playable result. `null` for native, which plays live rather than returning audio. */
  blob: Blob | null;
  /** Total size of the model files this run needed, in bytes. `null` for native (no model). */
  sizeBytes: number | null;
  /** Free-form detail shown next to the row, e.g. "webgpu · q8" for Kokoro. */
  meta?: string;
}

/** See `BenchmarkResult.score` — the single number to compare chips by. */
function scoreFromRtf(rtf: number | null): number | null {
  return rtf !== null && rtf > 0 ? Math.round(100 / rtf) : null;
}

async function measure<T>(fn: () => Promise<T>): Promise<{ ms: number; value: T }> {
  const start = performance.now();
  const value = await fn();
  return { ms: performance.now() - start, value };
}

/** Decodes a result blob to find its playback length — works for any engine's WAV output. */
async function audioDurationMs(blob: Blob): Promise<number> {
  const buffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const decoded = await ctx.decodeAudioData(buffer);
    return decoded.duration * 1000;
  } finally {
    ctx.close();
  }
}

export type KokoroDevice = 'auto' | 'wasm' | 'webgpu';

export async function benchmarkKokoro(
  text: string,
  voiceId: string,
  voiceLabel: string,
  deviceOverride: KokoroDevice = 'auto',
): Promise<BenchmarkResult> {
  if (deviceOverride === 'webgpu' && !(await hasWebGPU())) {
    throw new Error('WebGPU is not available in this browser — try WASM (CPU) instead');
  }
  const useGPU = deviceOverride === 'auto' ? await hasWebGPU() : deviceOverride === 'webgpu';
  const device = useGPU ? 'webgpu' : 'wasm';
  const dtype = useGPU ? 'fp32' : 'q8';

  // transformers.js reports {file, loaded, total} progress for every file it
  // fetches — from the network *or* from Cache Storage, since both are Response
  // streams with a Content-Length. Keying by file name and taking the largest
  // `total` seen per key gives the real combined download size either way.
  const fileSizes = new Map<string, number>();
  // transformers.js's ProgressCallback type is a union of several status
  // shapes (initiate/download/progress/done/ready), most without file/total
  // at all — typing this narrower than `any` fights that union for no benefit
  // since we only ever read the two fields we check for below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const progress_callback = (p: any) => {
    if (p.file && typeof p.total === 'number' && p.total > 0) fileSizes.set(p.file, p.total);
  };

  const { KokoroTTS } = await import('kokoro-js');
  const { ms: loadMs, value: tts } = await measure(() =>
    KokoroTTS.from_pretrained(MODEL_ID, { dtype, device, progress_callback }),
  );
  const sizeBytes = fileSizes.size > 0 ? [...fileSizes.values()].reduce((a, b) => a + b, 0) : null;

  // A throwaway call on minimal text forces the voice's style file to be
  // fetched (or confirms it's already cached) before the real, timed call —
  // otherwise that fetch would happen inside genMs and look like slow
  // inference the first time any given voice is used.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { ms: voiceLoadMs } = await measure(() => tts.generate('.', { voice: voiceId as any, speed: 1 }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { ms: genMs, value: result } = await measure(() => tts.generate(text, { voice: voiceId as any, speed: 1 }));
  const blob = result.toBlob();
  const durationMs = await audioDurationMs(blob);
  const rtf = durationMs > 0 ? genMs / durationMs : null;

  return {
    engine: 'kokoro',
    voiceId,
    voiceLabel,
    loadMs,
    voiceLoadMs,
    genMs,
    audioDurationMs: durationMs,
    rtf,
    score: scoreFromRtf(rtf),
    blob,
    sizeBytes,
    meta: `${device} · ${dtype}`,
  };
}

/** Sums the .onnx + .onnx.json file sizes Piper's own voice catalog reports for one voice. */
async function piperVoiceSizeBytes(mod: typeof import('@mintplex-labs/piper-tts-web'), voiceId: string): Promise<number | null> {
  try {
    const list = await mod.voices();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const entry = list.find((v: any) => v.key === voiceId);
    if (!entry) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Object.values(entry.files as Record<string, any>).reduce((sum, f) => sum + (f.size_bytes ?? 0), 0);
  } catch {
    return null;
  }
}

export async function benchmarkPiper(text: string, voiceId: string, voiceLabel: string): Promise<BenchmarkResult> {
  const mod = await import('@mintplex-labs/piper-tts-web');
  const sizeBytes = await piperVoiceSizeBytes(mod, voiceId);

  // Unlike Kokoro's from_pretrained, Piper's download() always re-fetches over
  // the network — it doesn't check OPFS first. predict() does (via getBlob),
  // so only pay the network cost here when the voice truly isn't cached yet;
  // otherwise Load correctly reads ~0 and predict() below loads it from OPFS.
  const alreadyStored = (await mod.stored()).includes(voiceId);
  let loadMs = 0;
  if (!alreadyStored) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ({ ms: loadMs } = await measure(() => mod.download(voiceId as any)));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { ms: genMs, value: blob } = await measure(() => mod.predict({ text, voiceId: voiceId as any }));
  const durationMs = await audioDurationMs(blob);
  const rtf = durationMs > 0 ? genMs / durationMs : null;

  return {
    engine: 'piper',
    voiceId,
    voiceLabel,
    loadMs,
    voiceLoadMs: null,
    genMs,
    audioDurationMs: durationMs,
    rtf,
    score: scoreFromRtf(rtf),
    blob,
    sizeBytes,
  };
}

/**
 * The browser's built-in voice has no model to fetch and never returns a
 * blob — it speaks live. So `genMs` here is latency-to-start (the closest
 * analogue to Kokoro/Piper's synthesis time) and `audioDurationMs` is the
 * actual start→end playback span, timed by letting it play out loud.
 */
export function benchmarkNative(text: string): Promise<BenchmarkResult> {
  return new Promise((resolve, reject) => {
    if (typeof speechSynthesis === 'undefined') {
      reject(new Error('Speech synthesis is not available in this browser'));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    const callStart = performance.now();
    let startedAt = 0;

    utterance.onstart = () => { startedAt = performance.now(); };
    utterance.onend = () => {
      const endedAt = performance.now();
      resolve({
        engine: 'native',
        voiceId: 'native',
        voiceLabel: 'Device voice',
        loadMs: null,
        voiceLoadMs: null,
        genMs: startedAt ? startedAt - callStart : 0,
        audioDurationMs: startedAt ? endedAt - startedAt : endedAt - callStart,
        rtf: null,
        score: null,
        blob: null,
        sizeBytes: null,
      });
    };
    utterance.onerror = (e) => reject(new Error(e.error || 'Speech synthesis failed'));

    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  });
}

/**
 * Clears Kokoro's browser Cache Storage entries so the next run is a true
 * cold download. Two separate caches: `transformers-cache` holds the model +
 * tokenizer (voice-independent, fetched by `from_pretrained`); `kokoro-voices`
 * holds each voice's small style-vector `.bin`, fetched lazily on first use of
 * that voice inside `generate()` — so switching voices never re-fetches the
 * model, only that one small file the first time.
 */
export async function clearKokoroCache(): Promise<void> {
  if (typeof caches === 'undefined') return;
  await Promise.all([caches.delete('transformers-cache'), caches.delete('kokoro-voices')]);
}

/** Clears one (or, unset, every) Piper voice from OPFS so the next run re-downloads it. */
export async function clearPiperCache(voiceId?: string): Promise<void> {
  const mod = await import('@mintplex-labs/piper-tts-web');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (voiceId) await mod.remove(voiceId as any);
  else await mod.flush();
}
