// Timing harness for the hidden /ai-model-benchmark page. Deliberately
// independent of tts.ts's shared singletons (ttsInstance, piperModule) — a
// benchmark run should measure a real load, not report ~0ms because some
// other part of the app already warmed the engine.
import { MODEL_ID, hasWebGPU } from './tts';
import type { KokoroTTS } from 'kokoro-js';

export type BenchmarkEngine = 'kokoro' | 'piper' | 'kitten' | 'native';

export interface BenchmarkResult {
  engine: BenchmarkEngine;
  voiceId: string;
  voiceLabel: string;
  /** Model download + init time. `null` where the engine has no separate load step (native). */
  loadMs: number | null;
  /**
   * Time to fetch this specific voice, separate from `loadMs`. Kokoro/Kitten
   * only: one model serves several voices, each needing its own small style
   * file on first use — this isolates that fetch so it doesn't inflate
   * `genMs`. `null` where a voice has no separate fetch of its own (Piper's
   * is already all of `loadMs`; native has no model at all).
   */
  voiceLoadMs: number | null;
  /** Time to produce audio: full synthesis for Kokoro/Piper/Kitten, time-to-start for native. */
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
  /**
   * The speaking-rate multiplier actually used this run — may differ from
   * what was requested where an engine has no speed control (Piper's public
   * API doesn't expose one; its own voice config decides the rate).
   */
  speedApplied: number | null;
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
/**
 * GPU precision — only meaningful when the resolved device is webgpu; q8 on
 * WASM ignores this entirely. `fp32` is the only default-safe choice: some
 * GPUs produce finite-but-wrong (audibly distorted) samples in fp16 rather
 * than throwing or producing detectable NaN/Infinity, so there's no reliable
 * way to auto-fall-back the way there is for an outright load failure.
 * `fp16` exists purely as an explicit, buyer-beware opt-in.
 */
export type KokoroPrecision = 'fp16' | 'fp32';

// transformers.js's ProgressCallback type is a union of several status
// shapes (initiate/download/progress/done/ready), most without file/total at
// all — typing the callback narrower than `any` fights that union for no
// benefit, since we only ever read the two fields checked below.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LooseProgressCallback = (p: any) => void;

function makeSizeTracker(): { progress_callback: LooseProgressCallback; total(): number | null } {
  const fileSizes = new Map<string, number>();
  return {
    progress_callback: (p) => {
      if (p.file && typeof p.total === 'number' && p.total > 0) fileSizes.set(p.file, p.total);
    },
    total: () => (fileSizes.size > 0 ? [...fileSizes.values()].reduce((a, b) => a + b, 0) : null),
  };
}

/**
 * Loads a `style_text_to_speech_2`-family model via kokoro-js's
 * `KokoroTTS.from_pretrained`, which is fully generic on `model_id` despite
 * the name (used for both Kokoro and KittenTTS — same architecture).
 */
type StyleModelDtype = 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16';
type StyleModelDeviceKind = 'wasm' | 'webgpu';

async function loadStyleModelWith(modelId: string, dtype: StyleModelDtype, device: StyleModelDeviceKind, progress_callback: LooseProgressCallback) {
  const { KokoroTTS } = await import('kokoro-js');
  const { ms: loadMs, value: tts } = await measure(() =>
    KokoroTTS.from_pretrained(modelId, { dtype, device, progress_callback }),
  );
  return { loadMs, tts, device, dtype };
}

/**
 * Some GPUs report `shader-f16` support but produce silently-corrupted
 * output in fp16 anyway (NaN/Infinity samples) rather than the model load or
 * the ONNX Runtime call itself throwing — so a try/catch around loading alone
 * can't detect this. Actually inspecting the generated samples can.
 */
function assertFiniteAudio(audio: Float32Array, context: string): void {
  for (let i = 0; i < audio.length; i++) {
    if (!Number.isFinite(audio[i])) {
      throw new Error(`${context} produced invalid audio (non-finite sample at position ${i}) — a known failure mode on some GPUs`);
    }
  }
}

export async function benchmarkKokoro(
  text: string,
  voiceId: string,
  voiceLabel: string,
  deviceOverride: KokoroDevice = 'auto',
  precision: KokoroPrecision = 'fp32',
  speed = 1,
): Promise<BenchmarkResult> {
  if (deviceOverride === 'webgpu' && !(await hasWebGPU())) {
    throw new Error('WebGPU is not available in this browser — try WASM (CPU) instead');
  }
  const useGPU = deviceOverride === 'auto' ? await hasWebGPU() : deviceOverride === 'webgpu';
  const device: StyleModelDeviceKind = useGPU ? 'webgpu' : 'wasm';
  const dtype: StyleModelDtype = !useGPU ? 'q8' : precision;

  const sizes = makeSizeTracker();
  const { loadMs, tts } = await loadStyleModelWith(MODEL_ID, dtype, device, sizes.progress_callback);

  // A throwaway call on minimal text forces the voice's style file to be
  // fetched (or confirms it's already cached) before the real, timed call —
  // otherwise that fetch would happen inside genMs and look like slow
  // inference the first time any given voice is used.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { ms: voiceLoadMs } = await measure(() => tts.generate('.', { voice: voiceId as any, speed }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { ms: genMs, value: result } = await measure(() => tts.generate(text, { voice: voiceId as any, speed }));
  // Catches outright NaN/Infinity, e.g. genuine overflow. Doesn't catch
  // finite-but-wrong samples (the distortion fp16 can produce on some GPUs
  // without erroring at all) — there's no reliable way to detect that
  // without real audio analysis, which is why fp16 stays an explicit,
  // buyer-beware choice rather than something 'auto' silently reaches for.
  assertFiniteAudio(result.audio, `Kokoro (${dtype} on ${device})`);
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
    sizeBytes: sizes.total(),
    speedApplied: speed,
    meta: `${device} · ${dtype}`,
  };
}

