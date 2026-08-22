// Runs Kokoro model loading and inference off the main thread.
//
// kokoro-js compiles down to onnxruntime-web, and without cross-origin
// isolation (COOP/COEP) it runs its WASM (and WebGPU dispatch) synchronously
// on whatever thread called it. On the main thread that means every
// `generate()` — a few hundred ms to a few seconds on a phone — freezes
// input, scrolling and rendering for its whole duration, which is the "hang"
// clicking the read-aloud button caused. Loading and generating inside this
// dedicated worker keeps that work off the UI thread entirely; only the
// small `postMessage` transfers cross back.
import { KokoroTTS } from 'kokoro-js';
import { KOKORO_MODEL_ID } from './ttsModel';

export type WorkerInMsg =
  | { type: 'load'; device: 'webgpu' | 'wasm'; dtype: string }
  | { type: 'generate'; id: number; text: string; voice: string; speed: number };

export type WorkerOutMsg =
  | { type: 'progress'; progress?: number; status?: string }
  | { type: 'ready' }
  | { type: 'load-error'; error: string }
  | { type: 'generated'; id: number; blob: Blob }
  | { type: 'generate-error'; id: number; error: string };

function post(msg: WorkerOutMsg) {
  postMessage(msg);
}

let ttsPromise: Promise<KokoroTTS> | null = null;

function load(device: 'webgpu' | 'wasm', dtype: string): Promise<KokoroTTS> {
  if (ttsPromise) return ttsPromise;

  ttsPromise = KokoroTTS.from_pretrained(KOKORO_MODEL_ID, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dtype: dtype as any,
    device,
    progress_callback: (p: { progress?: number; status?: string }) => {
      post({ type: 'progress', progress: p.progress, status: p.status });
    },
  });

  ttsPromise
    .then(() => post({ type: 'ready' }))
    .catch((err) => {
      ttsPromise = null;
      post({ type: 'load-error', error: err instanceof Error ? err.message : String(err) });
    });

  return ttsPromise;
}

self.onmessage = async (e: MessageEvent<WorkerInMsg>) => {
  const msg = e.data;

  if (msg.type === 'load') {
    load(msg.device, msg.dtype);
    return;
  }

  // msg.type === 'generate'
  try {
    // The caller always sends 'load' (and awaits the resulting 'ready')
    // before its first 'generate', so ttsPromise is set by the time we get
    // here.
    if (!ttsPromise) throw new Error('generate requested before load');
    const tts = await ttsPromise;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await tts.generate(msg.text, { voice: msg.voice as any, speed: msg.speed });
    post({ type: 'generated', id: msg.id, blob: result.toBlob() });
  } catch (err) {
    post({ type: 'generate-error', id: msg.id, error: err instanceof Error ? err.message : String(err) });
  }
};
