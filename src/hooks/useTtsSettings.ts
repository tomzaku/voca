import { create } from 'zustand';
import { ENGINE_WEIGHT, hasWebGPU, readDeviceSignals, recommendEngine } from '../lib/deviceTier';

export type TtsEngine = 'kokoro' | 'piper' | 'native';
/** What the user picked: an engine, or `auto` to let the device decide. */
export type TtsEnginePref = TtsEngine | 'auto';

export interface TtsVoice {
  id: string;
  name: string;
  language: string;
  accent: string;
  gender: 'Female' | 'Male';
  grade: string;
}

export const KOKORO_VOICES: TtsVoice[] = [
  { id: 'af_heart', name: 'Heart', language: 'en-us', accent: 'American', gender: 'Female', grade: 'A' },
  { id: 'af_bella', name: 'Bella', language: 'en-us', accent: 'American', gender: 'Female', grade: 'A-' },
  { id: 'af_nicole', name: 'Nicole', language: 'en-us', accent: 'American', gender: 'Female', grade: 'B-' },
  { id: 'af_aoede', name: 'Aoede', language: 'en-us', accent: 'American', gender: 'Female', grade: 'C+' },
  { id: 'af_kore', name: 'Kore', language: 'en-us', accent: 'American', gender: 'Female', grade: 'C+' },
  { id: 'af_sarah', name: 'Sarah', language: 'en-us', accent: 'American', gender: 'Female', grade: 'C+' },
  { id: 'af_nova', name: 'Nova', language: 'en-us', accent: 'American', gender: 'Female', grade: 'C' },
  { id: 'af_alloy', name: 'Alloy', language: 'en-us', accent: 'American', gender: 'Female', grade: 'C' },
  { id: 'af_sky', name: 'Sky', language: 'en-us', accent: 'American', gender: 'Female', grade: 'C-' },
  { id: 'af_jessica', name: 'Jessica', language: 'en-us', accent: 'American', gender: 'Female', grade: 'D' },
  { id: 'af_river', name: 'River', language: 'en-us', accent: 'American', gender: 'Female', grade: 'D' },
  { id: 'am_fenrir', name: 'Fenrir', language: 'en-us', accent: 'American', gender: 'Male', grade: 'C+' },
  { id: 'am_michael', name: 'Michael', language: 'en-us', accent: 'American', gender: 'Male', grade: 'C+' },
  { id: 'am_puck', name: 'Puck', language: 'en-us', accent: 'American', gender: 'Male', grade: 'C+' },
  { id: 'am_echo', name: 'Echo', language: 'en-us', accent: 'American', gender: 'Male', grade: 'D' },
  { id: 'am_eric', name: 'Eric', language: 'en-us', accent: 'American', gender: 'Male', grade: 'D' },
  { id: 'am_liam', name: 'Liam', language: 'en-us', accent: 'American', gender: 'Male', grade: 'D' },
  { id: 'am_onyx', name: 'Onyx', language: 'en-us', accent: 'American', gender: 'Male', grade: 'D' },
  { id: 'am_adam', name: 'Adam', language: 'en-us', accent: 'American', gender: 'Male', grade: 'F+' },
  { id: 'bf_emma', name: 'Emma', language: 'en-gb', accent: 'British', gender: 'Female', grade: 'B-' },
  { id: 'bf_isabella', name: 'Isabella', language: 'en-gb', accent: 'British', gender: 'Female', grade: 'C' },
  { id: 'bf_alice', name: 'Alice', language: 'en-gb', accent: 'British', gender: 'Female', grade: 'D' },
  { id: 'bf_lily', name: 'Lily', language: 'en-gb', accent: 'British', gender: 'Female', grade: 'D' },
  { id: 'bm_fable', name: 'Fable', language: 'en-gb', accent: 'British', gender: 'Male', grade: 'C' },
  { id: 'bm_george', name: 'George', language: 'en-gb', accent: 'British', gender: 'Male', grade: 'C' },
  { id: 'bm_daniel', name: 'Daniel', language: 'en-gb', accent: 'British', gender: 'Male', grade: 'D' },
  { id: 'bm_lewis', name: 'Lewis', language: 'en-gb', accent: 'British', gender: 'Male', grade: 'D+' },
];