// ─── KittenTTS ──────────────────────────────────────────────────────────
// KittenML/kitten-tts-nano-0.1 — same architecture family as Kokoro
// (model_type: style_text_to_speech_2), ~15M params / ~22.7MB quantized,
// purpose-built for CPU/edge devices. `KokoroTTS.from_pretrained` loads it
// correctly since model_id is just a parameter — but `KokoroTTS.generate()`
// validates the voice name against Kokoro's own voice list and fetches the
// style vector from a URL hardcoded to Kokoro's own repo, neither of which
// apply here. So generation goes through `tts.tokenizer` and `tts.model`
// directly (both public fields) — the same two steps `generate()` uses
// internally — with this model's own phonemizer output and voice files.

const KITTEN_MODEL_ID = 'onnx-community/kitten-tts-nano-0.1-ONNX';

export interface KittenVoice { id: string; name: string; gender: 'Female' | 'Male' }

export const KITTEN_VOICES: KittenVoice[] = [2, 3, 4, 5].flatMap((n) => [
  { id: `expr-voice-${n}-f`, name: `Voice ${n}`, gender: 'Female' as const },
  { id: `expr-voice-${n}-m`, name: `Voice ${n}`, gender: 'Male' as const },
]);

const kittenVoiceCache = new Map<string, Float32Array>();

/** Mirrors kokoro-js's own per-voice fetch+cache, just pointed at KittenTTS's repo instead of Kokoro's hardcoded one. */
async function getKittenVoiceData(voiceId: string): Promise<Float32Array> {
  const cached = kittenVoiceCache.get(voiceId);
  if (cached) return cached;

  const url = `https://huggingface.co/${KITTEN_MODEL_ID}/resolve/main/voices/${voiceId}.bin`;
  let buffer: ArrayBuffer;
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open('kitten-voices');
      const hit = await cache.match(url);
      if (hit) {
        buffer = await hit.arrayBuffer();
      } else {
        const res = await fetch(url);
        buffer = await res.clone().arrayBuffer();
        cache.put(url, res).catch(() => { /* best-effort cache */ });
      }
    } catch {
      buffer = await (await fetch(url)).arrayBuffer();
    }
  } else {
    buffer = await (await fetch(url)).arrayBuffer();
  }

  const data = new Float32Array(buffer);
  kittenVoiceCache.set(voiceId, data);
  return data;
}

