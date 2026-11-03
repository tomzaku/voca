// Client for the `speech` edge function — cloud-synthesized audio for the
// "Cloud" voice engine (phones and low-power desktops).

import { request } from './api';

export type SpeechVoice = 'female' | 'male';

/** A first-time clip waits on Google; a cached one is a quick lookup. */
const TIMEOUT_MS = 15_000;

/**
 * URL of an MP3 for `text`, or null on any failure — the caller falls back to
 * the device's own voice, so offline or over the daily limit still speaks.
 * `allowAnon`: visitors get cloud audio too (the server limits them by IP).
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
