// Runs the phoneme recogniser off the main thread — see pronunciation.ts —
// for a word (expected IPA given) or a sentence (IPA worked out here).
//
// A 300M-parameter wav2vec2 is a few hundred ms of solid compute per clip even
// on a desktop GPU, and transformers.js runs it synchronously on whichever
// thread calls it, so on the main thread the page would freeze while scoring.

import { AutoModelForCTC, AutoProcessor, env } from '@huggingface/transformers';
import { logSoftmax, makeVocab, scoreBest, scoreSentence, type Frames, type SentenceScore, type Vocab, type WordScore } from './phonemeScore';
import { PHONEME_MODEL_ID } from './pronunciationModel';

export type WorkerInMsg =
  | { type: 'load'; device: 'webgpu' | 'wasm' }
  | { type: 'score'; id: number; audio: Float32Array; ipas: string[] }
  | { type: 'scoreText'; id: number; audio: Float32Array; text: string };

export type WorkerOutMsg =
  | { type: 'progress'; progress: number }
  | { type: 'ready' }
  | { type: 'load-error'; error: string }
  | { type: 'scored'; id: number; result: (WordScore & { ipa: string }) | null }
  | { type: 'scoredText'; id: number; result: SentenceScore | null }
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
    const { vocab } = await loaded!;
    const frames = await recognise(msg.audio);
    if (msg.type === 'score') {
      post({ type: 'scored', id: msg.id, result: scoreBest(frames, vocab, msg.ipas) });
    } else {
      post({ type: 'scoredText', id: msg.id, result: await scoreText(frames, vocab, msg.text) });
    }
  } catch (err) {
    post({ type: 'score-error', id: msg.id, error: String((err as Error)?.message ?? err) });
  }
};

// wav2vec2's attention grows with the square of the clip's length, so a long
// answer is run in windows and the frames joined. Its conv front end only
// looks a few frames either side, so a seam costs a sound at most.
const WINDOW = 16000 * 20;

async function recognise(audio: Float32Array): Promise<Frames> {
  const { processor, model } = await loaded!;
  const parts: Float32Array[] = [];
  let T = 0, V = 0;
  for (let at = 0; at < audio.length; at += WINDOW) {
    const inputs = await processor(audio.subarray(at, Math.min(audio.length, at + WINDOW)));
    const { logits } = await model(inputs);
    const [, t, v] = logits.dims as number[];
    // Copied: fp16 outputs come back as a Uint16-backed array on some devices.
    parts.push(logits.type === 'float32' ? new Float32Array(logits.data) : Float32Array.from(logits.to('float32').data));
    T += t;
    V = v;
  }
  const logp = new Float32Array(T * V);
  let offset = 0;
  for (const p of parts) { logp.set(p, offset); offset += p.length; }
  return logSoftmax({ logp, T, V });
}

// eSpeak (WASM, ~2.6MB) for a sentence's expected sounds — the same engine
// the word function uses for every word's phonetics. Loaded on first use.
// The explicit RP voice: plain "en-gb" resolves to the US one in this build
// (see supabase/functions/word/phonemize.ts).
const VOICES = ['en-us', 'en-gb-x-rp'];
let phonemizer: Promise<typeof import('phonemizer')> | null = null;

/**
 * The sentence's words, each with its IPA in one accent. Phonemized as a
 * whole so eSpeak gives the weak forms a sentence really has ("to" → /tə/);
 * when its output doesn't split back into the same number of words (a
 * number becomes several, say), each word is done on its own instead.
 */
async function wordsIn(text: string, voice: string): Promise<{ text: string; ipa: string }[]> {
  const { phonemize } = await (phonemizer ??= import('phonemizer'));
  const shown = text.split(/\s+/).filter(Boolean);
  const clean = shown.map((w) => w.replace(/[^\p{L}\p{N}']/gu, ''));
  const spoken = clean.filter(Boolean);
  const whole = (await phonemize(spoken.join(' '), voice)).join(' ').split(/\s+/).filter(Boolean);
  let ipas: string[];
  if (whole.length === spoken.length) ipas = whole;
  else {
    // One at a time: eSpeak's WASM has a single global state.
    ipas = [];
    for (const w of spoken) ipas.push((await phonemize(w, voice)).join(''));
  }
  let k = 0;
  return shown.map((w, i) => ({ text: w, ipa: clean[i] ? ipas[k++] ?? '' : '' }));
}

/** Score against each accent and keep the better — an accent isn't an error. */
async function scoreText(frames: Frames, vocab: Vocab, text: string): Promise<SentenceScore | null> {
  let best: SentenceScore | null = null;
  for (const voice of VOICES) {
    const r = scoreSentence(frames, vocab, await wordsIn(text, voice));
    if (r && (!best || r.score > best.score)) best = r;
  }
  return best;
}