/** Same IPA symbol substitutions kokoro-js applies after phonemizing — this model shares Kokoro's tokenizer vocabulary, which expects them. */
function fixupPhonemes(ipa: string): string {
  return ipa.replace(/ʲ/g, 'j').replace(/r/g, 'ɹ').replace(/x/g, 'k').replace(/ɬ/g, 'l');
}

/** The minimal subset of KokoroTTS.generate()'s pipeline needed to run a different model_id's own voices through it. */
async function kittenGenerate(tts: KokoroTTS, text: string, voiceId: string, speed: number): Promise<Blob> {
  const [{ phonemize }, { Tensor, RawAudio }] = await Promise.all([
    import('phonemizer'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import('@huggingface/transformers') as Promise<any>,
  ]);

  const words = await phonemize(text, 'en-us');
  const phonemes = fixupPhonemes(words.join(' '));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { input_ids } = (tts.tokenizer as any)(phonemes, { truncation: true });

  // Unlike Kokoro's ~0.5MB per-voice file (a style vector per input-length
  // bucket, sliced by token count), KittenTTS's is exactly 1024 bytes — one
  // fixed 256-float style vector for the whole voice, no bucketing. Slicing
  // it the Kokoro way would read past the end for anything but ~2 tokens.
  const style = await getKittenVoiceData(voiceId);

  const feeds = {
    input_ids,
    style: new Tensor('float32', style, [1, 256]),
    speed: new Tensor('float32', [speed], [1]),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { waveform } = await (tts.model as any)(feeds);
  assertFiniteAudio(waveform.data, 'KittenTTS');
  const audio = new RawAudio(waveform.data, 24000);
  return audio.toBlob();
}

export async function benchmarkKittenTts(text: string, voiceId: string, voiceLabel: string, speed = 1): Promise<BenchmarkResult> {
  const sizes = makeSizeTracker();
  // This repo only publishes a quantized (q8) build — no fp32/fp16 variant to
  // fetch for WebGPU exists, and WebGPU's execution provider can't run this
  // quantized model's ops anyway (int8 MatMulInteger etc. are WASM-only).
  // Always CPU, unlike Kokoro's device selector.
  const { loadMs, tts, device, dtype } = await loadStyleModelWith(KITTEN_MODEL_ID, 'q8', 'wasm', sizes.progress_callback);

  const { ms: voiceLoadMs } = await measure(() => kittenGenerate(tts, '.', voiceId, speed));
  const { ms: genMs, value: blob } = await measure(() => kittenGenerate(tts, text, voiceId, speed));
  const durationMs = await audioDurationMs(blob);
  const rtf = durationMs > 0 ? genMs / durationMs : null;

  return {
    engine: 'kitten',
    voiceId,
    voiceLabel,
    loadMs,
    voiceLoadMs,
    genMs,
    audioDurationMs: durationMs,
    rtf,
    score: scoreFromRtf(rtf),
    blob,
    sizeBytes: sizes.total(),
    speedApplied: speed,
    meta: `${device} · ${dtype}`,
  };
}

/** Clears KittenTTS's per-voice style-file cache (see `getKittenVoiceData`). */
export async function clearKittenVoiceCache(): Promise<void> {
  kittenVoiceCache.clear();
  if (typeof caches !== 'undefined') await caches.delete('kitten-voices');
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

  // Piper's public predict() has no speed/rate parameter — each voice's pace
  // is baked into its bundled config, not adjustable per call. `speedApplied`
  // is always 1 here regardless of what the UI's slider is set to.
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
    speedApplied: 1,
  };
}

/**
 * The browser's built-in voice has no model to fetch and never returns a
 * blob — it speaks live. So `genMs` here is latency-to-start (the closest
 * analogue to Kokoro/Piper's synthesis time) and `audioDurationMs` is the
 * actual start→end playback span, timed by letting it play out loud.
 */
export function benchmarkNative(text: string, speed = 1): Promise<BenchmarkResult> {
  return new Promise((resolve, reject) => {
    if (typeof speechSynthesis === 'undefined') {
      reject(new Error('Speech synthesis is not available in this browser'));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = speed;
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
        speedApplied: speed,
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
