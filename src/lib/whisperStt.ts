/**
 * Whisper STT — uses onnx-community/whisper-tiny.en via @huggingface/transformers.
 * Works offline in the browser (WASM). No server or API key needed.
 */

interface TranscriberPipeline {
  (audio: Float32Array, opts?: { chunk_length_s: number; stride_length_s: number }): Promise<{ text: string }>;
}

let transcriberPromise: Promise<TranscriberPipeline> | null = null;

export async function getTranscriber(
  onProgress?: (progress: number) => void,
): Promise<TranscriberPipeline> {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { pipeline } = await import('@huggingface/transformers') as any;
      const transcriber = await pipeline(
        'automatic-speech-recognition',
        'onnx-community/whisper-tiny.en',
        {
          dtype: 'q8',
          device: 'wasm',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          progress_callback: (p: any) => {
            if (onProgress && typeof p?.progress === 'number') {
              onProgress(p.progress);
            }
          },
        },
      );
      return (audio: Float32Array, opts?: { chunk_length_s: number; stride_length_s: number }) =>
        transcriber(audio, opts) as Promise<{ text: string }>;
    })();
  }
  return transcriberPromise;
}

export async function decodeAudioBlob(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext({ sampleRate: 16000 });
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);
  const float32 = decoded.getChannelData(0);
  await audioCtx.close();
  return float32;
}

export async function transcribeBlob(
  blob: Blob,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const transcriber = await getTranscriber(onProgress);
  const audio = await decodeAudioBlob(blob);
  // Whisper hears 30 seconds at a time; past that, without chunking, the rest
  // is silently dropped — fine for a sentence, not for a song sung along.
  const long = audio.length > 30 * 16000;
  const result = await transcriber(audio, long ? { chunk_length_s: 30, stride_length_s: 5 } : undefined);
  return result.text.trim();
}
