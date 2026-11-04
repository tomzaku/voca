// One Kokoro model for scripts/pregen-speech.mjs, as a child process. The
// parent hands it { id, text, phonemes? } and gets back the raw samples; the
// parent encodes and uploads, so only it ever touches the AWS session —
// several processes each refreshing it raced on its cache file and broke it.
//
// A process, not a worker thread: onnxruntime-node crashes when loaded in
// more than one thread of a process.

import { AutoTokenizer, StyleTextToSpeech2Model } from '@huggingface/transformers';
import { KokoroTTS } from 'kokoro-js';

const { modelId, voice, threads } = JSON.parse(process.env.PREGEN_WORKER);

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
process.send({ type: 'ready' });

process.on('message', async ({ id, text, phonemes }) => {
  try {
    const audio = phonemes
      ? await tts.generate_from_ids(tts.tokenizer(phonemes, { truncation: true }).input_ids, { voice })
      : await tts.generate(text, { voice });
    process.send({ type: 'done', id, samples: audio.audio, rate: audio.sampling_rate });
  } catch (err) {
    process.send({ type: 'error', id, error: err instanceof Error ? err.message : String(err) });
  }
});
