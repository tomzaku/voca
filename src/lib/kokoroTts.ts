import { cleanMarkdown } from './cleanMarkdown';
import { getTtsEngine, getTtsVoice, getTtsSpeed, getPiperVoice, PIPER_VOICES } from '../hooks/useTtsSettings';
import toast from 'react-hot-toast';

type KokoroTTSInstance = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generate(text: string, options: { voice: any; speed: number }): Promise<{ toBlob(): Blob }>;
};

type PiperTTSModule = {
  predict(config: { text: string; voiceId: string }): Promise<Blob>;
};

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const TAG = '[tts]';
const MAX_TTS_CHARS = 5000;

function isLowPowerDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua)) return true;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  if (typeof mem === 'number' && mem < 4) return true;
  if (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2) return true;
  return false;
}

const lowPower = isLowPowerDevice();

let sessionStart = 0;
function elapsed(): string {
  return `+${((performance.now() - sessionStart) / 1000).toFixed(2)}s`;
}
function log(...args: unknown[]) {
  console.log(TAG, elapsed(), ...args);
}

function isSafari(): boolean {
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua);
}

let kokoroUnavailable = isSafari();
let ttsInstance: KokoroTTSInstance | null = null;
let ttsPromise: Promise<KokoroTTSInstance> | null = null;

