/**
 * Whisper STT — uses onnx-community/whisper-tiny.en via @huggingface/transformers.
 * Works offline in the browser (WASM). No server or API key needed.
 */

interface TranscriberPipeline {
  (audio: Float32Array): Promise<{ text: string }>;
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
      return (audio: Float32Array) =>
        transcriber(audio) as Promise<{ text: string }>;
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
  const result = await transcriber(audio);
  return result.text.trim();
}
