// Client for the `speech` edge function — cloud-synthesized audio for the
// "Cloud" voice engine (phones and low-power desktops).

import { request } from './api';

/** A slot the server fills from its config, or a voice id from listCloudVoices(). */
export type SpeechVoice = 'female' | 'male' | (string & {});

export interface CloudVoice {
  id: string;
  name: string;
  gender: 'Female' | 'Male';
  accent: 'American' | 'British';
  tier: 'Chirp 3 HD' | 'Neural2' | 'WaveNet' | 'Standard';
}

export interface CloudVoiceList {
  voices: CloudVoice[];
  /** The voice ids the `female` / `male` slots stand for right now. */
  defaults: { female: string; male: string };
}

/** The voices the picker may offer; null when the server can't be reached. */
export function listCloudVoices(): Promise<CloudVoiceList | null> {
  return request.get<CloudVoiceList>('/speech/voices', { quiet: true, allowAnon: true });
}

/** A first-time clip waits on Google; a cached one is a quick lookup. */
const TIMEOUT_MS = 15_000;

/**
 * URL of an MP3 for `text`, or null on any failure — the caller falls back to
 * the device's own voice, so offline or over the daily limit still speaks.
 * `allowAnon`: a guest still gets clips that already exist; making a new one
 * needs a sign-in, and that 401 is just another null here.
 */
export async function speechUrl(text: string, voice: SpeechVoice, signal?: AbortSignal): Promise<string | null> {
  const res = await request.post<{ url: string }>('/speech', { text, voice }, {
    quiet: true,
    allowAnon: true,
    timeout: TIMEOUT_MS,
    signal,
  });
  return res?.url ?? null;
}