export const PIPER_VOICES: TtsVoice[] = [
  { id: 'en_US-hfc_female-medium', name: 'HFC Female', language: 'en-us', accent: 'American', gender: 'Female', grade: 'A' },
  { id: 'en_US-lessac-high', name: 'Lessac', language: 'en-us', accent: 'American', gender: 'Female', grade: 'A-' },
  { id: 'en_US-kristin-medium', name: 'Kristin', language: 'en-us', accent: 'American', gender: 'Female', grade: 'B' },
  { id: 'en_US-amy-medium', name: 'Amy', language: 'en-us', accent: 'American', gender: 'Female', grade: 'B' },
  { id: 'en_US-ljspeech-high', name: 'LJ Speech', language: 'en-us', accent: 'American', gender: 'Female', grade: 'B-' },
  { id: 'en_US-hfc_male-medium', name: 'HFC Male', language: 'en-us', accent: 'American', gender: 'Male', grade: 'A' },
  { id: 'en_US-ryan-high', name: 'Ryan', language: 'en-us', accent: 'American', gender: 'Male', grade: 'A-' },
  { id: 'en_US-joe-medium', name: 'Joe', language: 'en-us', accent: 'American', gender: 'Male', grade: 'B' },
  { id: 'en_US-bryce-medium', name: 'Bryce', language: 'en-us', accent: 'American', gender: 'Male', grade: 'B' },
  { id: 'en_US-john-medium', name: 'John', language: 'en-us', accent: 'American', gender: 'Male', grade: 'B-' },
  { id: 'en_GB-cori-high', name: 'Cori', language: 'en-gb', accent: 'British', gender: 'Female', grade: 'A-' },
  { id: 'en_GB-alba-medium', name: 'Alba', language: 'en-gb', accent: 'British', gender: 'Female', grade: 'B' },
  { id: 'en_GB-jenny_dioco-medium', name: 'Jenny', language: 'en-gb', accent: 'British', gender: 'Female', grade: 'B' },
  { id: 'en_GB-alan-medium', name: 'Alan', language: 'en-gb', accent: 'British', gender: 'Male', grade: 'B' },
  { id: 'en_GB-northern_english_male-medium', name: 'Northern Male', language: 'en-gb', accent: 'British', gender: 'Male', grade: 'B' },
];

const ENGINE_KEY = 'voca-tts-engine';
const VOICE_KEY = 'voca-tts-voice';
const PIPER_VOICE_KEY = 'voca-tts-piper-voice';
const SPEED_KEY = 'voca-tts-speed';
/** Heaviest engine Auto may use here, set when a heavier one proved too slow. */
const AUTO_CAP_KEY = 'voca-tts-auto-cap';

// No stored choice means Auto — including everyone who never opened Settings,
// who used to get native by default.
function getStoredEnginePref(): TtsEnginePref {
  try {
    const v = localStorage.getItem(ENGINE_KEY);
    if (v === 'kokoro' || v === 'piper' || v === 'native' || v === 'auto') return v;
  } catch { /* ignore */ }
  return 'auto';
}

function getAutoCap(): TtsEngine | null {
  try {
    const v = localStorage.getItem(AUTO_CAP_KEY);
    if (v === 'kokoro' || v === 'piper' || v === 'native') return v;
  } catch { /* ignore */ }
  return null;
}

// WebGPU needs an async probe, so Auto starts from a guess without it — which
// can only land on native or Piper — and upgrades once the probe answers.
let webgpu = false;

/** What Auto picks on this device right now. */
export function autoEngine(): TtsEngine {
  return recommendEngine(readDeviceSignals(webgpu), getAutoCap());
}

function resolve(pref: TtsEnginePref): TtsEngine {
  return pref === 'auto' ? autoEngine() : pref;
}

function getStoredVoice(): string {
  try {
    const v = localStorage.getItem(VOICE_KEY);
    if (v && KOKORO_VOICES.some((voice) => voice.id === v)) return v;
  } catch { /* ignore */ }
  return 'af_heart';
}

