// The Kokoro model id, split into its own file so the TTS worker
// (src/lib/ttsWorker.ts) can import just this constant without pulling in
// the rest of tts.ts — react-hot-toast, hooks, etc. — none of which belong
// in a worker bundle.
export const KOKORO_MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
