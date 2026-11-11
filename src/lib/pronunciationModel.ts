// The phoneme recogniser behind pronunciation scoring, shared by the worker
// that runs it and the UI that warns about its download.
//
// wav2vec2 fine-tuned by Meta on multilingual Common Voice to output eSpeak
// IPA phones — the same alphabet the `word` function writes our phonetics in
// (supabase/functions/word/phonemize.ts), so expected and heard compare
// directly. Multilingual training is also what makes it tolerant of accents.
// Apache-2.0.
export const PHONEME_MODEL_ID = 'onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX';

/** The q4 weights, for the one-time download notice. */
export const PHONEME_MODEL_MB = 242;
