// One Kokoro model for scripts/pregen-speech.mjs, in a worker thread. The main
// thread hands it { id, text, phonemes? } and gets back the raw samples; it
// encodes and uploads itself, so a single process holds the AWS session.
// Separate processes each refreshed that session and raced on its cache file.

import { parentPort, workerData } from 'node:worker_threads';
import { AutoTokenizer, StyleTextToSpeech2Model } from '@huggingface/transformers';
import { KokoroTTS } from 'kokoro-js';

const { modelId, voice, threads } = workerData;

// Loaded by hand rather than KokoroTTS.from_pretrained, which can't pass ONNX
// session options — and the thread count is what lets several models share
// the cores instead of fighting over them.
const [model, tokenizer] = await Promise.all([
  StyleTextToSpeech2Model.from_pretrained(modelId, {
    dtype: 'fp32',
    device: 'cpu',
    session_options: { intraOpNumThreads: threads, interOpNumThreads: 1 },
  }),
  AutoTokenizer.from_pretrained(modelId),
]);
const tts = new KokoroTTS(model, tokenizer);
parentPort.postMessage({ type: 'ready' });

parentPort.on('message', async ({ id, text, phonemes }) => {
  try {
    const audio = phonemes
      ? await tts.generate_from_ids(tts.tokenizer(phonemes, { truncation: true }).input_ids, { voice })
      : await tts.generate(text, { voice });
    const samples = audio.audio;
    parentPort.postMessage({ type: 'done', id, samples, rate: audio.sampling_rate }, [samples.buffer]);
  } catch (err) {
    parentPort.postMessage({ type: 'error', id, error: err instanceof Error ? err.message : String(err) });
  }
});