function getStoredPiperVoice(): string {
  try {
    const v = localStorage.getItem(PIPER_VOICE_KEY);
    if (v && PIPER_VOICES.some((voice) => voice.id === v)) return v;
  } catch { /* ignore */ }
  return 'en_US-hfc_female-medium';
}

function getStoredSpeed(): number {
  try {
    const v = parseFloat(localStorage.getItem(SPEED_KEY) ?? '');
    if (v >= 0.5 && v <= 2) return v;
  } catch { /* ignore */ }
  return 1;
}

interface TtsSettingsState {
  /** The user's choice, possibly `auto`. Highlight this in pickers. */
  enginePref: TtsEnginePref;
  /** The engine actually speaking — `enginePref` with Auto resolved. */
  engine: TtsEngine;
  /** What Auto would pick here; pickers flag anything heavier. */
  recommended: TtsEngine;
  voice: string;
  piperVoice: string;
  speed: number;
  setEngine: (e: TtsEnginePref) => void;
  setVoice: (v: string) => void;
  setPiperVoice: (v: string) => void;
  setSpeed: (s: number) => void;
}

// One store rather than per-component state: the header's quick picker and
// the Settings page can both be on screen, and must agree on the voice.
// localStorage stays the source tts.ts reads at speak time.
const initialPref = getStoredEnginePref();

export const useTtsSettings = create<TtsSettingsState>((set) => ({
  enginePref: initialPref,
  engine: resolve(initialPref),
  recommended: autoEngine(),
  voice: getStoredVoice(),
  piperVoice: getStoredPiperVoice(),
  speed: getStoredSpeed(),
  setEngine: (e) => {
    try {
      localStorage.setItem(ENGINE_KEY, e);
      // Choosing Auto is the way to ask for a fresh look at this device, so
      // forget any step-down from an earlier slow run.
      if (e === 'auto') localStorage.removeItem(AUTO_CAP_KEY);
    } catch { /* ignore */ }
    set({ enginePref: e, engine: resolve(e), recommended: autoEngine() });
  },
  setVoice: (v) => {
    try { localStorage.setItem(VOICE_KEY, v); } catch { /* ignore */ }
    set({ voice: v });
  },
  setPiperVoice: (v) => {
    try { localStorage.setItem(PIPER_VOICE_KEY, v); } catch { /* ignore */ }
    set({ piperVoice: v });
  },
  setSpeed: (sp) => {
    try { localStorage.setItem(SPEED_KEY, String(sp)); } catch { /* ignore */ }
    set({ speed: sp });
  },
}));

/** Re-resolve Auto after something it depends on changed. */
function refreshAuto() {
  const { enginePref } = useTtsSettings.getState();
  useTtsSettings.setState({ engine: resolve(enginePref), recommended: autoEngine() });
}

if (typeof window !== 'undefined') {
  hasWebGPU().then((ok) => {
    webgpu = ok;
    if (ok) refreshAuto();
  });
}

/**
 * Called by tts.ts when the engine Auto chose failed or ran slower than
 * real time: cap Auto one step lighter on this device for good, and return
 * the engine it now uses — or null when the user picked the engine by hand
 * (their choice isn't second-guessed) or there's nothing lighter.
 */
export function demoteAutoEngine(from: TtsEngine): TtsEngine | null {
  const { enginePref, engine } = useTtsSettings.getState();
  if (enginePref !== 'auto' || engine !== from) return null;
  const lighter = ENGINE_WEIGHT[ENGINE_WEIGHT.indexOf(from) - 1];
  if (!lighter) return null;
  try { localStorage.setItem(AUTO_CAP_KEY, lighter); } catch { /* ignore */ }
  refreshAuto();
  return useTtsSettings.getState().engine;
}

export function getTtsEngine(): TtsEngine { return useTtsSettings.getState().engine; }
export function getTtsVoice(): string { return getStoredVoice(); }

export function setTtsEngine(e: TtsEnginePref): void { useTtsSettings.getState().setEngine(e); }
export function setTtsVoice(v: string): void { useTtsSettings.getState().setVoice(v); }
export function getPiperVoice(): string { return getStoredPiperVoice(); }
export function getTtsSpeed(): number { return getStoredSpeed(); }