async function hasWebGPU(): Promise<boolean> {
  try {
    const gpu = (navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    if (!gpu) return false;
    const adapter = await gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

export async function getKokoroTTS(): Promise<KokoroTTSInstance> {
  if (ttsInstance) return ttsInstance;
  if (ttsPromise) return ttsPromise;

  const useGPU = await hasWebGPU();
  const device = useGPU ? 'webgpu' : 'wasm';
  const dtype = useGPU ? 'fp32' : 'q8';

  log(`starting model download... device=${device} dtype=${dtype}`);
  toast.loading('Loading Kokoro AI voice model...', { id: 'tts-loading' });

  ttsPromise = import('kokoro-js').then(async ({ KokoroTTS }) => {
    const tts = await KokoroTTS.from_pretrained(MODEL_ID, {
      dtype,
      device,
      progress_callback: (p: { progress?: number; status?: string; file?: string }) => {
        if (typeof p.progress === 'number' && p.progress > 0 && p.progress % 10 < 1) {
          toast.loading(`Loading Kokoro AI... ${p.progress.toFixed(0)}%`, { id: 'tts-loading' });
        }
      },
    });
    ttsInstance = tts as unknown as KokoroTTSInstance;
    toast.success('Kokoro AI voice model ready', { id: 'tts-loading', duration: 2000 });
    return ttsInstance;
  }).catch((err) => {
    ttsPromise = null;
    kokoroUnavailable = true;
    toast.error('Kokoro AI failed to load', { id: 'tts-loading', duration: 3000 });
    throw err;
  });

  return ttsPromise!;
}

export function preloadKokoro() {
  if (lowPower) return;
  const engine = getTtsEngine();
  if (engine === 'piper') { preloadPiper(); return; }
  if (engine !== 'kokoro') return;
  if (kokoroUnavailable) return;
  sessionStart = performance.now();
  getKokoroTTS().catch((err) => {
    console.warn(TAG, 'preload failed:', err);
  });
}

// ─── Piper TTS ─────────────────────────────────────────────────────

let piperModule: PiperTTSModule | null = null;
let piperPromise: Promise<PiperTTSModule> | null = null;

async function getPiperTTS(): Promise<PiperTTSModule> {
  if (piperModule) return piperModule;
  if (piperPromise) return piperPromise;

  toast.loading('Loading Piper AI voice model...', { id: 'tts-loading' });
  piperPromise = import('@mintplex-labs/piper-tts-web').then((mod) => {
    piperModule = mod as unknown as PiperTTSModule;
    toast.success('Piper AI voice model ready', { id: 'tts-loading', duration: 2000 });
    return piperModule;
  }).catch((err) => {
    piperPromise = null;
    toast.error('Piper AI failed to load', { id: 'tts-loading', duration: 3000 });
    throw err;
  });

  return piperPromise;
}

export function preloadPiper() {
  if (getTtsEngine() !== 'piper') return;
  sessionStart = performance.now();
  getPiperTTS().catch((err) => {
    console.warn(TAG, 'Piper preload failed:', err);
  });
}

let cancelled = false;
let currentAudio: HTMLAudioElement | null = null;
let currentUrl: string | null = null;

function playBlob(blob: Blob): Promise<void> {
  return new Promise<void>((resolve) => {
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    currentUrl = url;
    const done = () => {
      if (currentAudio === audio) { currentAudio = null; URL.revokeObjectURL(url); currentUrl = null; }
      resolve();
    };
    audio.onended = done;
    audio.onerror = done;
    audio.play().catch(done);
  });
}

const FIRST_CHUNK_CHARS = 120;
const MAX_CHUNK_CHARS = 300;

function splitIntoChunks(text: string): string[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  for (const para of paragraphs) {
    const limit = chunks.length === 0 ? FIRST_CHUNK_CHARS : MAX_CHUNK_CHARS;
    if (para.length <= limit) { chunks.push(para); continue; }
    const sentences = para.match(/[^.!?]+[.!?]+\s*/g) || [para];
    let current = '';
    for (const sentence of sentences) {
      const curLimit = chunks.length === 0 && current === '' ? FIRST_CHUNK_CHARS : MAX_CHUNK_CHARS;
      if (current.length + sentence.length > curLimit && current) { chunks.push(current.trim()); current = ''; }
      current += sentence;
    }
    if (current.trim()) chunks.push(current.trim());
  }
  return chunks.length > 0 ? chunks : [text];
}

async function speakPiper(text: string, options?: { voice?: string; onStart?: () => void; onEnd?: () => void }): Promise<void> {
  const piper = await getPiperTTS();
  if (cancelled) return;
  const chunks = splitIntoChunks(text);
  const rawVoice = options?.voice ?? getPiperVoice();
  const voiceId = PIPER_VOICES.some((v) => v.id === rawVoice) ? rawVoice : getPiperVoice();
  let nextBlob: Blob | null = await piper.predict({ text: chunks[0], voiceId });
  if (!nextBlob || cancelled) { options?.onEnd?.(); return; }
  options?.onStart?.();
  for (let i = 0; i < chunks.length; i++) {
    if (cancelled) break;
    const currentBlob = nextBlob!;
    const nextPromise = (i + 1 < chunks.length)
      ? piper.predict({ text: chunks[i + 1], voiceId }).catch(() => null)
      : Promise.resolve(null);
    await playBlob(currentBlob);
    nextBlob = await nextPromise;
    if (!nextBlob && i + 1 < chunks.length) break;
  }
}

function speakNative(text: string, options?: { speed?: number; onStart?: () => void; onEnd?: () => void }): Promise<void> {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = options?.speed ?? getTtsSpeed();
  return new Promise<void>((resolve) => {
    utterance.onstart = () => options?.onStart?.();
    utterance.onend = () => { options?.onEnd?.(); resolve(); };
    utterance.onerror = () => { options?.onEnd?.(); resolve(); };
    speechSynthesis.speak(utterance);
  });
}

export function stopKokoroAudio() {
  cancelled = true;
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if (currentUrl) { URL.revokeObjectURL(currentUrl); currentUrl = null; }
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

export function isKokoroPlaying(): boolean {
  return (currentAudio !== null && !currentAudio.paused) || speechSynthesis.speaking;
}

// ─── Conversation read-aloud (two voices) ──────────────────────────

export const CONV_VOICE_A = 'af_sarah';   // Speaker A (AI bubble)
export const CONV_VOICE_B = 'am_michael'; // Speaker B (user bubble)

async function speakOnce(text: string, voice: string): Promise<void> {
  const clean = cleanMarkdown(text);
  if (!clean || cancelled) return;

  const engine = getTtsEngine();

  if (engine === 'native') {
    return speakNative(clean, { speed: getTtsSpeed() });
  }

  if (engine === 'piper' || (kokoroUnavailable && engine === 'kokoro')) {
    return speakPiper(clean, { voice });
  }

  let tts: KokoroTTSInstance;
  try {
    tts = await getKokoroTTS();
  } catch {
    return speakNative(clean, { speed: getTtsSpeed() });
  }
  if (cancelled) return;

  const result = await tts.generate(clean, { voice: voice as 'af_heart', speed: getTtsSpeed() });
  if (cancelled) return;
  const blob = result.toBlob();
  return playBlob(blob);
}

export async function speakConversation(
  messages: Array<{ text: string; role: 'ai' | 'user' }>,
  options?: { onStart?: () => void; onEnd?: () => void },
): Promise<void> {
  stopKokoroAudio();
  cancelled = false;
  sessionStart = performance.now();
  options?.onStart?.();

  for (const msg of messages) {
    if (cancelled) break;
    const voice = msg.role === 'ai' ? CONV_VOICE_A : CONV_VOICE_B;
    await speakOnce(msg.text, voice);
  }

  options?.onEnd?.();
}

export async function speakWithKokoro(
  text: string,
  options?: { voice?: string; speed?: number; onStart?: () => void; onEnd?: () => void },
): Promise<void> {
  stopKokoroAudio();
  cancelled = false;
  sessionStart = performance.now();

  let clean = cleanMarkdown(text);
  if (!clean) return;

  if (clean.length > MAX_TTS_CHARS) {
    const truncated = clean.slice(0, MAX_TTS_CHARS);
    const lastSentence = truncated.lastIndexOf('. ');
    clean = lastSentence > MAX_TTS_CHARS * 0.5 ? truncated.slice(0, lastSentence + 1) : truncated;
  }

  const engine = getTtsEngine();

  if (engine === 'native') {
    options?.onStart?.();
    await speakNative(clean, options);
    return;
  }

  if (engine === 'piper' || (kokoroUnavailable && engine === 'kokoro')) {
    try {
      await speakPiper(clean, options);
      options?.onEnd?.();
    } catch (err) {
      console.warn(TAG, 'Piper failed, falling back to native:', err);
      options?.onStart?.();
      await speakNative(clean, options);
    }
    return;
  }

  let tts: KokoroTTSInstance;
  try {
    tts = await getKokoroTTS();
  } catch {
    options?.onStart?.();
    await speakNative(clean, options);
    return;
  }
  if (cancelled) return;

  const chunks = splitIntoChunks(clean);
  const voice = (options?.voice ?? getTtsVoice()) as 'af_heart';
  const speed = options?.speed ?? getTtsSpeed();

  const generateChunk = async (i: number): Promise<Blob | null> => {
    if (cancelled || i >= chunks.length) return null;
    const result = await tts.generate(chunks[i], { voice, speed });
    if (cancelled) return null;
    return result.toBlob();
  };

  let currentBlob = await generateChunk(0);
  if (!currentBlob || cancelled) { options?.onEnd?.(); return; }

  options?.onStart?.();

  for (let i = 0; i < chunks.length; i++) {
    if (cancelled) break;
    const nextPromise = (i + 1 < chunks.length) ? generateChunk(i + 1) : null;
    await playBlob(currentBlob!);
    if (!nextPromise) break;
    currentBlob = await nextPromise;
    if (!currentBlob || cancelled) break;
  }

  options?.onEnd?.();
}
