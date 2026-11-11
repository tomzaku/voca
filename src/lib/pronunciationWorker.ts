// Runs the phoneme recogniser off the main thread — see pronunciation.ts.
//
// A 300M-parameter wav2vec2 is a few hundred ms of solid compute per clip even
// on a desktop GPU, and transformers.js runs it synchronously on whichever
// thread calls it, so on the main thread the page would freeze while scoring.

import { AutoModelForCTC, AutoProcessor, env } from '@huggingface/transformers';
import { logSoftmax, makeVocab, scoreBest, type Vocab, type WordScore } from './phonemeScore';
import { PHONEME_MODEL_ID } from './pronunciationModel';

export type WorkerInMsg =
  | { type: 'load'; device: 'webgpu' | 'wasm' }
  | { type: 'score'; id: number; audio: Float32Array; ipas: string[] };

export type WorkerOutMsg =
  | { type: 'progress'; progress: number }
  | { type: 'ready' }
  | { type: 'load-error'; error: string }
  | { type: 'scored'; id: number; result: (WordScore & { ipa: string }) | null }
  | { type: 'score-error'; id: number; error: string };

const post = (msg: WorkerOutMsg) => postMessage(msg);

// Models come from the Hugging Face hub and are cached by the browser.
env.allowLocalModels = false;

interface Loaded {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  processor: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model: any;
  vocab: Vocab;
}
let loaded: Promise<Loaded> | null = null;

function load(device: 'webgpu' | 'wasm'): Promise<Loaded> {
  loaded ??= (async () => {
    // Several files download in parallel; report the model weights, which
    // are nearly all of it.
    const progress_callback = (p: { status?: string; file?: string; progress?: number }) => {
      if (p.status === 'progress' && p.file?.endsWith('.onnx') && typeof p.progress === 'number') {
        post({ type: 'progress', progress: p.progress });
      }
    };
    const [processor, model, vocabJson] = await Promise.all([
      AutoProcessor.from_pretrained(PHONEME_MODEL_ID),
      // 4-bit weights: a quarter of the download, and in testing it flags the
      // same errors as 8-bit. One model file for both devices.
      AutoModelForCTC.from_pretrained(PHONEME_MODEL_ID, { dtype: 'q4', device, progress_callback }),
      fetch(`https://huggingface.co/${PHONEME_MODEL_ID}/resolve/main/vocab.json`).then((r) => {
        if (!r.ok) throw new Error(`vocab ${r.status}`);
        return r.json() as Promise<Record<string, number>>;
      }),
    ]);
    return { processor, model, vocab: makeVocab(vocabJson) };
  })();
  return loaded;
}

self.onmessage = async (e: MessageEvent<WorkerInMsg>) => {
  const msg = e.data;
  if (msg.type === 'load') {
    try {
      await load(msg.device);
      post({ type: 'ready' });
    } catch (err) {
      loaded = null;
      post({ type: 'load-error', error: String((err as Error)?.message ?? err) });
    }
    return;
  }

  try {
    const { processor, model, vocab } = await loaded!;
    const inputs = await processor(msg.audio);
    const { logits } = await model(inputs);
    const [, T, V] = logits.dims as number[];
    // Copied: fp16 outputs come back as a Uint16-backed array on some devices.
    const data = logits.type === 'float32' ? new Float32Array(logits.data) : Float32Array.from(logits.to('float32').data);
    const frames = logSoftmax({ logp: data, T, V });
    post({ type: 'scored', id: msg.id, result: scoreBest(frames, vocab, msg.ipas) });
  } catch (err) {
    post({ type: 'score-error', id: msg.id, error: String((err as Error)?.message ?? err) });
  }
};
