// A podcast episode recorded as one file (scripts/pregen-speech.mjs
// --podcasts), with its timed transcript: when there is one, the episode
// streams from the CDN as a single MP3 instead of being fetched a sentence at
// a time, and the transcript says which sentence is being said when.
//
// Both files are named by the hash of the sentences the player shows
// (episodeHashInput), so the transcript always matches the script on screen —
// an edited script just has no recording until it's recorded again.

import { AUDIO_CDN } from './speechCache';
import { episodeHashInput } from './speechChunks';

export interface TimedLine {
  /** Seconds into the episode. */
  start: number;
  end: number;
}

export interface EpisodeAudio {
  src: string;
  duration: number;
  lines: TimedLine[];
}

const TIMEOUT_MS = 4000;

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The recording of these sentences in `folder`'s voice, or null when there isn't one. */
export async function findEpisodeAudio(sentences: string[], folder: string, signal?: AbortSignal): Promise<EpisodeAudio | null> {
  try {
    const base = `${AUDIO_CDN}/podcasts/${folder}/${await sha256(episodeHashInput(sentences))}`;
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const res = await fetch(`${base}.json`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
    if (!res.ok) return null;
    const json = await res.json() as { duration?: unknown; lines?: { start?: unknown; end?: unknown; text?: unknown }[] };
    // The name already ties it to these sentences; this just refuses a
    // malformed file rather than playing out of step.
    if (typeof json.duration !== 'number' || !Array.isArray(json.lines) || json.lines.length !== sentences.length) return null;
    const lines: TimedLine[] = [];
    for (const [i, l] of json.lines.entries()) {
      if (typeof l.start !== 'number' || typeof l.end !== 'number' || l.text !== sentences[i]) return null;
      lines.push({ start: l.start, end: l.end });
    }
    return { src: `${base}.mp3`, duration: json.duration, lines };
  } catch {
    return null;
  }
}

/** Which sentence is being said at `t`: the last one started, so a pause keeps the one just said lit. */
export function lineAt(lines: TimedLine[], t: number): number {
  let lo = 0, hi = lines.length - 1, found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].start <= t + 0.05) { found = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return found;
}

/** 83 → "1:23". */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
